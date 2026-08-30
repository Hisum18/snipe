import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { priceIdFor } from "@/config/plans";
import { getServerEnv } from "@/env";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/stripe/checkout — start a Checkout session for an upgrade.
// The client sends ONLY {plan, interval}; the price ID, customer, and user id
// are all derived server-side. Nothing about identity or price is trusted.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const env = getServerEnv();
  const stripe = getStripe();
  const priceId = priceIdFor(parsed.data.plan, parsed.data.interval);

  // Ensure the user has a Stripe customer, stored on our side and tied to them.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    allow_promotion_codes: true,
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${env.APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.APP_URL}/dashboard?checkout=cancelled`,
  });

  return json({ url: session.url });
}
