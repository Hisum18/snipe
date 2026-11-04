import { priceIdFor } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { findLiveSubscription } from "@/lib/billing";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripe-sync";
import { checkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/billing/switch — move an existing subscription to another plan or
// billing interval, in place. Same behavior api/stripe/checkout always had for
// subscribers: prorated, settled on the next invoice, never a second sub.
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

  if (!user.stripeCustomerId) {
    return json({ error: "You don't have a plan to switch yet.", code: "no_subscription" }, 409);
  }
  const live = await findLiveSubscription(user.stripeCustomerId);
  const itemId = live?.items.data[0]?.id;
  if (!live || !itemId) {
    return json({ error: "You don't have a plan to switch yet.", code: "no_subscription" }, 409);
  }
  if (live.status === "past_due") {
    return json(
      { error: "Your last payment failed. Update your card before changing plans.", code: "past_due" },
      409,
    );
  }

  const priceId = priceIdFor(parsed.data.plan, parsed.data.interval);
  if (live.items.data[0]?.price.id === priceId) return json({ ok: true });

  const updated = await getStripe().subscriptions.update(live.id, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "create_prorations",
  });
  // Apply now; the customer.subscription.updated webhook repeats it.
  await syncSubscriptionToUser(updated);

  return json({ ok: true });
}
