import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CheckoutView,
  type CheckoutCurrent,
  type CheckoutOptions,
} from "@/components/payments/checkout-view";
import { PLAN_LIMITS, type BillingInterval, type Channel } from "@/config/plans";
import {
  findLiveSubscription,
  getTierPrices,
  periodEndOf,
  planOfSubscription,
  type PaidTier,
} from "@/lib/billing";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — Snipe",
};

const CHANNEL_NAMES: Record<Channel, string> = { email: "email", discord: "Discord", sms: "SMS" };

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** What each paid tier includes, from the same limits the server enforces. */
function featuresOf(tier: PaidTier): string[] {
  const l = PLAN_LIMITS[tier];
  const minutes = l.pollIntervalSeconds / 60;
  return [
    l.maxCompanies === null ? "Unlimited companies" : `Up to ${l.maxCompanies} companies`,
    l.maxProfiles === null
      ? "Unlimited alert profiles"
      : `${l.maxProfiles} alert profiles`,
    minutes <= 1 ? "Checked every minute" : `Checked every ${minutes} minutes`,
    `Instant alerts by ${listOf(l.channels.map((c) => CHANNEL_NAMES[c]))}`,
    ...(l.crossCompanySearch ? ["Keyword alerts across every company"] : []),
    ...(l.fullHistoryExport ? ["Full job history and CSV export"] : []),
  ];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const plan: PaidTier = sp.plan === "max" ? "max" : "pro";
  const askedInterval: BillingInterval | null =
    sp.interval === "annual" ? "annual" : sp.interval === "monthly" ? "monthly" : null;

  let options: CheckoutOptions;
  let current: CheckoutCurrent | null = null;
  try {
    const [pro, max, live] = await Promise.all([
      getTierPrices("pro"),
      getTierPrices("max"),
      user.stripeCustomerId ? findLiveSubscription(user.stripeCustomerId) : null,
    ]);
    options = {
      pro: { name: PLAN_LIMITS.pro.label, features: featuresOf("pro"), prices: pro },
      max: { name: PLAN_LIMITS.max.label, features: featuresOf("max"), prices: max },
    };
    const livePlan = live ? planOfSubscription(live) : null;
    if (live && livePlan && livePlan.tier !== "free") {
      const end = periodEndOf(live);
      current = {
        tier: livePlan.tier,
        interval: livePlan.interval,
        pastDue: live.status === "past_due",
        periodEnd: end ? formatDate(end) : null,
        cancelAtPeriodEnd: live.cancel_at_period_end,
      };
    }
  } catch {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl tracking-tight">Checkout is unavailable right now</h1>
        <p className="mt-3 text-sm text-neutral-400">
          We couldn&apos;t reach our payment provider. Nothing was charged — please try again
          in a minute.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <CheckoutView
      email={user.email}
      initialPlan={plan}
      initialInterval={askedInterval ?? current?.interval ?? "monthly"}
      options={options}
      current={current}
    />
  );
}
