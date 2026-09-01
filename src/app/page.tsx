import Link from "next/link";

import { ShaderBg } from "@/components/hero/shader-bg";
import { ArrowRight, ShieldCheck, Target } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-black text-white selection:bg-white selection:text-black">
      {/* Hero — full-bleed animated shader, single screen */}
      <section className="relative isolate flex flex-1 items-center overflow-hidden">
        <ShaderBg />
        <div
          className="pointer-events-none absolute inset-0 bg-black/40"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-content items-center gap-12 px-6 py-14 md:grid-cols-2">
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
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
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
            <p className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="h-4 w-4 text-neutral-400" />
              No password. One-time sign-in link. Cancel anytime.
            </p>
          </div>

          {/* Live feed */}
          <div
            className="animate-fade-up rounded-2xl border border-white/[0.08] bg-[#050505]/85 p-6 backdrop-blur-sm"
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

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-6 text-sm text-neutral-500">
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
