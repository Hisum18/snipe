"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { SnipeAppIcon } from "@/components/icons";
import { DashboardMock } from "@/components/hero/dashboard-mock";
import {
  DiscordNotification,
  EmailNotification,
  SmsNotification,
} from "@/components/hero/notification-stack";
import { usePrefersReducedMotion, useIsMobile } from "@/lib/hooks";

const SESSION_KEY = "snipe-hero-intro-played";
const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * Decides, once, whether this page view should play the intro. Always
 * starts `false` (matching both the server render and the client's first
 * paint — no window access during render, so no hydration mismatch), then
 * flips at most once in an effect after checking prefers-reduced-motion and
 * sessionStorage. The flip changes the `<IntroVisual>` instance's `key`
 * (below), which remounts it fresh so Framer's `initial` values apply as a
 * true first mount and the reveal actually plays — toggling props on an
 * already-mounted motion component wouldn't replay from a hidden state.
 */
function useShouldPlayIntro(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage blocked — fall through and play the intro once, harmlessly.
    }
    setShouldPlay(true);
  }, [reducedMotion]);

  return shouldPlay;
}

/**
 * Stage 1 (logo) -> Stage 2 (dashboard rises in) -> Stage 3 (notifications
 * arrive sequentially) -> Stage 4 (settle, no further motion) — ~3.2s total,
 * driven entirely by per-element transition delays. A soft concrete light
 * warms up behind the composition with the logo and settles low. When
 * `play` is false every element mounts directly at its resting state (no
 * animation) — used both for prefers-reduced-motion and for the settled
 * first paint before the intro decision above resolves.
 */
function IntroVisual({ play, isMobile }: { play: boolean; isMobile: boolean }) {
  const dashboardTransition = play ? { delay: 0.9, duration: 0.7, ease: EASE } : { duration: 0 };

  return (
    // Desktop: right padding reserves the notification cards' overhang (they
    // hang off the dashboard's right edge, below), so the composition as a
    // whole — not just the dashboard — is what gets laid out and centered.
    // Every size in the composition is in rem, so it grows with the
    // large-display root scaling in globals.css along with the text; `zoom`
    // then fits it to each layout: md/lg are the stacked hero, and from xl it
    // sits in the hero's right column, where each step is the largest that
    // column allows (1.06 holds for every wider screen, since the column and
    // the picture scale together).
    <div className="relative isolate mx-auto flex w-full max-w-xl flex-col items-center md:w-auto md:max-w-none md:pr-[18.75rem] md:[zoom:0.9] lg:[zoom:1.15] xl:mx-0 xl:[zoom:0.88] min-[1400px]:[zoom:0.98] 2xl:[zoom:1.06]">
      {/* Soft light — one concrete-gray wash behind the product (not a glow
          on any element). Brightens with the logo, then settles. */}
      <motion.div
        aria-hidden="true"
        initial={play ? { opacity: 0 } : { opacity: 0.55 }}
        animate={play ? { opacity: [0, 1, 0.55] } : { opacity: 0.55 }}
        transition={play ? { duration: 2.4, times: [0, 0.35, 1], ease: EASE } : { duration: 0 }}
        className="pointer-events-none absolute -inset-x-16 -inset-y-12 -z-10"
        style={{
          background:
            "radial-gradient(closest-side, rgb(var(--accent-2) / 0.3), rgb(var(--accent-2) / 0.08) 55%, transparent)",
        }}
      />

      {/* Stage 1 — app icon, fades in then recedes as the dashboard takes over. */}
      <motion.div
        aria-hidden="true"
        initial={play ? { opacity: 0, scale: 0.85 } : { opacity: 0 }}
        animate={play ? { opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 1.08] } : { opacity: 0 }}
        transition={play ? { duration: 1.3, times: [0, 0.2, 0.55, 1], ease: EASE } : { duration: 0 }}
        className="pointer-events-none absolute top-10 z-30 flex h-24 w-24 items-center justify-center rounded-[26px]"
        style={{ boxShadow: play ? "0 24px 60px -14px rgb(var(--brand) / 0.45)" : undefined }}
      >
        <SnipeAppIcon className="h-24 w-24" />
      </motion.div>

      {/* Stage 2 — dashboard rises in with a touch of parallax. */}
      <motion.div
        initial={play ? { opacity: 0, y: 36 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={dashboardTransition}
        className="relative z-10"
      >
        <DashboardMock />
      </motion.div>

      {/* Stage 3 — notifications arrive sequentially. Desktop: scattered
          around the dashboard like the reference image. Mobile: a simplified
          vertical stack underneath, not a shrunk copy of the desktop layout. */}
      {isMobile ? (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: play ? 0.22 : 0, delayChildren: play ? 1.75 : 0 }}
          className="relative z-10 mt-4 flex w-full flex-col gap-2.5"
        >
          <DiscordNotification className="w-full" />
          <SmsNotification className="w-full" />
          <EmailNotification className="w-full" />
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: play ? 0.25 : 0, delayChildren: play ? 1.75 : 0 }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          <DiscordNotification
            className="absolute -top-6 rotate-[2deg]"
            style={{ right: "0" }}
          />
          <SmsNotification
            className="absolute -rotate-1"
            style={{ right: "2.5rem", top: "11.5625rem" }}
          />
          <EmailNotification
            className="absolute rotate-1"
            style={{ right: "5.3125rem", top: "23.125rem" }}
          />
        </motion.div>
      )}
    </div>
  );
}

export function HeroIntro() {
  const shouldPlay = useShouldPlayIntro();
  const isMobile = useIsMobile();

  // Remounting on the play/rest boundary is what makes the reveal actually
  // play from a hidden state — see useShouldPlayIntro's doc comment above.
  return <IntroVisual key={shouldPlay ? "play" : "rest"} play={shouldPlay} isMobile={isMobile} />;
}
