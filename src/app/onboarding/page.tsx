import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.name) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-black text-white">
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <OnboardingFlow />
      </main>
    </div>
  );
}
