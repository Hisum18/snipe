import { priceIdFor } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import {
  ensureCustomer,
  findLiveSubscription,
  findPromotionCode,
  stripeErrorMessage,
  verifiedSetupPaymentMethod,
} from "@/lib/billing";
import { log } from "@/lib/log";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripe-sync";
import { subscribeSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/billing/subscribe — start a paid plan from Snipe's own checkout.
// The client sends {plan, interval, setupIntentId, promotionCode?}; the price,
// customer and card are all resolved and ownership-checked server-side.
//
// `error_if_incomplete` means Stripe either charges the first invoice and
// returns an active subscription, or creates nothing and returns an error —
// never a half-made `incomplete` subscription (which stripe-sync would treat
// as a failed payment and suspend tracking for).
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
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { plan, interval, setupIntentId, promotionCode } = parsed.data;

  const stripe = getStripe();
  const customerId = await ensureCustomer(user);

  // Never a second live subscription — plan changes go through /switch.
  if (await findLiveSubscription(customerId)) {
    return json(
      { error: "You already have a plan. Switch plans instead.", code: "already_subscribed" },
      409,
    );
  }

  const paymentMethod = await verifiedSetupPaymentMethod(setupIntentId, customerId);
  if (!paymentMethod) {
    return json({ error: "We couldn't verify that card. Please try again." }, 400);
  }

  let promotionCodeId: string | undefined;
  if (promotionCode) {
    const promo = await findPromotionCode(promotionCode);
    if (!promo) return json({ error: "That promotion code isn't valid." }, 400);
    promotionCodeId = promo.id;
  }

  const priceId = priceIdFor(plan, interval);
  let sub;
  try {
    sub = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethod,
        payment_behavior: "error_if_incomplete",
        discounts: promotionCodeId ? [{ promotion_code: promotionCodeId }] : undefined,
        metadata: { userId: user.id },
      },
      // One card confirmation can start at most one subscription, even if the
      // request is retried or double-submitted.
      { idempotencyKey: `snipe-subscribe:${setupIntentId}:${priceId}:${promotionCodeId ?? "none"}` },
    );
  } catch (err) {
    const e = err as { type?: string; code?: string; param?: string };
    log.warn("billing_subscribe_failed", { userId: user.id, type: e.type, code: e.code });
    if (e.type === "StripeInvalidRequestError" && e.param?.startsWith("discounts")) {
      return json({ error: "That promotion code can't be used for this plan." }, 400);
    }
    return json(
      {
        error: stripeErrorMessage(
          err,
          "We couldn't take the first payment, so your plan wasn't started. You haven't been charged.",
        ),
      },
      402,
    );
  }

  // Future invoices (and any retry) charge this card too.
  await stripe.customers
    .update(customerId, { invoice_settings: { default_payment_method: paymentMethod } })
    .catch((err) => log.warn("billing_default_pm_failed", { userId: user.id, error: String(err) }));

  // Apply the plan now rather than waiting for the webhook (which repeats
  // this idempotently), so Snipe reflects the upgrade the moment it's paid.
  await syncSubscriptionToUser(sub);

  return json({ ok: true });
}
