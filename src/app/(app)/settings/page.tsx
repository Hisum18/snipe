import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { effectiveTier, limitsFor } from "@/config/plans";
import { ConnectedAccountsSection } from "@/components/dashboard/connected-accounts-section";
import { DangerZone, SettingsSection } from "@/components/dashboard/settings-section";
import { BellRing, Check, ShieldCheck } from "@/components/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { connected } = await searchParams;
  const limits = limitsFor(user.plan, user.planStatus);
  const tier = effectiveTier(user.plan, user.planStatus);

  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const googleLinkedRows = googleEnabled
    ? await db
        .select({ provider: accounts.provider })
        .from(accounts)
        .where(and(eq(accounts.userId, user.id), eq(accounts.provider, "google")))
        .limit(1)
    : [];
  const googleLinked = googleLinkedRows.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="animate-enter mb-8">
        <p className="mt-1 text-sm text-neutral-400">{user.email}</p>
      </div>

      {connected === "1" && (
        <p
          role="status"
          className="animate-enter mb-6 flex items-center gap-2 rounded-lg border border-white/[0.15] bg-white/[0.05] p-3 text-sm text-neutral-200"
        >
          <Check className="h-4 w-4 shrink-0 text-white" />
          Google account connected.
        </p>
      )}

      <div className="space-y-6">
        <section
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "80ms" }}
        >
          <SectionHeading icon={BellRing} title="Notifications" />
          <div className="mt-4">
            <SettingsSection
              discordWebhookUrl={user.discordWebhookUrl}
              emailNotificationsEnabled={user.emailNotificationsEnabled}
              canUseDiscord={limits.channels.includes("discord")}
              isMax={tier === "max"}
              phoneE164={user.phoneE164}
              phoneVerified={user.phoneVerifiedAt !== null}
            />
          </div>
        </section>

        {googleEnabled && (
          <section
            className="card-glass animate-enter rounded-2xl p-6"
            style={{ animationDelay: "110ms" }}
          >
            <SectionHeading icon={ShieldCheck} title="Connected accounts" />
            <div className="mt-4">
              <ConnectedAccountsSection googleLinked={googleLinked} />
            </div>
          </section>
        )}

        <div className="animate-enter" style={{ animationDelay: "140ms" }}>
          <DangerZone />
        </div>
      </div>
    </main>
  );
}
