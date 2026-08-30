import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  profiles,
  seenJobs,
  users,
  watches,
  type SeenJob,
  type User,
} from "@/db/schema";
import { POLL_INTERVAL_SECONDS, effectiveTier } from "@/config/plans";
import { AtsFetchError, fetchAtsJobs, type AtsProvider } from "@/lib/ats";
import { jobMatchesFilter } from "@/lib/match";
import { dispatchPending, enqueueNotifications } from "@/lib/notify";
import { log } from "@/lib/log";

const MAX_COMPANIES_PER_RUN = 100;
const BACKOFF_BASE_SECONDS = 60;
const BACKOFF_MAX_SECONDS = 6 * 60 * 60; // 6 hours

export function backoffSeconds(consecutiveErrors: number): number {
  const secs = BACKOFF_BASE_SECONDS * 2 ** Math.max(0, consecutiveErrors - 1);
  return Math.min(secs, BACKOFF_MAX_SECONDS);
}

interface DueCompany {
  id: string;
  provider: AtsProvider;
  slug: string;
  consecutiveErrors: number;
}

/**
 * Companies eligible to poll this run. A company's cadence is set by the
 * FASTEST plan watching it (min poll interval across active watchers), and is
 * held back by exponential backoff after ATS errors.
 */
async function getDueCompanies(): Promise<DueCompany[]> {
  // Fastest plan watching a company sets its cadence. Computed in SQL so we
  // don't load every active watch into memory each run. The CASE mirrors
  // effectiveTier() and pulls its numbers from POLL_INTERVAL_SECONDS.
  // Interval values are cast to int so Postgres can type the comparison against
  // extract(epoch ...) (double); an untyped bind parameter yields "no operator".
  const minIntervalSql = sql<number>`min(case
      when ${users.planStatus} in ('active','trialing') and ${users.plan} = 'max' then ${POLL_INTERVAL_SECONDS.max}::int
      when ${users.planStatus} in ('active','trialing') and ${users.plan} = 'pro' then ${POLL_INTERVAL_SECONDS.pro}::int
      else ${POLL_INTERVAL_SECONDS.free}::int end)`;

  const rows = await db
    .select({
      id: companies.id,
      provider: companies.atsProvider,
      slug: companies.atsSlug,
      consecutiveErrors: companies.consecutiveErrors,
    })
    .from(watches)
    .innerJoin(companies, eq(companies.id, watches.companyId))
    .innerJoin(users, eq(users.id, watches.userId))
    .where(
      and(
        eq(watches.active, true),
        // Respect backoff.
        sql`(${companies.nextEarliestPollAt} is null or ${companies.nextEarliestPollAt} <= now())`,
      ),
    )
    .groupBy(
      companies.id,
      companies.atsProvider,
      companies.atsSlug,
      companies.consecutiveErrors,
      companies.lastPolledAt,
    )
    // Due when never polled, or elapsed >= the fastest watcher's interval.
    .having(
      sql`${companies.lastPolledAt} is null or extract(epoch from (now() - ${companies.lastPolledAt})) >= ${minIntervalSql}`,
    )
    .orderBy(sql`${companies.lastPolledAt} asc nulls first`)
    .limit(MAX_COMPANIES_PER_RUN);

  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    slug: r.slug,
    consecutiveErrors: r.consecutiveErrors,
  }));
}

/** Insert only genuinely-new jobs; returns the rows that were inserted. */
async function insertNewJobs(
  companyId: string,
  jobs: { externalId: string; title: string; location: string | null; url: string }[],
): Promise<SeenJob[]> {
  if (jobs.length === 0) return [];
  const inserted = await db
    .insert(seenJobs)
    .values(
      jobs.map((j) => ({
        companyId,
        externalJobId: j.externalId,
        title: j.title,
        location: j.location,
        url: j.url,
      })),
    )
    .onConflictDoNothing()
    .returning();
  return inserted;
}

async function recordSuccess(companyId: string): Promise<void> {
  await db
    .update(companies)
    .set({ lastPolledAt: new Date(), nextEarliestPollAt: null, consecutiveErrors: 0 })
    .where(eq(companies.id, companyId));
}

async function recordFailure(company: DueCompany): Promise<void> {
  const next = company.consecutiveErrors + 1;
  const delayMs = backoffSeconds(next) * 1000;
  await db
    .update(companies)
    .set({
      lastPolledAt: new Date(),
      consecutiveErrors: next,
      nextEarliestPollAt: new Date(Date.now() + delayMs),
    })
    .where(eq(companies.id, company.id));
}

/** Recipients for the new jobs at a single company (watch- and profile-based). */
async function watchRecipients(
  companyId: string,
  newJobs: SeenJob[],
  acc: Map<string, { user: User; jobId: string }>,
): Promise<void> {
  const watchRows = await db
    .select({ user: users, keywordFilters: watches.keywordFilters, locationFilter: watches.locationFilter })
    .from(watches)
    .innerJoin(users, eq(users.id, watches.userId))
    .where(and(eq(watches.companyId, companyId), eq(watches.active, true)));

  if (watchRows.length === 0) return;

  const userIds = [...new Set(watchRows.map((w) => w.user.id))];
  // Non-cross-company profiles broaden matching over the user's watched companies.
  const profileRows = userIds.length
    ? await db
        .select({ userId: profiles.userId, keywordFilters: profiles.keywordFilters, locationFilter: profiles.locationFilter })
        .from(profiles)
        .where(and(eq(profiles.active, true), eq(profiles.crossCompany, false)))
    : [];
  const profilesByUser = new Map<string, { keywordFilters: string[]; locationFilter: string | null }[]>();
  for (const p of profileRows) {
    if (!userIds.includes(p.userId)) continue;
    const list = profilesByUser.get(p.userId) ?? [];
    list.push({ keywordFilters: p.keywordFilters, locationFilter: p.locationFilter });
    profilesByUser.set(p.userId, list);
  }

  for (const job of newJobs) {
    const jobLike = { title: job.title, location: job.location };
    for (const w of watchRows) {
      const matched =
        jobMatchesFilter(jobLike, { keywordFilters: w.keywordFilters, locationFilter: w.locationFilter }) ||
        (profilesByUser.get(w.user.id) ?? []).some((p) => jobMatchesFilter(jobLike, p));
      if (matched) acc.set(`${w.user.id}:${job.id}`, { user: w.user, jobId: job.id });
    }
  }
}

/** Max-tier cross-company profiles match any new job regardless of watches. */
async function crossCompanyRecipients(
  allNewJobs: SeenJob[],
  acc: Map<string, { user: User; jobId: string }>,
): Promise<void> {
  if (allNewJobs.length === 0) return;
  const rows = await db
    .select({ user: users, keywordFilters: profiles.keywordFilters, locationFilter: profiles.locationFilter })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(and(eq(profiles.active, true), eq(profiles.crossCompany, true)));

  const crossProfiles = rows.filter((r) => effectiveTier(r.user.plan, r.user.planStatus) === "max");
  if (crossProfiles.length === 0) return;

  for (const job of allNewJobs) {
    const jobLike = { title: job.title, location: job.location };
    for (const p of crossProfiles) {
      if (jobMatchesFilter(jobLike, { keywordFilters: p.keywordFilters, locationFilter: p.locationFilter })) {
        acc.set(`${p.user.id}:${job.id}`, { user: p.user, jobId: job.id });
      }
    }
  }
}

export interface PollResult {
  companiesPolled: number;
  newJobs: number;
  recipients: number;
  dispatched: number;
  errors: number;
}

/** Full poll cycle: invoked by the cron route. */
export async function pollDueCompanies(): Promise<PollResult> {
  const due = await getDueCompanies();
  const result: PollResult = {
    companiesPolled: 0,
    newJobs: 0,
    recipients: 0,
    dispatched: 0,
    errors: 0,
  };

  const newByCompany: { companyId: string; jobs: SeenJob[] }[] = [];

  for (const company of due) {
    result.companiesPolled += 1;
    try {
      const jobs = await fetchAtsJobs(company.provider, company.slug);
      const inserted = await insertNewJobs(company.id, jobs);
      await recordSuccess(company.id);
      if (inserted.length > 0) {
        newByCompany.push({ companyId: company.id, jobs: inserted });
        result.newJobs += inserted.length;
      }
    } catch (err) {
      result.errors += 1;
      // Log the failure with safe fields only (no ATS payloads).
      log.warn("poll_company_failed", {
        companyId: company.id,
        provider: company.provider,
        status: err instanceof AtsFetchError ? err.status : undefined,
        retryable: err instanceof AtsFetchError ? err.retryable : undefined,
      });
      // Either way, back off so one bad board can't wedge the run.
      await recordFailure(company);
    }
  }

  if (newByCompany.length > 0) {
    const acc = new Map<string, { user: User; jobId: string }>();
    const allNew = newByCompany.flatMap((n) => n.jobs);
    for (const { companyId, jobs } of newByCompany) {
      await watchRecipients(companyId, jobs, acc);
    }
    await crossCompanyRecipients(allNew, acc);

    const recipients = [...acc.values()];
    result.recipients = recipients.length;
    await enqueueNotifications(recipients);
  }

  // Send instant-tier notifications now; digest tier waits for the daily cron.
  result.dispatched = await dispatchPending("instant");
  return result;
}
