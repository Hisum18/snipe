import Link from "next/link";

import { PricingTable, type PricingTier } from "@/components/pricing-table";
import { SignupForm } from "@/components/signup-form";
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  type PlanTier,
} from "@/config/plans";

function pollingLabel(seconds: number): string {
  if (seconds >= 24 * 60 * 60) return "Daily digest";
  if (seconds >= 60 * 60) return `${seconds / 3600}-hour polling`;
  if (seconds >= 60) return `${seconds / 60}-minute polling`;
  return `${seconds}-second polling`;
}

function channelsLabel(channels: readonly string[]): string {
  return channels
    .map((c) => (c === "sms" ? "SMS" : c[0]!.toUpperCase() + c.slice(1)))
    .join(" + ");
}

function featuresFor(tier: PlanTier): string[] {
  const l = PLAN_LIMITS[tier];
  const companies =
    l.maxCompanies === null ? "Unlimited companies" : `${l.maxCompanies} companies watched`;
  const profiles =
    l.maxProfiles === null ? "Unlimited profiles" : `${l.maxProfiles} alert profile${l.maxProfiles === 1 ? "" : "s"}`;
  const features = [companies, pollingLabel(l.pollIntervalSeconds), profiles, channelsLabel(l.channels)];
  if (l.fullHistoryExport) features.push("Full job history + CSV export");
  if (l.crossCompanySearch) features.push("Cross-company keyword search");
  return features;
}

const TAGLINES: Record<PlanTier, string> = {
  free: "Test the waters on a few companies.",
  pro: "For focused job hunts across your shortlist.",
  max: "Maximum coverage, minimum latency.",
};

export default function LandingPage() {
  const tiers: PricingTier[] = (["free", "pro", "max"] as const).map((tier) => ({
    tier,
    label: PLAN_LIMITS[tier].label,
    priceMonthly: PLAN_PRICING[tier].monthly,
    priceAnnual: PLAN_PRICING[tier].annual,
    tagline: TAGLINES[tier],
    features: featuresFor(tier),
    highlighted: tier === "pro",
  }));

  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* Nav */}
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-bold tracking-tight">
          Snipe<span className="text-accent">.</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <a href="#how" className="hover:text-white">
            How it works
          </a>
          <a href="#pricing" className="hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="hover:text-white">
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            New jobs, detected in under a minute
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Apply before the flood.
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-300">
            Snipe watches companies&apos; applicant tracking systems directly and
            alerts you within minutes of a new posting — so your application
            lands near the top of the pile, not buried under a thousand others.
          </p>
          <div id="get-started" className="mt-8 max-w-md">
            <SignupForm />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-soft p-6">
          <div className="mb-4 text-xs uppercase tracking-wide text-slate-500">
            Live feed
          </div>
          <ul className="space-y-3 text-sm">
            {[
              ["Staff Engineer", "Vercel", "Remote"],
              ["Product Designer", "Linear", "SF / Remote"],
              ["Founding AE", "Ashby", "New York"],
            ].map(([title, company, loc]) => (
              <li
                key={title}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-slate-100">{title}</div>
                  <div className="text-xs text-slate-400">
                    {company} · {loc}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                  just now
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/10 py-16">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "1",
              t: "Paste a careers URL",
              d: "We detect the ATS — Greenhouse, Lever, or Ashby — and start watching that company's public job feed.",
            },
            {
              n: "2",
              t: "We poll the source",
              d: "Snipe queries the ATS's own JSON endpoints on a schedule as tight as one minute — faster than any aggregator.",
            },
            {
              n: "3",
              t: "You get alerted first",
              d: "The moment a new role appears, we email (or DM/text) you the matching jobs, before the crowd shows up.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/10 bg-ink-soft p-6"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-sm font-semibold text-accent-bright">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/10 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-2 text-slate-400">
            Start free. Upgrade when speed matters.
          </p>
        </div>
        <PricingTable tiers={tiers} />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 text-sm text-slate-500">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span>© {new Date().getFullYear()} Snipe</span>
          <span>Polls public ATS endpoints. Not affiliated with any employer.</span>
        </div>
      </footer>
    </main>
  );
}
