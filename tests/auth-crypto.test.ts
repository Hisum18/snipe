import { describe, expect, it } from "vitest";

import { generateToken, hashToken, safeEqual, sign } from "@/lib/auth/crypto";
import { makeUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { isAuthorizedCron } from "@/lib/cron";

describe("magic-link token crypto", () => {
  it("generates high-entropy, unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    // 32 bytes base64url ~ 43 chars
    expect(a.length).toBeGreaterThanOrEqual(42);
  });
  it("hashes deterministically and hides the raw token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).toHaveLength(64); // sha256 hex
  });
  it("safeEqual compares correctly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("unsubscribe tokens", () => {
  it("verifies only the matching user's token", () => {
    const t = makeUnsubscribeToken("user-1");
    expect(verifyUnsubscribeToken("user-1", t)).toBe(true);
    expect(verifyUnsubscribeToken("user-2", t)).toBe(false);
    expect(verifyUnsubscribeToken("user-1", t + "x")).toBe(false);
  });
  it("is not forgeable without the secret", () => {
    // A signature over different content must not validate.
    expect(verifyUnsubscribeToken("user-1", sign("unsub:email:user-2"))).toBe(false);
  });
});

describe("cron authorization", () => {
  function req(auth?: string): Request {
    const headers = new Headers();
    if (auth !== undefined) headers.set("authorization", auth);
    return new Request("https://snipe.test/api/cron/poll", { headers });
  }
  it("accepts the correct bearer secret", () => {
    expect(isAuthorizedCron(req(`Bearer ${process.env.CRON_SECRET}`))).toBe(true);
  });
  it("rejects missing / wrong secrets", () => {
    expect(isAuthorizedCron(req())).toBe(false);
    expect(isAuthorizedCron(req("Bearer wrong"))).toBe(false);
    expect(isAuthorizedCron(req(process.env.CRON_SECRET!))).toBe(false); // no "Bearer "
  });
});
