"use client";

import { useState } from "react";

interface Props {
  planLabel: string;
  isPaid: boolean;
  /** Effective tier — used to decide whether an Upgrade-to-Max CTA applies. */
  tier: "free" | "pro" | "max";
  usage: { companies: string; profiles: string; polling: string };
  /** Narrow-column layout (dashboard bento tile) — stacks stats instead of a
   *  3-col grid, since labels like "Companies" don't fit a ~50px column. */
  compact?: boolean;
  /** True while a payment has failed — tracking is paused. Shows a badge next
   *  to the plan name instead of silently reading as plain Free. */
  suspended?: boolean;
}

// Paying and managing billing happen on Snipe's own billing pages
// (/checkout, /billing/manage), opened in a new tab so this one stays put.
// That tab broadcasts on "snipe-billing" when something changes, and the app
// shell refreshes this page in response.
const NEW_TAB = { target: "_blank", rel: "noopener" } as const;

export function PlanCard({ planLabel, isPaid, tier, usage, compact, suspended }: Props) {
  const [interval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="card-glass h-full rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-400">Current plan</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-normal">{planLabel}</span>
            {suspended && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-normal text-destructive">
                Payment failed
              </span>
            )}
          </div>
        </div>
        {isPaid && (
          <div className="flex items-center gap-2">
            {tier === "pro" && !suspended && (
              <a
                href="/checkout?plan=max"
                {...NEW_TAB}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-normal text-accent-foreground hover:bg-accent/90"
              >
                Upgrade
              </a>
            )}
            <a
              href="/billing/manage"
              {...NEW_TAB}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/[0.06]"
            >
              Manage billing
            </a>
          </div>
        )}
      </div>

      <dl
        className={
          compact
            ? "mt-4 space-y-2 text-sm"
            : "mt-4 grid grid-cols-3 gap-3 text-sm"
        }
      >
        <Stat label="Companies" value={usage.companies} compact={compact} />
        <Stat label="Profiles" value={usage.profiles} compact={compact} />
        <Stat label="Polling" value={usage.polling} compact={compact} />
      </dl>

      {!isPaid && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-neutral-400">Upgrade:</span>
            <div className="inline-flex rounded-full border border-white/10 p-0.5 text-xs">
              {(["monthly", "annual"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBillingInterval(i)}
                  aria-pressed={interval === i}
                  className={`rounded-full px-2.5 py-1 ${
                    interval === i ? "bg-selected text-selected-foreground" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href={`/checkout?plan=pro&interval=${interval}`}
              {...NEW_TAB}
              className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-center text-sm font-normal hover:bg-white/[0.06]"
            >
              Pro
            </a>
            <a
              href={`/checkout?plan=max&interval=${interval}`}
              {...NEW_TAB}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-center text-sm font-normal text-accent-foreground hover:bg-accent/90"
            >
              Max
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
        <span className="text-neutral-400">{label}</span>
        <span className="font-normal">{value}</span>
      </div>
    );
  }
  return (
    <div className="min-w-0 rounded-lg bg-white/[0.04] p-3">
      <div className="break-words text-xs leading-tight text-neutral-400">{label}</div>
      <div className="mt-0.5 truncate font-normal">{value}</div>
    </div>
  );
}
