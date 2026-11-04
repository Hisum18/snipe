"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { ArrowRight, SnipeLogo } from "@/components/icons";

const emailSchema = z.string().trim().email().max(254);

type Status = "idle" | "sending" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailSchema.safeParse(email).success) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
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
      setMessage(
        "If an account exists for that email, we've sent a reset link. Check your inbox — it expires in 1 hour.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-lg font-normal tracking-tight"
        >
          <SnipeLogo className="h-6 w-6 text-brand" /> Snipe
        </Link>
        <h1 className="text-2xl font-normal tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {status === "sent" ? (
          <p
            role="status"
            className="mt-6 rounded-lg border border-white/[0.15] bg-white/[0.05] p-4 text-sm text-neutral-200"
          >
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {status === "error" && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {message}
              </p>
            )}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "sending"}
              placeholder="you@work.com"
              className="w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-brand"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-normal text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send reset link"}
              {status !== "sending" && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-neutral-400">
          <Link href="/login" className="font-medium text-brand-text hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
