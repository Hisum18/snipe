import Link from "next/link";

import { ShaderBg } from "@/components/hero/shader-bg";
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
    <div className="min-h-dvh bg-black text-white selection:bg-white selection:text-black">
      {/* Hero — full-bleed animated shader background */}
      <section className="relative isolate overflow-hidden">
        <ShaderBg />
        <div
          className="pointer-events-none absolute inset-0 bg-black/40"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              New jobs detected in under a minute
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Apply before <br />
              <span className="bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
                the flood.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-400">
              Snipe watches companies&apos; applicant tracking systems directly
              and alerts you within minutes of a new posting — so your
              application lands near the top of the pile, not buried under a
              thousand others.
            </p>
            <div id="get-started" className="mt-8 max-w-md scroll-mt-24">
              <SignupForm mono redirectTo="/pricing?welcome=1" />
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-neutral-400" />
              No password. One-time sign-in link. Cancel anytime.
            </p>
          </div>

          <div
            className="animate-fade-up rounded-2xl border border-white/[0.08] bg-[#050505] p-6"
            style={{ animationDelay: "120ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Live feed
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-300">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
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
                  className="animate-fade-up flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  style={{ animationDelay: `${240 + i * 90}ms` }}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{title}</div>
                    <div className="truncate text-xs text-neutral-500">
                      {company} · {loc}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-xs text-neutral-300 tabular">
                    {ago}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-content px-6">
        {/* Trust / stats strip */}
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="bg-[#050505] px-6 py-6 text-center">
              <div className="text-2xl font-bold tracking-tight text-white tabular">
                {s.n}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{s.l}</div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-20">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-neutral-400">Three steps from URL to first alert.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.t}
                className="rounded-2xl border border-white/[0.08] bg-[#050505] p-6 transition-colors hover:border-white/[0.15]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white ring-1 ring-inset ring-white/10">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="text-xs text-neutral-500 tabular">
                    0{i + 1}
                  </span>
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing teaser → dedicated /pricing page */}
        <section id="pricing" className="scroll-mt-24 border-t border-white/[0.08] py-20">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/[0.08] bg-[#050505] p-10 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Simple, scale-friendly pricing.
              </h2>
              <p className="mt-2 max-w-lg text-neutral-400">
                Free forever to start. Pro and Max unlock faster polling, more
                companies, and Discord &amp; SMS alerts — see every feature side by
                side.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              See plans &amp; compare <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* CTA band */}
        <section className="my-8 overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-transparent p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Stop refreshing careers pages.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            Let Snipe watch them for you and ping you the second something opens.
          </p>
          <div className="mx-auto mt-7 max-w-md">
            <SignupForm compact mono redirectTo="/pricing?welcome=1" />
          </div>
        </section>

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
