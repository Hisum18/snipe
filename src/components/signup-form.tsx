"use client";

import { useState } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);

type Status = "idle" | "sending" | "sent" | "error";

export function SignupForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });
      if (res.status === 429) {
        setStatus("error");
        setMessage("Too many requests. Please try again later.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
        return;
      }
      // The server returns an identical response whether or not the email is
      // registered — we always show the same neutral confirmation.
      setStatus("sent");
      setMessage("Check your inbox for a sign-in link. It expires in 15 minutes.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        role="status"
      >
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate>
      <div className={compact ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-3 sm:flex-row"}>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@work.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          className="w-full rounded-xl border border-white/10 bg-ink-soft px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-bright disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Get alerts"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-rose-300" role="alert">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        We&apos;ll email you a one-time sign-in link. No password.
      </p>
    </form>
  );
}
