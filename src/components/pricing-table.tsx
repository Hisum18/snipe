"use client";

import { useState } from "react";

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
      <div className="mb-8 flex items-center justify-center gap-3">
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((t) => {
          const price = interval === "monthly" ? t.priceMonthly : t.priceAnnual;
          return (
            <div
              key={t.tier}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                t.highlighted
                  ? "border-accent/60 bg-accent/5 shadow-[0_0_0_1px_rgba(91,140,255,0.3)]"
                  : "border-white/10 bg-ink-soft",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t.label}</h3>
                {t.highlighted && (
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent-bright">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mb-4 text-sm text-slate-400">{t.tagline}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  ${price}
                </span>
                <span className="text-sm text-slate-400">
                  {t.tier === "free"
                    ? ""
                    : interval === "monthly"
                      ? "/mo"
                      : "/yr"}
                </span>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-300">
                    <Check />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#get-started"
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition",
                  t.highlighted
                    ? "bg-accent text-white hover:bg-accent-bright"
                    : "border border-white/15 text-slate-100 hover:bg-white/5",
                )}
              >
                {t.tier === "free" ? "Start free" : `Choose ${t.label}`}
              </a>
            </div>
          );
        })}
      </div>
      {interval === "annual" && (
        <p className="mt-4 text-center text-xs text-slate-500">
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
    <div className="inline-flex rounded-full border border-white/10 bg-ink-soft p-1 text-sm">
      {(["monthly", "annual"] as const).map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition",
            interval === i
              ? "bg-accent text-white"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          {i === "monthly" ? "Monthly" : "Annual"}
        </button>
      ))}
    </div>
  );
}

function Check() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.29 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
