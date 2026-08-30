import { describe, expect, it } from "vitest";

import {
  effectiveTier,
  limitsFor,
  priceIdFor,
  tierForPriceId,
} from "@/config/plans";

describe("effectiveTier", () => {
  it("keeps paid tier only for active/trialing", () => {
    expect(effectiveTier("pro", "active")).toBe("pro");
    expect(effectiveTier("max", "trialing")).toBe("max");
  });
  it("falls back to free for past_due/canceled/etc (no lockout)", () => {
    expect(effectiveTier("pro", "past_due")).toBe("free");
    expect(effectiveTier("max", "canceled")).toBe("free");
    expect(effectiveTier("pro", "unpaid")).toBe("free");
  });
  it("free stays free", () => {
    expect(effectiveTier("free", "active")).toBe("free");
  });
});

describe("price map <-> tier", () => {
  it("resolves configured price ids to tiers", () => {
    expect(tierForPriceId("price_pro_monthly")).toEqual({ tier: "pro", interval: "monthly" });
    expect(tierForPriceId("price_max_annual")).toEqual({ tier: "max", interval: "annual" });
  });
  it("returns null for unknown price ids (fail closed)", () => {
    expect(tierForPriceId("price_unknown")).toBeNull();
    expect(tierForPriceId("")).toBeNull();
  });
  it("priceIdFor is the inverse", () => {
    expect(priceIdFor("pro", "monthly")).toBe("price_pro_monthly");
    expect(priceIdFor("max", "annual")).toBe("price_max_annual");
  });
});

describe("limitsFor", () => {
  it("gives free limits to a downgraded past_due pro user", () => {
    const l = limitsFor("pro", "past_due");
    expect(l.tier).toBe("free");
    expect(l.maxCompanies).toBe(3);
    expect(l.channels).toEqual(["email"]);
  });
  it("max is unlimited companies + all channels + cross-company", () => {
    const l = limitsFor("max", "active");
    expect(l.maxCompanies).toBeNull();
    expect(l.crossCompanySearch).toBe(true);
    expect(l.channels).toContain("sms");
  });
});
