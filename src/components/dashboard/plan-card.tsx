"use client";

import { useState } from "react";

interface Props {
  planLabel: string;
  isPaid: boolean;
  usage: { companies: string; profiles: string; polling: string };
}

export function PlanCard({ planLabel, isPaid, usage }: Props) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout(plan: "pro" | "max") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Couldn't start checkout.");
        setBusy(false);
      }
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  async function portal() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Couldn't open billing portal.");
        setBusy(false);
      }
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/10 bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">Current plan</div>
          <div className="text-xl font-semibold">{planLabel}</div>
        </div>
        {isPaid && (
          <button
            type="button"
            onClick={portal}
            disabled={busy}
            className="rounded-lg border border-border/15 px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-60"
          >
            Manage billing
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Companies" value={usage.companies} />
        <Stat label="Profiles" value={usage.profiles} />
        <Stat label="Polling" value={usage.polling} />
      </dl>

      {!isPaid && (
        <div className="mt-6 border-t border-border/10 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-muted">Upgrade:</span>
            <div className="inline-flex rounded-full border border-border/10 p-0.5 text-xs">
              {(["monthly", "annual"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  className={`rounded-full px-2.5 py-1 ${
                    interval === i ? "bg-primary text-white" : "text-muted"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => checkout("pro")}
              disabled={busy}
              className="flex-1 rounded-lg border border-border/15 px-4 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
            >
              Pro
            </button>
            <button
              type="button"
              onClick={() => checkout("max")}
              disabled={busy}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-bright disabled:opacity-60"
            >
              Max
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2/60 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
