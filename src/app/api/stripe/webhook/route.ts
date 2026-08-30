import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { processedStripeEvents } from "@/db/schema";
import { getServerEnv } from "@/env";
import { log } from "@/lib/log";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook. Verifies the signature against the RAW request body, then
// no-ops on already-processed event ids. Access is only ever granted/revoked
// from here.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  // Read the RAW body — must NOT be JSON-parsed first, or signature verification
  // will fail (and could be bypassed).
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      getServerEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    // Never log the payload or signature.
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: record the event id first; if it already exists, no-op.
  const inserted = await db
    .insert(processedStripeEvents)
    .values({ eventId: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ eventId: processedStripeEvents.eventId });

  if (inserted.length === 0) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event);
  } catch {
    // If handling fails, remove the idempotency marker so Stripe's retry can
    // re-attempt processing rather than being no-op'd as a duplicate.
    await db
      .delete(processedStripeEvents)
      .where(eq(processedStripeEvents.eventId, event.id));
    // Safe fields only — never the event payload.
    log.error("stripe_webhook_handler_failed", { eventId: event.id, type: event.type });
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
