"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { ArrowRight, Check } from "@/components/icons";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.19c-.27 1.44-1.08 2.66-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98C3.59 21.35 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67c-.23-.69-.36-1.42-.36-2.17s.13-1.48.36-2.17V7.35H1.7C.92 8.9.5 10.4.5 12s.42 3.1 1.2 4.65l3.85-2.98z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.24 15.11 0 12 0 7.5 0 3.59 2.65 1.7 6.35l3.85 2.98C6.46 6.61 9 4.75 12 4.75z"
      />
    </svg>
  );
}

export function AuthCard({
  mode,
  googleEnabled,
  initialError,
  initialNotice,
}: {
  mode: "signin" | "signup";
  googleEnabled: boolean;
  initialError?: string;
  /** Success notice, e.g. after verifying an email or resetting a password. */
  initialNotice?: string;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(() => {
    if (!initialError) return "";
    if (initialError === "OAuthAccountNotLinked") {
      return "An account with this email already exists. Sign in with your password below, then connect Google from Settings — or reset your password if you don't remember setting one.";
    }
    return "That sign-in didn't work. Please try again.";
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isSignup) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Couldn't create your account.");
          setBusy(false);
          return;
        }
        // Verify-first: don't sign in until the email is confirmed.
        setSent(true);
        setBusy(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {sent ? (
        <div>
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-selected">
            <Check className="h-5 w-5 text-brand" />
          </div>
          <h1 className="text-2xl font-normal tracking-tight">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            We sent a verification link to{" "}
            <span className="text-white">{email}</span>. Confirm your email to
            finish setting up your account and start receiving job alerts.
          </p>
          <p className="mt-6 text-sm text-neutral-400">
            <Link
              href="/login"
              className="font-medium text-brand-text hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {isSignup
              ? "Start getting job alerts in minutes."
              : "Sign in to your Snipe account."}
          </p>

          {initialNotice && (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.15] bg-white/[0.05] p-3 text-sm text-neutral-200"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {initialNotice}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/[0.15] bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-brand"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-500">
                <span className="h-px flex-1 bg-white/[0.1]" /> or
                <span className="h-px flex-1 bg-white/[0.1]" />
              </div>
            </>
          )}

          <form
            onSubmit={onSubmit}
            className={googleEnabled ? "space-y-4" : "mt-6 space-y-4"}
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm text-neutral-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="you@work.com"
                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-brand"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm text-neutral-300"
                >
                  Password
                </label>
                {!isSignup && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-neutral-400 hover:text-brand-text"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                placeholder={isSignup ? "At least 8 characters" : "••••••••"}
                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? isSignup
                  ? "Creating…"
                  : "Signing in…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-brand-text hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-brand-text hover:underline"
                >
                  Sign up
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </>
  );
}
