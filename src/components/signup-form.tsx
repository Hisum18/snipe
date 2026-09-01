"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { z } from "zod";

import { ArrowRight } from "@/components/icons";

const emailSchema = z.string().trim().email().max(254);

type Status = "idle" | "sending" | "sent" | "error";

export function SignupForm({
  compact = false,
  redirectTo,
}: {
  compact?: boolean;
  /** If set, navigate here after the link is sent instead of showing the
   *  inline confirmation (used on marketing pages to route to pricing). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const helpId = useId();
  const errId = useId();

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
      setStatus("sent");
      setMessage("Check your inbox for a sign-in link. It expires in 15 minutes.");
      if (redirectTo) router.push(redirectTo);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent-bright"
      >
        <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span className="text-fg/90">{message}</span>
      </div>
    );
  }

  const invalid = status === "error";

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate>
      <div className={compact ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-3 sm:flex-row"}>
        <label htmlFor="signup-email" className="sr-only">
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@work.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          aria-invalid={invalid}
          aria-describedby={invalid ? errId : helpId}
          className="w-full rounded-xl border border-border/15 bg-surface-2/60 px-4 py-3 text-sm text-fg outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Get alerts"}
          {status !== "sending" && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      {invalid ? (
        <p id={errId} role="alert" aria-live="assertive" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      ) : (
        <p id={helpId} className="mt-2 text-xs text-muted">
          We&apos;ll email you a one-time sign-in link. No password.
        </p>
      )}
    </form>
  );
}
