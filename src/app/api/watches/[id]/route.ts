import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { watches } from "@/db/schema";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { writeByUser } from "@/lib/ratelimit";
import { updateWatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

// PATCH /api/watches/:id — update this watch's filters. Scoped by user id IN the
// query, so user A can never modify user B's watch even by guessing the id.
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
  const parsed = updateWatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  // Only whitelisted fields are set — no spreading of user input (no mass assignment).
  const updates: { keywordFilters?: string[]; locationFilter?: string | null } = {};
  if (parsed.data.keywordFilters !== undefined) {
    updates.keywordFilters = parsed.data.keywordFilters;
  }
  if (parsed.data.locationFilter !== undefined) {
    updates.locationFilter = parsed.data.locationFilter ?? null;
  }
  if (Object.keys(updates).length === 0) {
    return json({ error: "Nothing to update" }, 400);
  }

  const updated = await db
    .update(watches)
    .set(updates)
    .where(and(eq(watches.id, id), eq(watches.userId, user.id)))
    .returning({ id: watches.id });

  if (!updated[0]) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}

// DELETE /api/watches/:id — remove this watch. Scoped by user id IN the query.
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
    .delete(watches)
    .where(and(eq(watches.id, id), eq(watches.userId, user.id)))
    .returning({ id: watches.id });

  if (!deleted[0]) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
