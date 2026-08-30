import { describe, expect, it } from "vitest";

import { jobMatchesFilter, matchesKeywords, matchesLocation } from "@/lib/match";

const job = { title: "Senior Backend Engineer", location: "New York, NY" };

describe("matchesKeywords", () => {
  it("matches everything when no keywords", () => {
    expect(matchesKeywords(job, [])).toBe(true);
  });
  it("is case-insensitive and substring-based", () => {
    expect(matchesKeywords(job, ["engineer"])).toBe(true);
    expect(matchesKeywords(job, ["BACKEND"])).toBe(true);
    expect(matchesKeywords(job, ["designer"])).toBe(false);
  });
  it("matches if any keyword matches", () => {
    expect(matchesKeywords(job, ["designer", "backend"])).toBe(true);
  });
});

describe("matchesLocation", () => {
  it("matches when no filter", () => {
    expect(matchesLocation(job, null)).toBe(true);
    expect(matchesLocation(job, "")).toBe(true);
  });
  it("substring matches location", () => {
    expect(matchesLocation(job, "new york")).toBe(true);
    expect(matchesLocation(job, "remote")).toBe(false);
  });
  it("does not match when job has no location but a filter is set", () => {
    expect(matchesLocation({ title: "x", location: null }, "remote")).toBe(false);
  });
});

describe("jobMatchesFilter", () => {
  it("requires both keyword and location to match", () => {
    expect(
      jobMatchesFilter(job, { keywordFilters: ["engineer"], locationFilter: "new york" }),
    ).toBe(true);
    expect(
      jobMatchesFilter(job, { keywordFilters: ["engineer"], locationFilter: "remote" }),
    ).toBe(false);
  });
});
