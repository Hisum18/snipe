import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { users, type User } from "@/db/schema";

/**
 * Find or create a user by (lowercased) email. Idempotent and race-safe via the
 * case-insensitive unique index on lower(email). Newly created users are NOT
 * marked verified — verification happens when they redeem a magic link.
 */
export async function getOrCreateUserByEmail(email: string): Promise<User> {
  await db
    .insert(users)
    .values({ email })
    .onConflictDoNothing();

  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!rows[0]) {
    // Extremely unlikely (insert + select in same request); surface loudly.
    throw new Error("Failed to load user after upsert");
  }
  return rows[0];
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: new Date(), updatedAt: new Date() })
    .where(sql`${users.id} = ${userId}`);
}
