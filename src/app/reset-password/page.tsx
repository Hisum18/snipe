"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ArrowRight, Target } from "@/components/icons";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const invalidLink = !token || !email;

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't reset your password.");
        setBusy(false);
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-white selection:bg-white selection:text-black">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Target className="h-5 w-5" /> Snipe
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>

        {invalidLink ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            This reset link is missing or malformed.{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-400">
              For {email}. This link works once and expires after 1 hour.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-white/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
              >
                {busy ? "Updating…" : "Update password"}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-sm text-neutral-400">
          <Link href="/login" className="font-medium text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
