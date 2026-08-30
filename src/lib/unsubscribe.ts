import "server-only";

import { getServerEnv } from "@/env";
import { safeEqual, sign } from "@/lib/auth/crypto";

/**
 * Stateless one-click unsubscribe tokens: HMAC(userId) with the app secret. No
 * storage needed, not guessable, and scoped to email opt-out only.
 */
const PURPOSE = "unsub:email:";

export function makeUnsubscribeToken(userId: string): string {
  return sign(PURPOSE + userId);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  return safeEqual(token, makeUnsubscribeToken(userId));
}

export function unsubscribeUrl(userId: string): string {
  const url = new URL("/api/unsubscribe", getServerEnv().APP_URL);
  url.searchParams.set("u", userId);
  url.searchParams.set("token", makeUnsubscribeToken(userId));
  return url.toString();
}
