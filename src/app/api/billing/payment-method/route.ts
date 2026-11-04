import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { stripeErrorMessage, verifiedSetupPaymentMethod } from "@/lib/billing";
import { log } from "@/lib/log";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionToUser } from "@/lib/stripe-sync";
import { paymentMethodUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

// Subscriptions whose card can be replaced here. Includes the payment-failed
// states, since fixing the card is exactly what those customers need.
const UPDATABLE = new Set(["active", "trialing", "past_due", "unpaid"]);

// POST /api/billing/payment-method — make a freshly saved card the one Snipe
// charges. If a payment had failed, the outstanding invoice is retried on the
// NEW card right away (never the old one), which restores the plan as soon
// as it succeeds.
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
  const parsed = paymentMethodUpdateSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const customerId = user.stripeCustomerId;
  if (!customerId) return json({ error: "No billing account yet." }, 400);

  const paymentMethod = await verifiedSetupPaymentMethod(parsed.data.setupIntentId, customerId);
  if (!paymentMethod) {
    return json({ error: "We couldn't verify that card. Please try again." }, 400);
  }

  const stripe = getStripe();
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethod },
  });

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const live = subs.data.find((s) => UPDATABLE.has(s.status));
  if (!live) return json({ ok: true, recovered: false });

  let sub = await stripe.subscriptions.update(live.id, { default_payment_method: paymentMethod });

  let recovered = false;
  let retryError: string | null = null;
  if (sub.status === "past_due" || sub.status === "unpaid") {
    const open = await stripe.invoices.list({ subscription: sub.id, status: "open", limit: 5 });
    try {
      for (const inv of open.data) {
        if (inv.id) await stripe.invoices.pay(inv.id, { payment_method: paymentMethod });
      }
      recovered = open.data.length > 0;
    } catch (err) {
      log.warn("billing_retry_failed", { userId: user.id, error: String(err) });
      retryError = stripeErrorMessage(
        err,
        "Your new card was saved, but the outstanding payment didn't go through.",
      );
    }
    sub = await stripe.subscriptions.retrieve(sub.id);
  }

  // Apply now (e.g. lift a payment suspension); webhooks repeat it.
  await syncSubscriptionToUser(sub);

  return json({ ok: true, recovered, retryError });
}
