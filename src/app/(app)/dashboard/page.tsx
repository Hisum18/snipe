import { and, count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, notifications, profiles, seenJobs, watches } from "@/db/schema";
import { effectiveTier, isPaymentSuspended, limitsFor, PLAN_LIMITS } from "@/config/plans";
import { AddCompany } from "@/components/dashboard/add-company";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { MatchesChart, type ChartPoint } from "@/components/dashboard/matches-chart";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ProfilesSection, type ProfileRow } from "@/components/dashboard/profiles-section";
import { WatchList, type WatchRow } from "@/components/dashboard/watch-list";
import {
  ArrowRight,
  Building,
  Download,
  Target,
  Timer,
  Zap,
  type IconProps,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const CHART_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function pollingLabel(seconds: number): string {
  if (seconds >= 86400) return "daily";
  if (seconds >= 3600) return `${seconds / 3600}h`;
  return `${seconds / 60}m`;
}

function timeAgo(date: Date, now: number): string {
  const s = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  label,
  value,
  sub,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: (p: IconProps) => React.ReactElement;
}) {
  return (
    <div className="card-glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Icon className="h-[18px] w-[18px] shrink-0 text-accent-2" />
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.name) redirect("/onboarding");

  const limits = limitsFor(user.plan, user.planStatus);
  const tier = effectiveTier(user.plan, user.planStatus);
  const suspended = isPaymentSuspended(user.planStatus);
  // While payment-suspended, keep showing the plan they're actually subscribed
  // to (with a badge) rather than silently reading as plain Free.
  const planLabel = suspended ? PLAN_LIMITS[user.plan].label : limits.label;

  const [
    watchRows,
    watchCountRows,
    profileRows,
    recentRows,
    totalMatchesRows,
    dailyRows,
  ] = await Promise.all([
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
    // Distinct jobs (not notification rows — a job can fan out to multiple
    // channels) matched all-time, for the stats card.
    db
      .select({ value: sql<number>`count(distinct ${notifications.jobId})` })
      .from(notifications)
      .where(eq(notifications.userId, user.id)),
    // Same, grouped by day, for the chart.
    db
      .select({
        day: sql<string>`date_trunc('day', ${notifications.createdAt})::date`,
        value: sql<number>`count(distinct ${notifications.jobId})`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          sql`${notifications.createdAt} >= now() - interval '14 days'`,
        ),
      )
      .groupBy(sql`date_trunc('day', ${notifications.createdAt})::date`),
  ]);

  const now = Date.now();
  const activeWatches = watchCountRows[0]?.value ?? 0;
  const activeProfiles = profileRows.filter((p) => p.active).length;
  const profileList: ProfileRow[] = profileRows;
  const totalMatches = Number(totalMatchesRows[0]?.value ?? 0);

  const dayMap = new Map(dailyRows.map((r) => [String(r.day), Number(r.value)]));
  const chartData: ChartPoint[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    chartData.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: dayMap.get(key) ?? 0,
    });
  }
  const weekTotal = chartData.slice(-7).reduce((a, p) => a + p.value, 0);
  const prevWeekTotal = chartData.slice(0, 7).reduce((a, p) => a + p.value, 0);
  const weekDelta = weekTotal - prevWeekTotal;
  const fortnightTotal = weekTotal + prevWeekTotal;

  // Dedupe matched jobs across channels, keep the most recent few.
  const seen = new Set<string>();
  const recentJobs = recentRows
    .filter((r) => (seen.has(r.jobId) ? false : (seen.add(r.jobId), true)))
    .slice(0, 8);

  const watchList: WatchRow[] = watchRows.map((w) => ({
    id: w.id,
    companyName: w.companyName,
    atsProvider: w.atsProvider,
    atsSlug: w.atsSlug,
    keywordFilters: w.keywordFilters,
    locationFilter: w.locationFilter,
    active: w.active,
  }));

  const companiesUsage = suspended
    ? "Paused"
    : `${activeWatches}${limits.maxCompanies === null ? "" : ` / ${limits.maxCompanies}`}`;
  const profilesUsage = suspended
    ? "Paused"
    : `${activeProfiles}${limits.maxProfiles === null ? "" : ` / ${limits.maxProfiles}`}`;

  return (
    <>
      <main className="mx-auto max-w-[87.5rem] space-y-6 px-4 py-6 md:px-8 md:py-8">
        {suspended && (
          <div className="animate-enter flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-5">
            <p className="text-sm text-destructive">
              Your last payment failed. Tracking is paused and no alerts are going out until
              you update your payment method — you won&apos;t be charged again on the old card.
            </p>
            <a
              href="/billing"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Fix billing
            </a>
          </div>
        )}

        {/* KPI row */}
        <section
          data-tour="stats"
          aria-label="Your activity"
          className="animate-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Companies tracked"
            value={suspended ? "Paused" : String(activeWatches)}
            sub={
              limits.maxCompanies === null
                ? `Unlimited on ${planLabel}`
                : `of ${limits.maxCompanies} on ${planLabel}`
            }
            Icon={Building}
          />
          <StatCard
            label="Alert profiles"
            value={suspended ? "Paused" : String(activeProfiles)}
            sub={
              limits.maxProfiles === null
                ? "Unlimited profiles"
                : `of ${limits.maxProfiles} available`
            }
            Icon={Target}
          />
          <StatCard
            label="Jobs matched"
            value={totalMatches.toLocaleString("en-US")}
            sub="All-time, across every company you watch"
            Icon={Zap}
          />
          <StatCard
            label="This week"
            value={String(weekTotal)}
            sub={`${weekDelta >= 0 ? "+" : "−"}${Math.abs(weekDelta)} vs last week · ${pollingLabel(limits.pollIntervalSeconds)} polling`}
            Icon={Timer}
          />
        </section>

        {/* Chart + plan */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section
            className="card-glass animate-enter rounded-2xl p-6 lg:col-span-2"
            style={{ animationDelay: "60ms" }}
          >
            <PanelHeader
              title="Matches over time"
              description="New postings matched at the companies you watch, per day."
              action={
                <p className="shrink-0 text-right">
                  <span className="block text-xl font-semibold tracking-tight text-brand-text">
                    {fortnightTotal}
                  </span>
                  <span className="text-xs text-neutral-500">last 14 days</span>
                </p>
              }
            />
            <div className="mt-6">
              <MatchesChart data={chartData} />
            </div>
          </section>

          <div
            id="plan"
            data-tour="plan"
            className="animate-enter scroll-mt-24"
            style={{ animationDelay: "100ms" }}
          >
            <PlanCard
              planLabel={planLabel}
              isPaid={tier !== "free" || suspended}
              tier={tier}
              suspended={suspended}
              compact
              usage={{
                companies: companiesUsage,
                profiles: profilesUsage,
                polling: pollingLabel(limits.pollIntervalSeconds),
              }}
            />
          </div>
        </div>

        {/* Watched companies + recent matches */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            id="watching"
            className="card-glass animate-enter scroll-mt-24 rounded-2xl p-6"
            style={{ animationDelay: "140ms" }}
          >
            <PanelHeader
              title="Watched companies"
              description={`Tracking ${companiesUsage} — paste a careers URL to add one.`}
            />
            <div data-tour="watch" className="mt-5">
              <AddCompany />
            </div>
            <div data-tour="companies" className="mt-6">
              <WatchList watches={watchList} />
            </div>
          </section>

          <section
            data-tour="recent"
            className="card-glass animate-enter rounded-2xl p-6"
            style={{ animationDelay: "180ms" }}
          >
            <PanelHeader
              title="Recent matches"
              description="Latest postings at the companies you watch."
              action={
                limits.fullHistoryExport ? (
                  <a
                    href="/api/export/jobs"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </a>
                ) : undefined
              }
            />
            <div className="mt-5">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Nothing yet. New roles at your watched companies will show up here.
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentJobs.map((j) => {
                    const created = new Date(j.createdAt);
                    const isNew = now - created.getTime() < DAY_MS;
                    return (
                      <li key={j.jobId} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium ring-1 ring-white/[0.08]"
                        >
                          {j.companyName.trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          {/* Untrusted ATS text — rendered as escaped JSX text. */}
                          <div className="flex items-center gap-2">
                            <a
                              href={j.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="truncate text-sm font-medium hover:text-brand-text hover:underline"
                            >
                              {j.title}
                            </a>
                            {isNew && (
                              <span className="shrink-0 rounded-sm bg-accent px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                                New
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-neutral-500">
                            {j.companyName}
                            {j.location ? ` · ${j.location}` : ""}
                          </p>
                        </div>
                        <time
                          dateTime={created.toISOString()}
                          className="shrink-0 font-mono text-[11px] text-neutral-500"
                        >
                          {timeAgo(created, now)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href="/jobs"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text transition-colors hover:underline"
              >
                View full job history <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>

        {/* Alert profiles */}
        <section
          data-tour="profiles"
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "220ms" }}
        >
          <PanelHeader
            title={`Alert profiles (${profilesUsage})`}
            description={`Saved keyword filters for your alerts.${
              limits.crossCompanySearch
                ? " Cross-company profiles match every indexed company."
                : ""
            }`}
          />
          <div className="mt-5">
            <ProfilesSection
              profiles={profileList}
              canUseCrossCompany={limits.crossCompanySearch}
            />
          </div>
        </section>
      </main>
      <DashboardTour active={!user.dashboardTourDismissedAt} />
    </>
  );
}
