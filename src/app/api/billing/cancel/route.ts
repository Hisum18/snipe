import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { findLiveSubscription } from "@/lib/billing";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripe-sync";
import { cancellationSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/billing/cancel — {action: "cancel"} ends the plan at the end of
// the period already paid for (same as the Stripe portal's cancel); access
// continues until then. {action: "resume"} undoes a pending cancellation.
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
  const parsed = cancellationSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const live = user.stripeCustomerId ? await findLiveSubscription(user.stripeCustomerId) : null;
  if (!live) return json({ error: "You don't have an active plan." }, 409);

  const updated = await getStripe().subscriptions.update(live.id, {
    cancel_at_period_end: parsed.data.action === "cancel",
  });
  await syncSubscriptionToUser(updated);

  return json({ ok: true });
}
