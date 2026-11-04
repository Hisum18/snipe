"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface CarouselStep {
  name: string;
  title: string;
  description: string;
  /**
   * The real product-visual UI for this step (not a static image) — a
   * rendered element, not a render function: this page is a Server
   * Component passing `steps` across the RSC boundary into this Client
   * Component, and functions aren't serializable across that boundary the
   * way React elements are.
   */
  visual: React.ReactNode;
}

const stepVariants: Variants = {
  inactive: { scale: 0.9, opacity: 0.7 },
  active: { scale: 1, opacity: 1 },
};

/** Auto-advances through steps; any manual jump resets the timer. */
function useStepCycler(total: number, intervalMs = 5000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setCurrent((prev) => (prev + 1) % total), intervalMs);
    return () => clearTimeout(id);
  }, [current, total, intervalMs]);

  const setStep = useCallback((index: number) => setCurrent(index % total), [total]);
  return { current, setStep };
}

function FeatureCard({
  step,
  steps,
  children,
}: {
  step: number;
  steps: readonly CarouselStep[];
  children: React.ReactNode;
}) {
  return (
    <div className="card-glass relative w-full overflow-hidden rounded-3xl">
      <div className="grid gap-8 p-8 md:min-h-[420px] md:grid-cols-2 md:items-center md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="font-mono text-xs font-normal uppercase tracking-wider text-brand-text"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.3 }}
            >
              {steps[step]!.name}
            </motion.div>
            <motion.h2
              className="text-2xl font-semibold tracking-tight text-white md:text-3xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {steps[step]!.title}
            </motion.h2>
            <motion.p
              className="text-base leading-relaxed text-neutral-400"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              {steps[step]!.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}

function StepsNav({
  steps,
  current,
  onChange,
}: {
  steps: readonly CarouselStep[];
  current: number;
  onChange: (index: number) => void;
}) {
  return (
    <nav aria-label="Progress" className="flex justify-center px-4">
      <ol className="flex w-full flex-wrap items-center justify-center gap-2" role="list">
        {steps.map((step, i) => {
          const isCompleted = current > i;
          const isCurrent = current === i;
          return (
            <motion.li
              key={step.name}
              initial="inactive"
              animate={isCurrent ? "active" : "inactive"}
              variants={stepVariants}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => onChange(i)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-sm font-normal transition-colors duration-300",
                  isCurrent
                    ? "bg-selected font-medium text-selected-foreground ring-1 ring-brand/40"
                    : "bg-white/[0.05] text-neutral-300 hover:bg-white/[0.09]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                    isCompleted
                      ? "bg-selected text-selected-foreground"
                      : isCurrent
                        ? "bg-accent text-accent-foreground"
                        : "bg-white/10 text-neutral-300 group-hover:bg-white/20",
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                </span>
                <span className="hidden sm:inline-block">{step.name}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}

export function FeatureCarousel({ steps }: { steps: readonly CarouselStep[] }) {
  const { current, setStep } = useStepCycler(steps.length);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <FeatureCard step={current} steps={steps}>
        <div className="relative flex min-h-[220px] items-center justify-center md:min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
              className="flex w-full select-none items-center justify-center"
            >
              {steps[current]!.visual}
            </motion.div>
          </AnimatePresence>
        </div>
      </FeatureCard>
      <StepsNav current={current} onChange={setStep} steps={steps} />
    </div>
  );
}
