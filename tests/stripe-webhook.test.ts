import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { processedStripeEvents } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { POST } from "@/app/api/stripe/webhook/route";

const dbTests = process.env.RUN_DB_TESTS === "1";

function signedRequest(payload: string, secret: string): Request {
  const sig = getStripe().webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://t/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": sig, "content-type": "application/json" },
    body: payload,
  });
}

describe.skipIf(!dbTests)("stripe webhook", () => {
  const eventId = `evt_test_${Date.now()}`;
  // An unhandled event type: verifies signature + idempotency without side effects.
  const payload = JSON.stringify({ id: eventId, type: "invoice.paid", data: { object: {} } });
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  afterEach(async () => {
    await db.delete(processedStripeEvents).where(eq(processedStripeEvents.eventId, eventId));
  });

  it("rejects a bad signature", async () => {
    const res = await POST(
      new Request("http://t/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
        body: payload,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("processes a valid event once and no-ops on duplicates", async () => {
    const first = await POST(signedRequest(payload, secret));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });

    const rows = await db
      .select()
      .from(processedStripeEvents)
      .where(eq(processedStripeEvents.eventId, eventId));
    expect(rows).toHaveLength(1);

    const second = await POST(signedRequest(payload, secret));
    expect(await second.json()).toEqual({ received: true, duplicate: true });
  });
});
