import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, seenJobs, watches } from "@/db/schema";
import { effectiveTier } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { apiByUser } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/export/jobs — full job history (all roles seen at the companies the
// user watches) as CSV. Max-tier only, enforced server-side.
export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (effectiveTier(user.plan, user.planStatus) !== "max") {
    return json({ error: "CSV export is available on the Max plan." }, 403);
  }

  const limited = await enforceRateLimit(apiByUser(), user.id);
  if (limited) return limited;

  const rows = await db
    .selectDistinct({
      companyName: companies.name,
      title: seenJobs.title,
      location: seenJobs.location,
      url: seenJobs.url,
      firstSeenAt: seenJobs.firstSeenAt,
    })
    .from(seenJobs)
    .innerJoin(companies, eq(companies.id, seenJobs.companyId))
    .innerJoin(watches, eq(watches.companyId, seenJobs.companyId))
    .where(eq(watches.userId, user.id))
    .orderBy(desc(seenJobs.firstSeenAt))
    .limit(10000);

  const csv = toCsv(
    ["Company", "Title", "Location", "URL", "First seen"],
    rows.map((r) => [
      r.companyName,
      r.title,
      r.location ?? "",
      r.url,
      r.firstSeenAt.toISOString(),
    ]),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="snipe-jobs.csv"',
      "cache-control": "no-store",
    },
  });
}
