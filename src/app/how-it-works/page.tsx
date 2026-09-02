import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, BellRing, Search, Target, Timer } from "@/components/icons";

export const metadata: Metadata = {
  title: "How it works — Snipe",
  description:
    "How Snipe works: paste a careers URL, we poll the ATS directly, and you get alerted the moment a matching role is posted.",
};

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

export default function HowItWorksPage() {
  return (
    <div className="min-h-dvh bg-black text-white selection:bg-white selection:text-black">
      <main className="mx-auto max-w-content px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h1>
          <p className="mt-3 text-lg text-neutral-400">
            Three steps from a careers URL to your first alert.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.t}
              className="rounded-2xl border border-white/[0.08] bg-[#050505] p-6 transition-colors hover:border-white/[0.15]"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white ring-1 ring-inset ring-white/10">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="flex items-center gap-2 font-semibold">
                <span className="text-xs text-neutral-500 tabular">0{i + 1}</span>
                {s.t}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.15] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
          >
            See plans &amp; compare
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/[0.08] py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-neutral-400" />© {new Date().getFullYear()} Snipe
          </span>
          <span>Polls public ATS endpoints. Not affiliated with any employer.</span>
        </div>
      </footer>
    </div>
  );
}
