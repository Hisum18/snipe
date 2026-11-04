"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { SnipeLogo } from "@/components/icons";

/**
 * Wraps /login and /signup (route group — doesn't affect the URL). This is
 * the "rectangle" card shell: a single persistent component across both
 * routes, so the accent panel can slide from one side to the other when the
 * route changes instead of just popping into place. Each page still keeps
 * its own server-side auth redirect and searchParams handling — this only
 * supplies the chrome and passes the page's form markup through as children.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignup = pathname === "/signup";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-4 py-10 text-white">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-surface shadow-float lg:h-[580px]">
        {/* Sliding panel — a carbon "blob" (`.inverse`, so its copy reads
            light in both themes) that sweeps from one side to the other on
            toggle.
            Sized/positioned in fixed px (the card itself is a fixed 896x580
            at lg+) so its curved edge settles just shy of the panel's center
            seam and never reaches into the form panel's padded text.
            Desktop only. */}
        <motion.div
          className="absolute top-1/2 hidden h-[1450px] w-[1450px] -translate-y-1/2 overflow-hidden inverse rounded-full border border-white/[0.08] bg-black lg:block"
          animate={{ left: isSignup ? "484px" : "-1038px" }}
          transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
        />

        {/* Invitation copy, pinned to whichever side the accent panel
            currently covers. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:grid lg:grid-cols-2">
          <div
            className={`inverse flex flex-col items-start justify-center gap-3 px-12 transition-opacity duration-500 ${
              isSignup ? "opacity-0" : "opacity-100"
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-brand-text">
              New here?
            </p>
            <p className="max-w-xs text-2xl font-normal tracking-tight text-white">
              Apply before the flood.
            </p>
            <p className="max-w-xs text-sm text-neutral-300">
              Snipe alerts you within minutes when a company posts a new role —
              so you&apos;re first in the queue.
            </p>
            <Link
              href="/signup"
              className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-5 py-2 text-sm font-normal transition-colors hover:border-brand hover:text-brand-text"
            >
              Create an account
            </Link>
          </div>
          <div
            className={`inverse flex flex-col items-end justify-center gap-3 px-12 text-right transition-opacity duration-500 ${
              isSignup ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-brand-text">
              Already with us?
            </p>
            <p className="max-w-xs text-2xl font-normal tracking-tight text-white">
              Welcome back.
            </p>
            <p className="max-w-xs text-sm text-neutral-300">
              Sign in to pick up right where you left off.
            </p>
            <Link
              href="/login"
              className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-5 py-2 text-sm font-normal transition-colors hover:border-brand hover:text-brand-text"
            >
              Sign in instead
            </Link>
          </div>
        </div>

        {/* Form panel — slides to the opposite side from the accent panel. */}
        <div
          className={`relative z-10 flex items-center px-6 py-10 lg:absolute lg:top-0 lg:h-full lg:w-1/2 lg:px-12 lg:transition-[left] lg:duration-700 lg:ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isSignup ? "lg:left-0" : "lg:left-1/2"
          }`}
        >
          <div key={pathname} className="animate-enter mx-auto w-full max-w-sm">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-lg font-normal tracking-tight"
            >
              <SnipeLogo className="h-6 w-6 text-brand" /> Snipe
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
