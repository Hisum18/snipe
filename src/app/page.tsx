import Link from "next/link";

import { ShaderBg } from "@/components/hero/shader-bg";
import { ArrowRight, ShieldCheck, Target } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col bg-black text-white selection:bg-white selection:text-black">
      {/* Hero — full-bleed animated shader, single centered screen */}
      <section className="relative isolate flex flex-1 items-center overflow-hidden">
        <ShaderBg />
        <div
          className="pointer-events-none absolute inset-0 bg-black/40"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-14 text-center">
          <h1
            className="animate-flood-rise text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Apply before <br />
            <span className="flood-text">the flood.</span>
          </h1>

          <p
            className="animate-flood-rise mt-6 max-w-xl text-lg leading-relaxed text-neutral-400"
            style={{ animationDelay: "200ms" }}
          >
            Snipe watches companies&apos; applicant tracking systems directly and
            alerts you within minutes of a new posting — so your application
            lands near the top of the pile, not buried under a thousand others.
          </p>

          <div
            className="animate-flood-rise mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "340ms" }}
          >
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

          <p
            className="animate-flood-rise mt-7 flex items-center justify-center gap-2 text-xs text-neutral-500"
            style={{ animationDelay: "460ms" }}
          >
            <ShieldCheck className="h-4 w-4 text-neutral-400" />
            No password. One-time sign-in link. Cancel anytime.
          </p>
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
