import "server-only";

import { getServerEnv } from "@/env";
import { safeEqual } from "@/lib/auth/crypto";

/**
 * Vercel cron routes are publicly reachable URLs. Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` to scheduled invocations when the
 * CRON_SECRET env var is set; we reject anything that doesn't match so nobody
 * can trigger polling on demand. Constant-time comparison avoids leaking the
 * secret via timing.
 */
export function isAuthorizedCron(req: Request): boolean {
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${getServerEnv().CRON_SECRET}`;
  return safeEqual(provided, expected);
}
