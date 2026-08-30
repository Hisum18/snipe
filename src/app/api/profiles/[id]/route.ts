import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { limitsFor } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { writeByUser } from "@/lib/ratelimit";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return json({ error: "Not found" }, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = profileSchema.partial().safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  if (parsed.data.crossCompany && !limitsFor(user.plan, user.planStatus).crossCompanySearch) {
    return json({ error: "Cross-company search is a Max feature.", code: "PLAN_LIMIT" }, 403);
  }

  // Explicit whitelist — never spread request body into the update.
  const updates: {
    name?: string;
    keywordFilters?: string[];
    locationFilter?: string | null;
    crossCompany?: boolean;
  } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.keywordFilters !== undefined) updates.keywordFilters = parsed.data.keywordFilters;
  if (parsed.data.locationFilter !== undefined) updates.locationFilter = parsed.data.locationFilter ?? null;
  if (parsed.data.crossCompany !== undefined) updates.crossCompany = parsed.data.crossCompany;
  if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);

  const updated = await db
    .update(profiles)
    .set(updates)
    .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)))
    .returning({ id: profiles.id });

  if (!updated[0]) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return json({ error: "Not found" }, 404);

  const deleted = await db
    .delete(profiles)
    .where(and(eq(profiles.id, id), eq(profiles.userId, user.id)))
    .returning({ id: profiles.id });

  if (!deleted[0]) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
