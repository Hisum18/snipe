import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, watches } from "@/db/schema";
import {
  HARD_MAX_WATCHES_PER_USER,
  limitsFor,
} from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { AtsFetchError, detectAts } from "@/lib/ats";
import { getOrCreateCompany } from "@/lib/companies";
import { apiByUser, writeByUser } from "@/lib/ratelimit";
import { addWatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

// GET /api/watches — list the caller's watches (scoped to their user id).
export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(apiByUser(), user.id);
  if (limited) return limited;

  const rows = await db
    .select({
      id: watches.id,
      keywordFilters: watches.keywordFilters,
      locationFilter: watches.locationFilter,
      active: watches.active,
      createdAt: watches.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      atsProvider: companies.atsProvider,
      atsSlug: companies.atsSlug,
    })
    .from(watches)
    .innerJoin(companies, eq(companies.id, watches.companyId))
    .where(eq(watches.userId, user.id))
    .orderBy(desc(watches.createdAt));

  return json({ watches: rows });
}

// POST /api/watches — add a company to watch from a pasted careers URL.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = addWatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  // Parse provider+slug from the pasted URL. We NEVER fetch the pasted URL.
  const detected = detectAts(parsed.data.careersUrl);
  if (!detected) {
    return json(
      { error: "That doesn't look like a Greenhouse, Lever, or Ashby careers URL." },
      422,
    );
  }

  // Enforce the plan limit AND the absolute hard cap server-side.
  const limits = limitsFor(user.plan, user.planStatus);
  const planCap = limits.maxCompanies ?? HARD_MAX_WATCHES_PER_USER;
  const cap = Math.min(planCap, HARD_MAX_WATCHES_PER_USER);

  const countRows = await db
    .select({ value: count() })
    .from(watches)
    .where(and(eq(watches.userId, user.id), eq(watches.active, true)));
  const activeCount = countRows[0]?.value ?? 0;

  if (activeCount >= cap) {
    return json(
      {
        error: `You've reached your plan limit of ${cap} watched companies. Upgrade or remove one.`,
        code: "PLAN_LIMIT",
      },
      403,
    );
  }

  let company;
  try {
    company = await getOrCreateCompany(detected.provider, detected.slug);
  } catch (err) {
    if (err instanceof AtsFetchError) {
      return json(
        { error: "We couldn't reach a job board at that URL. Double-check it." },
        422,
      );
    }
    throw err;
  }

  const inserted = await db
    .insert(watches)
    .values({
      userId: user.id,
      companyId: company.id,
      keywordFilters: parsed.data.keywordFilters,
      locationFilter: parsed.data.locationFilter ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted[0]) {
    return json({ error: "You're already watching this company." }, 409);
  }

  return json(
    {
      watch: {
        id: inserted[0].id,
        company: { id: company.id, name: company.name, provider: company.atsProvider },
      },
    },
    201,
  );
}
