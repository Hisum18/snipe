import "server-only";

import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "./redis";

/**
 * Named rate limiters, all backed by Upstash. We key by IP and/or user id
 * depending on the limiter. Every one fails OPEN only for infra errors we
 * cannot control, but the magic-link and signup limiters are treated as
 * critical: callers should deny on limiter failure there.
 */

const limiters = new Map<string, Ratelimit>();

function make(name: string, limiter: Ratelimit): Ratelimit {
  const existing = limiters.get(name);
  if (existing) return existing;
  limiters.set(name, limiter);
  return limiter;
}

/** Magic-link sends: 5 per hour per email AND (separately) per IP. */
export function magicLinkByEmail(): Ratelimit {
  return make(
    "magic-email",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:magic:email",
      analytics: false,
    }),
  );
}

export function magicLinkByIp(): Ratelimit {
  return make(
    "magic-ip",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:magic:ip",
      analytics: false,
    }),
  );
}

/** Magic-link callback verification attempts per IP (anti-DoS / brute force). */
export function authCallbackByIp(): Ratelimit {
  return make(
    "callback-ip",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:callback:ip",
      analytics: false,
    }),
  );
}

/** Generic authenticated API limiter, keyed by user id. */
export function apiByUser(): Ratelimit {
  return make(
    "api-user",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:api:user",
      analytics: false,
    }),
  );
}

/** Signup / add-company writes are stricter to limit cost amplification. */
export function writeByUser(): Ratelimit {
  return make(
    "write-user",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:write:user",
      analytics: false,
    }),
  );
}

/** SMS verification-code sends per user (SMS costs money — keep it tight). */
export function smsSendByUser(): Ratelimit {
  return make(
    "sms-send-user",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "rl:sms:send",
      analytics: false,
    }),
  );
}

/** SMS code verification attempts per user (anti brute-force on the 6-digit code). */
export function smsVerifyByUser(): Ratelimit {
  return make(
    "sms-verify-user",
    new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "rl:sms:verify",
      analytics: false,
    }),
  );
}

/** Extract the best-effort client IP from request headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
