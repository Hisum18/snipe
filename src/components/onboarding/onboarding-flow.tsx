"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArrowRight, Target } from "@/components/icons";

const inputClass =
  "w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-brand";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "companies">("name");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [urls, setUrls] = useState(["", "", ""]);
  const [fieldErrors, setFieldErrors] = useState<(string | null)[]>([null, null, null]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save that. Try again.");
        return;
      }
      setStep("companies");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    const nextErrors: (string | null)[] = [null, null, null];
    await Promise.all(
      urls.map(async (url, i) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        try {
          const res = await fetch("/api/watches", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ careersUrl: trimmed, keywordFilters: [] }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) nextErrors[i] = data.error ?? "Couldn't add that one.";
        } catch {
          nextErrors[i] = "Network error.";
        }
      }),
    );
    setFieldErrors(nextErrors);
    setBusy(false);
    if (nextErrors.every((e) => e === null)) {
      router.push("/dashboard");
    }
  }

  if (step === "name") {
    return (
      <div className="animate-enter">
        <div className="mb-8 flex items-center gap-2 text-neutral-400">
          <Target className="h-5 w-5" />
          <span className="text-sm">Welcome to Snipe</span>
        </div>
        <h1 className="text-3xl font-normal tracking-tight">What should we call you?</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Just a first name is fine — we&apos;ll use it to greet you on your dashboard.
        </p>
        <form onSubmit={saveName} className="mt-6 space-y-3">
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className={inputClass}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-normal text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-normal tracking-tight">
        Track up to 3 companies to start
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        Paste careers URLs from Greenhouse, Lever, or Ashby. You can add more, or change
        these, any time from your dashboard.
      </p>
      <div className="mt-6 space-y-3">
        {urls.map((url, i) => (
          <div key={i}>
            <input
              placeholder={`https://job-boards.greenhouse.io/company-${i + 1}`}
              value={url}
              onChange={(e) => {
                const next = [...urls];
                next[i] = e.target.value;
                setUrls(next);
              }}
              disabled={busy}
              className={inputClass}
            />
            {fieldErrors[i] && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors[i]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-normal text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {busy ? "Setting up…" : "Go to dashboard"} <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={busy}
          className="text-sm text-neutral-400 hover:text-white"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
