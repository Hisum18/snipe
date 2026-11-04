import type { Metadata } from "next";
import type Stripe from "stripe";
import { redirect } from "next/navigation";

import {
  ManageBillingView,
  type ManageCard,
  type ManageInvoice,
  type ManagePlan,
} from "@/components/payments/manage-billing-view";
import { PLAN_LIMITS } from "@/config/plans";
import { periodEndOf, planOfSubscription } from "@/lib/billing";
import { getCurrentUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage billing — Snipe",
};

// Subscriptions shown here — including the payment-failed states, since this
// page is where those customers fix their card.
const SHOWN = new Set(["active", "trialing", "past_due", "unpaid"]);

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function cardOf(pm: string | Stripe.PaymentMethod | null | undefined): ManageCard | null {
  if (!pm || typeof pm === "string" || !pm.card) return null;
  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    expires: `${String(pm.card.exp_month).padStart(2, "0")}/${pm.card.exp_year}`,
  };
}

export default async function ManageBillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let plan: ManagePlan | null = null;
  let card: ManageCard | null = null;
  let invoices: ManageInvoice[] = [];
  let unavailable = false;

  if (user.stripeCustomerId) {
    try {
      const stripe = getStripe();
      const customerId = user.stripeCustomerId;
      const [subs, customer, invoiceList] = await Promise.all([
        stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 10,
          expand: ["data.default_payment_method"],
        }),
        stripe.customers.retrieve(customerId, {
          expand: ["invoice_settings.default_payment_method"],
        }),
        stripe.invoices.list({ customer: customerId, limit: 12 }),
      ]);

      const sub = subs.data.find((s) => SHOWN.has(s.status)) ?? null;
      const mapping = sub ? planOfSubscription(sub) : null;
      if (sub && mapping && mapping.tier !== "free") {
        const item = sub.items.data[0];
        const end = periodEndOf(sub);
        plan = {
          tier: mapping.tier,
          interval: mapping.interval,
          name: PLAN_LIMITS[mapping.tier].label,
          amount: item?.price.unit_amount ?? 0,
          currency: item?.price.currency ?? "usd",
          status: sub.status,
          periodEnd: end ? formatDate(end) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }

      // The card Snipe actually charges: the subscription's own default,
      // then the customer's, then any saved card.
      card =
        cardOf(sub?.default_payment_method) ??
        (!customer.deleted ? cardOf(customer.invoice_settings.default_payment_method) : null);
      if (!card) {
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
        card = cardOf(pms.data[0]);
      }

      invoices = invoiceList.data.map((inv) => ({
        id: inv.id ?? `${inv.created}`,
        date: formatDate(new Date(inv.created * 1000)),
        description: inv.lines.data[0]?.description ?? "Snipe subscription",
        amount: inv.status === "paid" ? inv.amount_paid : inv.amount_due,
        currency: inv.currency,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch {
      unavailable = true;
    }
  }

  return (
    <ManageBillingView
      email={user.email}
      plan={plan}
      card={card}
      invoices={invoices}
      unavailable={unavailable}
    />
  );
}
