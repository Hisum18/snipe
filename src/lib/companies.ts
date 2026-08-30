import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, seenJobs, type Company } from "@/db/schema";
import { fetchAtsJobs, fetchCompanyName, type AtsProvider } from "@/lib/ats";

/**
 * Find or create the canonical company row for (provider, slug).
 *
 * On FIRST creation we fetch the board's current jobs and record them all in
 * seen_jobs as a baseline WITHOUT notifying anyone — so a new watcher is only
 * alerted about roles posted after they started watching, never the existing
 * backlog. If the board doesn't exist, fetchAtsJobs throws and no company row
 * is created.
 */
export async function getOrCreateCompany(
  provider: AtsProvider,
  slug: string,
): Promise<Company> {
  const existing = await db
    .select()
    .from(companies)
    .where(and(eq(companies.atsProvider, provider), eq(companies.atsSlug, slug)))
    .limit(1);
  if (existing[0]) return existing[0];

  // New company: validate the board by fetching it, then baseline.
  const jobs = await fetchAtsJobs(provider, slug);
  const name = await fetchCompanyName(provider, slug);

  const inserted = await db
    .insert(companies)
    .values({ name, atsProvider: provider, atsSlug: slug })
    .onConflictDoNothing()
    .returning();

  if (!inserted[0]) {
    // Lost a race with a concurrent add; load the winner's row.
    const row = await db
      .select()
      .from(companies)
      .where(
        and(eq(companies.atsProvider, provider), eq(companies.atsSlug, slug)),
      )
      .limit(1);
    if (!row[0]) throw new Error("Company row vanished after conflict");
    return row[0];
  }

  const company = inserted[0];

  if (jobs.length > 0) {
    await db
      .insert(seenJobs)
      .values(
        jobs.map((j) => ({
          companyId: company.id,
          externalJobId: j.externalId,
          title: j.title,
          location: j.location,
          url: j.url,
        })),
      )
      .onConflictDoNothing();
  }

  const now = new Date();
  await db
    .update(companies)
    .set({ lastPolledAt: now, nextEarliestPollAt: null, consecutiveErrors: 0 })
    .where(eq(companies.id, company.id));

  return { ...company, lastPolledAt: now };
}
