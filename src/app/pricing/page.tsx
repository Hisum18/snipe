import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, Check, Target } from "@/components/icons";
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

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getCurrentUser();
  const { welcome } = await searchParams;
  const cta = user ? "/dashboard" : "/login";

  const plans: PricingPlan[] = TIERS.map((tier) => ({
    id: tier,
    name: PLAN_LIMITS[tier].label,
    description: TAGLINES[tier],
    priceMonthly: PLAN_PRICING[tier].monthly,
    priceAnnually: PLAN_PRICING[tier].annual,
    isPopular: tier === "pro",
    buttonLabel: BUTTON_LABELS[tier],
    href: cta,
    features: cardFeatures(tier),
  }));

  return (
    <div className="min-h-dvh bg-black text-white selection:bg-white selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex h-[--header-h] max-w-content items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
          >
            <Target className="h-5 w-5 text-white" />
            Snipe
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/#how"
              className="rounded-lg px-3 py-2 text-neutral-400 transition-colors hover:text-white"
            >
              How it works
            </Link>
            <span
              aria-current="page"
              className="rounded-lg px-3 py-2 font-medium text-white"
            >
              Pricing
            </span>
            {user ? (
              <Link
                href="/dashboard"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-neutral-400 transition-colors hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 font-semibold text-black transition-colors hover:bg-neutral-200"
                >
                  Get alerts <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-content px-6">
        {welcome && (
          <div
            role="status"
            className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-white/[0.12] bg-white/[0.03] p-4 text-sm"
          >
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-white" />
            <span className="text-neutral-300">
              Check your inbox for your one-time sign-in link — it expires in 15
              minutes. Meanwhile, here&apos;s every plan.
            </span>
          </div>
        )}

        <PricingSection
          plans={plans}
          comparison={buildComparison()}
          annualDiscountPercent={ANNUAL_DISCOUNT_PERCENT}
        />

        {/* Footer */}
        <footer className="border-t border-white/[0.08] py-10 text-sm text-neutral-500">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-neutral-400" />© {new Date().getFullYear()} Snipe
            </span>
            <span>Polls public ATS endpoints. Not affiliated with any employer.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
