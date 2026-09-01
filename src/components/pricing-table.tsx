"use client";

import { useState } from "react";

import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface PricingTier {
  tier: "free" | "pro" | "max";
  label: string;
  priceMonthly: number;
  priceAnnual: number;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

export function PricingTable({ tiers }: { tiers: PricingTier[] }) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((t) => {
          const price = interval === "monthly" ? t.priceMonthly : t.priceAnnual;
          return (
            <div
              key={t.tier}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-colors",
                t.highlighted
                  ? "border-primary/50 bg-surface shadow-glow"
                  : "border-border/10 bg-surface hover:border-border/20",
              )}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{t.label}</h3>
              <p className="mt-1 text-sm text-muted">{t.tagline}</p>
              <div className="mb-6 mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight tabular">
                  ${price}
                </span>
                <span className="text-sm text-muted">
                  {t.tier === "free" ? "" : interval === "monthly" ? "/mo" : "/yr"}
                </span>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" />
                    <span className="text-fg/90">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#get-started"
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  t.highlighted
                    ? "bg-primary text-white hover:bg-primary-bright"
                    : "border border-border/15 text-fg hover:bg-surface-2",
                )}
              >
                {t.tier === "free" ? "Start free" : `Choose ${t.label}`}
              </a>
            </div>
          );
        })}
      </div>
      {interval === "annual" && (
        <p className="mt-4 text-center text-xs text-muted">
          Annual billing is 10× the monthly price — two months free.
        </p>
      )}
    </div>
  );
}

function IntervalToggle({
  interval,
  onChange,
}: {
  interval: "monthly" | "annual";
  onChange: (i: "monthly" | "annual") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="inline-flex rounded-full border border-border/10 bg-surface p-1 text-sm"
    >
      {(["monthly", "annual"] as const).map((i) => (
        <button
          key={i}
          type="button"
          aria-pressed={interval === i}
          onClick={() => onChange(i)}
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 font-medium transition-colors",
            interval === i
              ? "bg-primary text-white"
              : "text-muted hover:text-fg",
          )}
        >
          {i === "monthly" ? "Monthly" : "Annual"}
          {i === "annual" && (
            <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent-bright">
              -17%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
