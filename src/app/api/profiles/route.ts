import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { HARD_MAX_PROFILES_PER_USER, limitsFor } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { apiByUser, writeByUser } from "@/lib/ratelimit";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(apiByUser(), user.id);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .orderBy(desc(profiles.createdAt));
  return json({ profiles: rows });
}

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
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const limits = limitsFor(user.plan, user.planStatus);

  // Cross-company search is a Max-tier entitlement — enforced server-side.
  if (parsed.data.crossCompany && !limits.crossCompanySearch) {
    return json(
      { error: "Cross-company search is available on the Max plan.", code: "PLAN_LIMIT" },
      403,
    );
  }

  const cap = Math.min(limits.maxProfiles ?? HARD_MAX_PROFILES_PER_USER, HARD_MAX_PROFILES_PER_USER);
  const countRows = await db
    .select({ value: count() })
    .from(profiles)
    .where(and(eq(profiles.userId, user.id), eq(profiles.active, true)));
  if ((countRows[0]?.value ?? 0) >= cap) {
    return json(
      { error: `You've reached your plan limit of ${cap} profile(s).`, code: "PLAN_LIMIT" },
      403,
    );
  }

  const inserted = await db
    .insert(profiles)
    .values({
      userId: user.id,
      name: parsed.data.name,
      keywordFilters: parsed.data.keywordFilters,
      locationFilter: parsed.data.locationFilter ?? null,
      crossCompany: parsed.data.crossCompany,
    })
    .returning({ id: profiles.id });

  return json({ profile: { id: inserted[0]!.id } }, 201);
}
