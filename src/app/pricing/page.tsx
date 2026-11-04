import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import {
  PricingSection,
  type ComparisonRow,
  type PricingPlan,
} from "@/components/ui/pricing-card";
import { PLAN_LIMITS, PLAN_PRICING, type PlanTier } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pricing — Snipe",
  description:
    "Simple, scale-friendly pricing for Snipe. Start free, upgrade when polling speed matters.",
};

const TAGLINES: Record<PlanTier, string> = {
  free: "Test the waters on a few companies.",
  pro: "For focused job hunts across your shortlist.",
  max: "Maximum coverage, minimum latency.",
};

const BUTTON_LABELS: Record<PlanTier, string> = {
  free: "Start free",
  pro: "Choose Pro",
  max: "Choose Max",
};

function pollingValue(seconds: number): string {
  if (seconds >= 24 * 60 * 60) return "Daily digest";
  if (seconds >= 60 * 60) return `${seconds / 3600}-hour`;
  if (seconds >= 60) return `${seconds / 60}-minute`;
  return `${seconds}-second`;
}

function channelsValue(channels: readonly string[]): string {
  return channels
    .map((c) => (c === "sms" ? "SMS" : c[0]!.toUpperCase() + c.slice(1)))
    .join(" + ");
}

/** Headline features shown on each plan card (derived from PLAN_LIMITS). */
function cardFeatures(tier: PlanTier): string[] {
  const l = PLAN_LIMITS[tier];
  const companies =
    l.maxCompanies === null
      ? "Unlimited companies"
      : `${l.maxCompanies} companies watched`;
  const profiles =
    l.maxProfiles === null
      ? "Unlimited profiles"
      : `${l.maxProfiles} alert profile${l.maxProfiles === 1 ? "" : "s"}`;
  const features = [
    companies,
    `${pollingValue(l.pollIntervalSeconds)} polling`,
    profiles,
    channelsValue(l.channels),
  ];
  if (l.fullHistoryExport) features.push("Full job history + CSV export");
  if (l.crossCompanySearch) features.push("Cross-company keyword search");
  return features;
}

const TIERS: PlanTier[] = ["free", "pro", "max"];

/** The value each tier shows for a given comparison row, from PLAN_LIMITS. */
function buildComparison(): ComparisonRow[] {
  const cell = <T,>(fn: (t: PlanTier) => T) =>
    ({ free: fn("free"), pro: fn("pro"), max: fn("max") }) as Record<
      PlanTier,
      T
    >;
  const L = (t: PlanTier) => PLAN_LIMITS[t];

  return [
    {
      label: "Companies watched",
      values: cell((t) =>
        L(t).maxCompanies === null ? "Unlimited" : String(L(t).maxCompanies),
      ),
    },
    { label: "Polling speed", values: cell((t) => pollingValue(L(t).pollIntervalSeconds)) },
    {
      label: "Alert profiles",
      values: cell((t) =>
        L(t).maxProfiles === null ? "Unlimited" : String(L(t).maxProfiles),
      ),
    },
    { label: "Instant alerts", values: cell((t) => L(t).delivery === "instant") },
    { label: "Email alerts", values: cell((t) => L(t).channels.includes("email")) },
    { label: "Discord alerts", values: cell((t) => L(t).channels.includes("discord")) },
    { label: "SMS alerts", values: cell((t) => L(t).channels.includes("sms")) },
    {
      label: "Cross-company keyword search",
      values: cell((t) => L(t).crossCompanySearch),
    },
    {
      label: "Full job history + CSV export",
      values: cell((t) => L(t).fullHistoryExport),
    },
  ];
}

const ANNUAL_DISCOUNT_PERCENT = Math.round(
  (1 - PLAN_PRICING.pro.annual / (PLAN_PRICING.pro.monthly * 12)) * 100,
);

export default async function PricingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/dashboard" : "/signup";

  const plans: PricingPlan[] = TIERS.map((tier) => ({
    id: tier,
    name: PLAN_LIMITS[tier].label,
    description: TAGLINES[tier],
    priceMonthly: PLAN_PRICING[tier].monthly,
    priceAnnually: PLAN_PRICING[tier].annual,
    isPopular: tier === "pro",
    buttonLabel: BUTTON_LABELS[tier],
    href: cta,
    checkout: Boolean(user) && tier !== "free",
    features: cardFeatures(tier),
  }));

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-h))] flex-col bg-black text-white">
      <main className="mx-auto w-full max-w-content flex-1 px-6 lg:px-10">
        <PricingSection
          plans={plans}
          comparison={buildComparison()}
          annualDiscountPercent={ANNUAL_DISCOUNT_PERCENT}
        />

      </main>
      <SiteFooter />
    </div>
  );
}
