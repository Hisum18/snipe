import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { profiles, users, watches, type User } from "@/db/schema";
import {
  HARD_MAX_PROFILES_PER_USER,
  HARD_MAX_WATCHES_PER_USER,
  limitsFor,
} from "@/config/plans";

/**
 * Reconcile a user's watches to their current plan limit. On downgrade we keep
 * the OLDEST N active and deactivate the rest (never delete); on upgrade the
 * previously-deactivated ones reactivate, oldest first. Idempotent.
 */
export async function reconcileWatchesToPlan(user: User): Promise<void> {
  const limits = limitsFor(user.plan, user.planStatus);
  const cap = Math.min(limits.maxCompanies ?? HARD_MAX_WATCHES_PER_USER, HARD_MAX_WATCHES_PER_USER);

  const rows = await db
    .select({ id: watches.id })
    .from(watches)
    .where(eq(watches.userId, user.id))
    .orderBy(asc(watches.createdAt));

  const keepActive = rows.slice(0, cap).map((r) => r.id);
  const deactivate = rows.slice(cap).map((r) => r.id);

  if (keepActive.length > 0) {
    await db.update(watches).set({ active: true }).where(inArray(watches.id, keepActive));
  }
  if (deactivate.length > 0) {
    await db.update(watches).set({ active: false }).where(inArray(watches.id, deactivate));
  }
}

/** Same policy for notification profiles against the plan's profile limit. */
export async function reconcileProfilesToPlan(user: User): Promise<void> {
  const limits = limitsFor(user.plan, user.planStatus);
  const cap = Math.min(limits.maxProfiles ?? HARD_MAX_PROFILES_PER_USER, HARD_MAX_PROFILES_PER_USER);

  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .orderBy(asc(profiles.createdAt));

  const keepActive = rows.slice(0, cap).map((r) => r.id);
  const deactivate = rows.slice(cap).map((r) => r.id);

  if (keepActive.length > 0) {
    await db.update(profiles).set({ active: true }).where(inArray(profiles.id, keepActive));
  }
  if (deactivate.length > 0) {
    await db.update(profiles).set({ active: false }).where(inArray(profiles.id, deactivate));
  }
}

/** Load a user by id (used by the webhook after resolving the customer). */
export async function loadUser(userId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}
