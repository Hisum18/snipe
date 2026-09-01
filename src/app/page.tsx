import Link from "next/link";

import { SignupForm } from "@/components/signup-form";
import {
  ArrowRight,
  BellRing,
  Search,
  ShieldCheck,
  Target,
  Timer,
} from "@/components/icons";

const STEPS = [
  {
    icon: Search,
    t: "Paste a careers URL",
    d: "We detect the ATS — Greenhouse, Lever, or Ashby — and start watching that company's public job feed.",
  },
  {
    icon: Timer,
    t: "We poll the source",
    d: "Snipe queries the ATS's own JSON endpoints as often as once a minute — faster than any aggregator.",
  },
  {
    icon: BellRing,
    t: "You get alerted first",
    d: "The moment a new role appears, we email, DM, or text you the matching jobs — before the crowd shows up.",
  },
];

const STATS = [
  { n: "3", l: "ATS sources" },
  { n: "60s", l: "to detection" },
  { n: "1-min", l: "polling floor" },
  { n: "0", l: "scraping / bots" },
];

export default function LandingPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/10 bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex h-[--header-h] max-w-content items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <Target className="h-5 w-5 text-primary-bright" />
            Snipe
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <a
              href="#how"
              className="rounded-lg px-3 py-2 text-muted transition-colors hover:text-fg"
            >
              How it works
            </a>
            <Link
              href="/pricing"
              className="rounded-lg px-3 py-2 text-muted transition-colors hover:text-fg"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-muted transition-colors hover:text-fg"
            >
              Sign in
            </Link>
            <a
              href="#get-started"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-semibold text-white transition-colors hover:bg-primary-bright"
            >
              Get alerts <ArrowRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-content px-6">
        {/* Hero */}
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/10 bg-surface/60 px-3 py-1 text-xs text-muted">
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              New jobs detected in under a minute
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Apply before <br />
              <span className="bg-gradient-to-r from-primary-bright to-accent-bright bg-clip-text text-transparent">
                the flood.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Snipe watches companies&apos; applicant tracking systems directly
              and alerts you within minutes of a new posting — so your
              application lands near the top of the pile, not buried under a
              thousand others.
            </p>
            <div id="get-started" className="mt-8 max-w-md scroll-mt-24">
              <SignupForm redirectTo="/pricing?welcome=1" />
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-accent-bright" />
              No password. One-time sign-in link. Cancel anytime.
            </p>
          </div>

          <div
            className="animate-fade-up rounded-2xl border border-border/10 bg-surface p-6 shadow-card"
            style={{ animationDelay: "120ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Live feed
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-accent-bright">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
                watching 1,284 boards
              </span>
            </div>
            <ul className="space-y-3">
              {[
                ["Staff Engineer", "Vercel", "Remote", "12s ago"],
                ["Product Designer", "Linear", "SF / Remote", "48s ago"],
                ["Founding AE", "Ashby", "New York", "1m ago"],
              ].map(([title, company, loc, ago], i) => (
                <li
                  key={title}
                  className="animate-fade-up flex items-center justify-between gap-4 rounded-xl border border-border/[0.06] bg-surface-2/60 px-4 py-3"
                  style={{ animationDelay: `${240 + i * 90}ms` }}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-fg">{title}</div>
                    <div className="truncate text-xs text-muted">
                      {company} · {loc}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-bright tabular">
                    {ago}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust / stats strip */}
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/10 bg-border/10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="bg-surface px-6 py-6 text-center">
              <div className="text-2xl font-bold tracking-tight text-fg tabular">
                {s.n}
              </div>
              <div className="mt-1 text-xs text-muted">{s.l}</div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-20">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted">Three steps from URL to first alert.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.t}
                className="rounded-2xl border border-border/10 bg-surface p-6 transition-colors hover:border-border/20"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary-bright ring-1 ring-inset ring-primary/20">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="text-xs text-muted tabular">
                    0{i + 1}
                  </span>
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing teaser → dedicated /pricing page */}
        <section id="pricing" className="scroll-mt-24 border-t border-border/10 py-20">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-border/10 bg-surface p-10 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Simple, scale-friendly pricing.
              </h2>
              <p className="mt-2 max-w-lg text-muted">
                Free forever to start. Pro and Max unlock faster polling, more
                companies, and Discord &amp; SMS alerts — see every feature side by
                side.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-bright"
            >
              See plans &amp; compare <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* CTA band */}
        <section className="my-8 overflow-hidden rounded-3xl border border-border/10 bg-gradient-to-br from-primary/15 via-surface to-surface p-10 text-center shadow-glow">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Stop refreshing careers pages.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Let Snipe watch them for you and ping you the second something opens.
          </p>
          <div className="mx-auto mt-7 max-w-md">
            <SignupForm compact redirectTo="/pricing?welcome=1" />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/10 py-10 text-sm text-muted">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary-bright" />© {new Date().getFullYear()} Snipe
            </span>
            <span>Polls public ATS endpoints. Not affiliated with any employer.</span>
          </div>
        </footer>
      </main>
    </>
  );
}
