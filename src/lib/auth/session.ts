import "server-only";

import { sql } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

/**
 * Resolve the current app user from the Auth.js session. Auth.js (JWT strategy)
 * owns the session cookie; this looks up our full user row (plan, billing,
 * delivery settings) by the session email. A valid token for a deleted account
 * resolves to null because no row matches.
 *
 * Kept as `getCurrentUser()` so every existing call site (layout, dashboard,
 * pricing, api guard) works unchanged after the Auth.js migration.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);

  return rows[0] ?? null;
}

/** Guard for server components / route handlers that require auth. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
