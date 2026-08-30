import { describe, expect, it } from "vitest";

import { ATS_API_HOSTS, buildAtsApiUrl, detectAts, isValidSlug } from "@/lib/ats";

describe("slug validation", () => {
  it("accepts safe slugs", () => {
    expect(isValidSlug("acme")).toBe(true);
    expect(isValidSlug("acme-corp_123")).toBe(true);
  });
  it("rejects path traversal and injection attempts", () => {
    expect(isValidSlug("../etc/passwd")).toBe(false);
    expect(isValidSlug("acme/jobs")).toBe(false);
    expect(isValidSlug("acme?x=1")).toBe(false);
    expect(isValidSlug("http://evil.com")).toBe(false);
    expect(isValidSlug("acme.com")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
  });
});

describe("detectAts", () => {
  it("detects Greenhouse path and embed forms", () => {
    expect(detectAts("https://job-boards.greenhouse.io/acme")).toEqual({
      provider: "greenhouse",
      slug: "acme",
    });
    expect(
      detectAts("https://boards.greenhouse.io/embed/job_board?for=acme"),
    ).toEqual({ provider: "greenhouse", slug: "acme" });
  });
  it("detects Lever and Ashby", () => {
    expect(detectAts("https://jobs.lever.co/acme")).toEqual({
      provider: "lever",
      slug: "acme",
    });
    expect(detectAts("https://jobs.ashbyhq.com/acme")).toEqual({
      provider: "ashby",
      slug: "acme",
    });
  });
  it("returns null for unknown / hostile hosts (no SSRF pivot)", () => {
    expect(detectAts("https://evil.com/acme")).toBeNull();
    expect(detectAts("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(detectAts("https://greenhouse.io.evil.com/acme")).toBeNull();
    expect(detectAts("not a url")).toBeNull();
    expect(detectAts("file:///etc/passwd")).toBeNull();
  });
  it("rejects a valid host with an invalid slug", () => {
    expect(detectAts("https://jobs.lever.co/..%2f..")).toBeNull();
  });
});

describe("buildAtsApiUrl", () => {
  it("builds only allowlisted hosts", () => {
    for (const provider of ["greenhouse", "lever", "ashby"] as const) {
      const url = new URL(buildAtsApiUrl(provider, "acme"));
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe(ATS_API_HOSTS[provider]);
    }
  });
  it("throws on an invalid slug instead of interpolating it", () => {
    expect(() => buildAtsApiUrl("greenhouse", "../x")).toThrow();
  });
  it("encodes the slug into the path", () => {
    expect(buildAtsApiUrl("greenhouse", "acme")).toBe(
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs",
    );
    expect(buildAtsApiUrl("lever", "acme")).toBe(
      "https://api.lever.co/v0/postings/acme?mode=json",
    );
    expect(buildAtsApiUrl("ashby", "acme")).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/acme",
    );
  });
});
