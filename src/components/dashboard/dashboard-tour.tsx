"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRight, X } from "@/components/icons";

interface Step {
  /** Matches a `data-tour="..."` attribute on the target section. */
  target: string;
  title: string;
  body: string;
}

const STEPS: readonly Step[] = [
  {
    target: "plan",
    title: "Your plan, at a glance",
    body: "See your current plan, usage against its limits, and manage billing from right here.",
  },
  {
    target: "watch",
    title: "Watch a company",
    body: "Paste a careers URL — we detect Greenhouse, Lever, or Ashby automatically and start polling it for new roles.",
  },
  {
    target: "companies",
    title: "Your watched companies",
    body: "Every company you're tracking lives here. Edit its filters or remove it any time.",
  },
  {
    target: "profiles",
    title: "Alert profiles",
    body: "Save a keyword + location filter once, and it applies across every company you watch.",
  },
  {
    target: "recent",
    title: "Recent matched jobs",
    body: "New roles that matched your filters show up here first, before anywhere else.",
  },
  {
    target: "stats",
    title: "Your activity",
    body: "Track how many jobs you've matched all-time and this week.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 320;
const MARGIN = 16;

function measure(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * One-time, skippable dashboard walkthrough. `active` gates whether this ever
 * renders at all — the server only passes true when the account hasn't
 * dismissed it yet (`users.dashboardTourDismissedAt is null`), so returning
 * users never see it flash in.
 */
export function DashboardTour({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (!active) return;
    setVisible(true);
  }, [active]);

  const reposition = useCallback(() => {
    if (!step) return;
    setRect(measure(step.target));
  }, [step]);

  useEffect(() => {
    if (!visible || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Let the scroll (smooth, async) settle before measuring.
    const t = setTimeout(reposition, 260);
    return () => clearTimeout(t);
  }, [visible, step, reposition]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [visible, reposition]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") void finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  async function finish() {
    setVisible(false);
    try {
      await fetch("/api/tour", { method: "POST" });
    } catch {
      // Best-effort — worst case it shows again next load.
    }
  }

  function next() {
    if (isLast) {
      void finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const tooltipStyle = useMemo(() => {
    if (!rect || typeof window === "undefined") return null;
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeBelow = spaceBelow > 200 || rect.top < 200;
    const left = Math.min(
      Math.max(rect.left, MARGIN),
      window.innerWidth - TOOLTIP_WIDTH - MARGIN,
    );
    return placeBelow
      ? { top: rect.top + rect.height + PADDING + 12, left }
      : { bottom: window.innerHeight - rect.top + PADDING + 12, left };
  }, [rect]);

  if (!visible || !step) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-brand transition-all duration-300"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgb(var(--deep) / 0.72)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-deep/70" />
      )}

      {tooltipStyle && (
        <div
          className="inverse card-glass fixed rounded-2xl p-5"
          style={{ ...tooltipStyle, width: TOOLTIP_WIDTH }}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-normal text-white">{step.title}</h3>
            <button
              type="button"
              onClick={() => void finish()}
              aria-label="Skip walkthrough"
              className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">{step.body}</p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s.target}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === stepIndex ? "bg-brand" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
