import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { ensureCustomer } from "@/lib/billing";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/billing/setup-intent — start saving a card for the session user.
// The browser confirms it with Stripe's Payment Element (card details go
// straight to Stripe), then hands the SetupIntent id to /subscribe or
// /payment-method, which verify it belongs to this customer before use.
export async function POST() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  const customerId = await ensureCustomer(user);
  const si = await getStripe().setupIntents.create({
    customer: customerId,
    usage: "off_session",
    payment_method_types: ["card"],
    metadata: { userId: user.id },
  });
  if (!si.client_secret) return json({ error: "Couldn't start saving your card." }, 502);

  return json({ clientSecret: si.client_secret });
}
