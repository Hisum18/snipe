import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, notifications, profiles, seenJobs, watches } from "@/db/schema";
import { effectiveTier, limitsFor } from "@/config/plans";
import { AddCompany } from "@/components/dashboard/add-company";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ProfilesSection, type ProfileRow } from "@/components/dashboard/profiles-section";
import { DangerZone, SettingsSection } from "@/components/dashboard/settings-section";
import { WatchList, type WatchRow } from "@/components/dashboard/watch-list";
import {
  BellRing,
  Building,
  Download,
  Search,
  Target,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function pollingLabel(seconds: number): string {
  if (seconds >= 86400) return "daily";
  if (seconds >= 3600) return `${seconds / 3600}h`;
  return `${seconds / 60}m`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const limits = limitsFor(user.plan, user.planStatus);
  const tier = effectiveTier(user.plan, user.planStatus);

  const [watchRows, watchCountRows, profileRows, recentRows] = await Promise.all([
    db
      .select({
        id: watches.id,
        keywordFilters: watches.keywordFilters,
        locationFilter: watches.locationFilter,
        active: watches.active,
        companyName: companies.name,
        atsProvider: companies.atsProvider,
        atsSlug: companies.atsSlug,
      })
      .from(watches)
      .innerJoin(companies, eq(companies.id, watches.companyId))
      .where(eq(watches.userId, user.id))
      .orderBy(desc(watches.createdAt)),
    db
      .select({ value: count() })
      .from(watches)
      .where(and(eq(watches.userId, user.id), eq(watches.active, true))),
    db
      .select({
        id: profiles.id,
        name: profiles.name,
        keywordFilters: profiles.keywordFilters,
        locationFilter: profiles.locationFilter,
        crossCompany: profiles.crossCompany,
        active: profiles.active,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .orderBy(desc(profiles.createdAt)),
    db
      .select({
        jobId: seenJobs.id,
        title: seenJobs.title,
        location: seenJobs.location,
        url: seenJobs.url,
        companyName: companies.name,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .innerJoin(seenJobs, eq(seenJobs.id, notifications.jobId))
      .innerJoin(companies, eq(companies.id, seenJobs.companyId))
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(60),
  ]);

  const activeWatches = watchCountRows[0]?.value ?? 0;
  const activeProfiles = profileRows.filter((p) => p.active).length;
  const profileList: ProfileRow[] = profileRows;

  // Dedupe matched jobs across channels, keep most recent 20.
  const seen = new Set<string>();
  const recentJobs = recentRows
    .filter((r) => (seen.has(r.jobId) ? false : (seen.add(r.jobId), true)))
    .slice(0, 20);

  const watchList: WatchRow[] = watchRows.map((w) => ({
    id: w.id,
    companyName: w.companyName,
    atsProvider: w.atsProvider,
    atsSlug: w.atsSlug,
    keywordFilters: w.keywordFilters,
    locationFilter: w.locationFilter,
    active: w.active,
  }));

  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {limits.label} plan · {pollingLabel(limits.pollIntervalSeconds)} polling
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-border/10 bg-surface p-6">
              <SectionHeading icon={Search} title="Watch a company" />
              <div className="mt-4">
                <AddCompany />
              </div>
            </section>

            <section className="rounded-2xl border border-border/10 bg-surface p-6">
              <SectionHeading
                icon={Building}
                title="Watched companies"
                count={`${activeWatches}${limits.maxCompanies === null ? "" : ` / ${limits.maxCompanies}`}`}
              />
              <div className="mt-4">
                <WatchList watches={watchList} />
              </div>
            </section>

            <section className="rounded-2xl border border-border/10 bg-surface p-6">
              <SectionHeading
                icon={Target}
                title="Alert profiles"
                count={`${activeProfiles}${limits.maxProfiles === null ? "" : ` / ${limits.maxProfiles}`}`}
              />
              <p className="mb-4 mt-1.5 text-sm text-muted">
                Saved keyword filters for your alerts.
                {limits.crossCompanySearch
                  ? " Cross-company profiles match every indexed company."
                  : ""}
              </p>
              <ProfilesSection
                profiles={profileList}
                canUseCrossCompany={limits.crossCompanySearch}
              />
            </section>

            <section className="rounded-2xl border border-border/10 bg-surface p-6">
              <div className="flex items-center justify-between">
                <SectionHeading icon={BellRing} title="Recent matched jobs" />
                {limits.fullHistoryExport && (
                  <a
                    href="/api/export/jobs"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/15 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </a>
                )}
              </div>
              <div className="mt-4">
                {recentJobs.length === 0 ? (
                  <p className="text-sm text-muted">
                    Nothing yet. New roles at your watched companies will show up here.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {recentJobs.map((j) => (
                      <li
                        key={j.jobId}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/[0.06] bg-surface-2/50 px-4 py-3 transition-colors hover:border-border/15"
                      >
                        <div className="min-w-0">
                          {/* Untrusted ATS text — rendered as escaped JSX text. */}
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="truncate font-medium text-primary-bright hover:underline"
                          >
                            {j.title}
                          </a>
                          <div className="truncate text-xs text-muted">
                            {j.companyName}
                            {j.location ? ` · ${j.location}` : ""}
                          </div>
                        </div>
                        <time className="shrink-0 text-xs text-muted tabular">
                          {new Date(j.createdAt).toLocaleDateString()}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <PlanCard
              planLabel={limits.label}
              isPaid={tier !== "free"}
              usage={{
                companies: `${activeWatches}${limits.maxCompanies === null ? "" : ` / ${limits.maxCompanies}`}`,
                profiles: `${activeProfiles}${limits.maxProfiles === null ? "" : ` / ${limits.maxProfiles}`}`,
                polling: pollingLabel(limits.pollIntervalSeconds),
              }}
            />

            <section className="rounded-2xl border border-border/10 bg-surface p-6">
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
          </div>
        </div>

        <div className="mt-6">
          <DangerZone />
        </div>
      </main>
    </>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: (p: { className?: string }) => React.ReactElement;
  title: string;
  count?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary-bright ring-1 ring-inset ring-primary/20">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {count && <span className="text-sm text-muted tabular">({count})</span>}
    </div>
  );
}
