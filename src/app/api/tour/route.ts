import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { writeByUser } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/tour — mark the dashboard walkthrough dismissed (skipped or
// finished) so it never shows again for this account.
export async function POST() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  await db
    .update(users)
    .set({ dashboardTourDismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return json({ ok: true });
}
