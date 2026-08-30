import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/env";

/**
 * Crypto primitives for magic-link tokens and session cookies.
 *
 * - Magic-link tokens are 32 bytes of CSPRNG randomness, sent to the user in
 *   the clear (in the link) but stored ONLY as a SHA-256 hash. Lookup hashes
 *   the presented token and compares, so a DB leak never yields usable links.
 * - Session tokens are likewise 32 random bytes; the cookie carries the token
 *   plus an HMAC so a tampered cookie is rejected before any DB lookup.
 */

/** 32 bytes -> 43-char base64url string. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** HMAC-SHA256 of a value with the app secret, base64url encoded. */
export function sign(value: string): string {
  return createHmac("sha256", getServerEnv().AUTH_SECRET)
    .update(value)
    .digest("base64url");
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
