import { and, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, notifications, seenJobs } from "@/db/schema";
import { limitsFor } from "@/config/plans";
import { Briefcase, Download, Search } from "@/components/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);

  const limits = limitsFor(user.plan, user.planStatus);

  const filters = [eq(notifications.userId, user.id)];
  if (query) {
    filters.push(
      or(ilike(seenJobs.title, `%${query}%`), ilike(companies.name, `%${query}%`))!,
    );
  }
  const where = and(...filters);

  // Distinct jobs (not notification rows — a job can fan out to multiple
  // channels), same de-dup rule as the dashboard's recent list, but paged
  // server-side instead of over a fixed in-memory buffer. Postgres requires
  // DISTINCT ON's own column to lead the ORDER BY, so the "one row per job"
  // step runs as a subquery — the outer query re-sorts by recency and applies
  // the actual page window.
  const distinctJobs = db
    .selectDistinctOn([seenJobs.id], {
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
    .where(where)
    .orderBy(seenJobs.id, desc(notifications.createdAt))
    .as("distinct_jobs");

  const rows = await db
    .select()
    .from(distinctJobs)
    .orderBy(desc(distinctJobs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="animate-enter mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mt-1 text-sm text-neutral-400">
            Every job that has ever matched your filters.
          </p>
        </div>
        {limits.fullHistoryExport && (
          <a
            href="/api/export/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        )}
      </div>

      <form
        method="get"
        className="animate-enter relative mb-6"
        style={{ animationDelay: "40ms" }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by title or company…"
          aria-label="Search job history"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
        />
      </form>

      <section
        className="card-glass animate-enter rounded-2xl p-6"
        style={{ animationDelay: "100ms" }}
      >
        <SectionHeading icon={Briefcase} title="Matches" />

        <div className="mt-4">
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-400">
              {query
                ? "No matches for that search."
                : "Nothing yet. New roles at your watched companies will show up here."}
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {rows.map((j) => (
                <li
                  key={j.jobId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 transition-colors hover:border-white/15"
                >
                  <div className="min-w-0">
                    {/* Untrusted ATS text — rendered as escaped JSX text. */}
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="truncate font-normal text-white hover:text-brand-text hover:underline"
                    >
                      {j.title}
                    </a>
                    <div className="truncate text-xs text-neutral-400">
                      {j.companyName}
                      {j.location ? ` · ${j.location}` : ""}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-neutral-400 tabular">
                    {new Date(j.createdAt).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/jobs?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) })}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-neutral-300 hover:bg-white/[0.06] hover:text-white"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-neutral-500">Page {page}</span>
          {rows.length === PAGE_SIZE ? (
            <Link
              href={`/jobs?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) })}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-neutral-300 hover:bg-white/[0.06] hover:text-white"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </main>
  );
}
