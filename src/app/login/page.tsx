import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

const ERRORS: Record<string, string> = {
  invalid: "That sign-in link is invalid or has expired. Request a new one below.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;
  const message = error ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight">
        Snipe<span className="text-accent">.</span>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Sign in or create an account</h1>
      <p className="mt-2 text-sm text-slate-400">
        Enter your email and we&apos;ll send you a one-time sign-in link.
      </p>
      {message && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {message}
        </p>
      )}
      <div className="mt-6">
        <SignupForm />
      </div>
    </main>
  );
}
