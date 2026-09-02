import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in — Snipe" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <AuthCard
      mode="signin"
      image="/auth-login.jpg"
      googleEnabled={googleEnabled}
      initialError={error}
    />
  );
}
