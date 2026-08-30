import "server-only";

import { NextResponse } from "next/server";
import type { Ratelimit } from "@upstash/ratelimit";

import { getCurrentUser } from "@/lib/auth/session";
import type { User } from "@/db/schema";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Resolve the session user or return a 401 response to short-circuit with. */
export async function requireApiUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: json({ error: "Unauthorized" }, 401) };
  return { user };
}

/**
 * Apply a per-user rate limit. Returns a 429 response if over the limit, or
 * null to continue. Fails OPEN on limiter infra errors for authenticated
 * routes (a transient Redis blip shouldn't lock out a logged-in user), which
 * is acceptable because these routes are already gated by a valid session.
 */
export async function enforceRateLimit(
  limiter: Ratelimit,
  key: string,
): Promise<NextResponse | null> {
  try {
    const res = await limiter.limit(key);
    if (!res.success) {
      return json({ error: "Too many requests. Slow down." }, 429);
    }
  } catch {
    // fail open
  }
  return null;
}
