import { describe, expect, it } from "vitest";

import { backoffSeconds } from "@/lib/poller";
import { POLL_INTERVAL_SECONDS } from "@/config/plans";

describe("backoffSeconds", () => {
  it("grows exponentially from a 60s base", () => {
    expect(backoffSeconds(0)).toBe(60);
    expect(backoffSeconds(1)).toBe(60);
    expect(backoffSeconds(2)).toBe(120);
    expect(backoffSeconds(3)).toBe(240);
    expect(backoffSeconds(4)).toBe(480);
  });
  it("caps at 6 hours", () => {
    expect(backoffSeconds(50)).toBe(6 * 60 * 60);
  });
});

describe("POLL_INTERVAL_SECONDS", () => {
  it("matches the documented per-tier cadence the poller SQL relies on", () => {
    expect(POLL_INTERVAL_SECONDS.free).toBe(86400);
    expect(POLL_INTERVAL_SECONDS.pro).toBe(300);
    expect(POLL_INTERVAL_SECONDS.max).toBe(60);
  });
});
