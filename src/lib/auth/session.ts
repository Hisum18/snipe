import "server-only";

import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { generateToken, safeEqual, sign } from "./crypto";

const COOKIE_NAME = "snipe_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cookieValue(token: string): string {
  return `${token}.${sign(token)}`;
}

function parseCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const token = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  if (!safeEqual(mac, sign(token))) return null; // tampered / forged
  return token;
}

/**
 * Create a fresh session for a user and set the cookie. Called on every login
 * so the session token rotates (old ones remain valid until they expire or the
 * user logs out; callers that want strict rotation can destroy first).
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ sessionToken: token, userId, expires });

  const store = await cookies();
  store.set(COOKIE_NAME, cookieValue(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/**
 * Resolve the current user from the session cookie. The query is scoped to a
 * non-expired session; a valid cookie for a deleted session returns null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = parseCookie(store.get(COOKIE_NAME)?.value);
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

/** Destroy the current session server-side AND clear the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = parseCookie(store.get(COOKIE_NAME)?.value);
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  }
  store.delete(COOKIE_NAME);
}

/** Guard for server components / route handlers that require auth. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
