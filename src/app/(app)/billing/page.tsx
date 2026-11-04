import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { profiles, subscriptions, watches } from "@/db/schema";
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  effectiveTier,
  isPaymentSuspended,
  limitsFor,
  tierForPriceId,
} from "@/config/plans";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ManageBillingLink } from "@/components/billing/manage-billing-link";
import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function pollingLabel(seconds: number): string {
  if (seconds >= 86400) return "daily";
  if (seconds >= 3600) return `${seconds / 3600}h`;
  return `${seconds / 60}m`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface CardSummary {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface InvoiceSummary {
  id: string;
  date: Date;
  description: string;
  amount: number; // cents
  status: string;
  url: string | null;
}

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const limits = limitsFor(user.plan, user.planStatus);
  const tier = effectiveTier(user.plan, user.planStatus);
  const suspended = isPaymentSuspended(user.planStatus);
  // Keep the plan/payment/invoice sections visible for a payment-suspended
  // account (they need them to fix their card) instead of falling through to
  // the plain-Free "pick a plan" view.
  const isPaid = tier !== "free" || suspended;
  const planLabel = suspended ? PLAN_LIMITS[user.plan].label : limits.label;

  const [[subRow], watchCountRows, profileRows] = await Promise.all([
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1),
    db
      .select({ value: count() })
      .from(watches)
      .where(and(eq(watches.userId, user.id), eq(watches.active, true))),
    db
      .select({ active: profiles.active })
      .from(profiles)
      .where(eq(profiles.userId, user.id)),
  ]);
  const activeWatches = watchCountRows[0]?.value ?? 0;
  const activeProfiles = profileRows.filter((p) => p.active).length;

  const mapping = subRow ? tierForPriceId(subRow.priceId) : null;
  const nextAmountCents = mapping
    ? PLAN_PRICING[mapping.tier][mapping.interval === "annual" ? "annual" : "monthly"] * 100
    : null;

  let card: CardSummary | null = null;
  let invoices: InvoiceSummary[] = [];

  // Stripe is an external dependency — never let a hiccup there break the
  // whole page. The subscription facts above already came from our own DB.
  if (user.stripeCustomerId) {
    try {
      const stripe = getStripe();

      // The subscription's own default_payment_method is the reliable source
      // (Checkout attaches the card there); the customer-level
      // invoice_settings.default_payment_method is often left unset, so don't
      // rely on it alone.
      let pm: import("stripe").Stripe.PaymentMethod | null = null;
      if (subRow) {
        const sub = await stripe.subscriptions.retrieve(subRow.stripeSubscriptionId, {
          expand: ["default_payment_method"],
        });
        const subPm = sub.default_payment_method;
        if (subPm && typeof subPm !== "string") pm = subPm;
      }
      if (!pm) {
        const pmList = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: "card",
          limit: 1,
        });
        pm = pmList.data[0] ?? null;
      }
      if (pm?.card) {
        card = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }

      const invoiceList = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 12,
      });
      invoices = invoiceList.data.map((inv) => ({
        id: inv.id ?? inv.number ?? crypto.randomUUID(),
        date: new Date((inv.created ?? 0) * 1000),
        description: inv.lines.data[0]?.description ?? "Snipe subscription",
        amount: inv.amount_paid,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch {
      // Fall through with card=null / invoices=[] — the page still renders
      // the plan summary from our own DB.
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="animate-enter mb-8">
        <p className="mt-1 text-sm text-neutral-400">{user.email}</p>
      </div>

      {suspended && (
        <div className="animate-enter mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-5">
          <p className="max-w-md text-sm text-destructive">
            Your last payment failed. Update your card below to restore tracking and alerts —
            the next attempt will use the new card, never the one that failed.
          </p>
          <ManageBillingLink label="Update payment method" variant="button" section="payment-method" />
        </div>
      )}

      <div className="space-y-6">
        <div className="animate-enter" style={{ animationDelay: "40ms" }}>
          <PlanCard
            planLabel={planLabel}
            isPaid={isPaid}
            tier={tier}
            suspended={suspended}
            usage={{
              companies: suspended
                ? "Paused"
                : `${activeWatches}${limits.maxCompanies === null ? "" : ` / ${limits.maxCompanies}`}`,
              profiles: suspended
                ? "Paused"
                : `${activeProfiles}${limits.maxProfiles === null ? "" : ` / ${limits.maxProfiles}`}`,
              polling: pollingLabel(limits.pollIntervalSeconds),
            }}
          />
        </div>

        {isPaid && (
          <section
            className="card-glass animate-enter rounded-2xl p-6"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal">Payment method</h2>
              <ManageBillingLink label={card ? "Update" : "Add a card"} section="payment-method" />
            </div>
            {card ? (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-neutral-200">
                  <span className="capitalize">{card.brand}</span> •••• {card.last4}
                </span>
                <span className="text-xs text-neutral-500">
                  Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-400">
                No card on file, or we couldn&apos;t reach Stripe just now.
              </p>
            )}
          </section>
        )}

        {isPaid && subRow && (
          <section
            className="card-glass animate-enter rounded-2xl p-6"
            style={{ animationDelay: "160ms" }}
          >
            <h2 className="text-lg font-normal">Next payment</h2>
            {suspended ? (
              <p className="mt-3 text-sm text-destructive">
                We couldn&apos;t charge your card
                {nextAmountCents !== null ? ` for ${formatCents(nextAmountCents)}` : ""}. Update
                your payment method above to retry — nothing more is charged to the old card.
              </p>
            ) : subRow.cancelAtPeriodEnd ? (
              <p className="mt-3 text-sm text-neutral-300">
                Your plan is set to cancel
                {subRow.currentPeriodEnd
                  ? ` on ${formatDate(subRow.currentPeriodEnd)}`
                  : ""}
                . You&apos;ll keep {limits.label} access until then.
              </p>
            ) : (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-neutral-200">
                  {nextAmountCents !== null ? formatCents(nextAmountCents) : "—"}
                </span>
                <span className="text-xs text-neutral-500">
                  {subRow.currentPeriodEnd
                    ? `Due ${formatDate(subRow.currentPeriodEnd)}`
                    : "Date unavailable"}
                </span>
              </div>
            )}
          </section>
        )}

        {isPaid && (
          <section
            className="card-glass animate-enter rounded-2xl p-6"
            style={{ animationDelay: "220ms" }}
          >
            <h2 className="text-lg font-normal">Billing history</h2>
            {invoices.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">
                No payments yet, or we couldn&apos;t reach Stripe just now.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-neutral-200">{inv.description}</div>
                      <div className="text-xs text-neutral-500">{formatDate(inv.date)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-neutral-200">
                        {formatCents(inv.amount)}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] capitalize text-neutral-400">
                        {inv.status}
                      </span>
                      {inv.url && (
                        <a
                          href={inv.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-xs text-neutral-400 hover:text-brand-text hover:underline"
                        >
                          Receipt
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
