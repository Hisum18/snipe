import { describe, expect, it } from "vitest";

import { addWatchSchema, profileSchema, profileUpdateSchema, updateWatchSchema } from "@/lib/validation";

// Zod 4 fills defaults even inside optional fields. Partial edits must not, or a
// rename would wipe saved keyword filters and switch off cross-company search.
describe("partial edits only touch what was sent", () => {
  it("profile rename leaves filters and cross-company alone", () => {
    const parsed = profileUpdateSchema.parse({ name: "Backend" });
    expect(parsed).toEqual({ name: "Backend" });
  });

  it("watch location edit leaves keyword filters alone", () => {
    const parsed = updateWatchSchema.parse({ locationFilter: "NYC" });
    expect(parsed).toEqual({ locationFilter: "NYC" });
  });

  it("creates still get their defaults", () => {
    expect(profileSchema.parse({ name: "Backend" })).toMatchObject({ keywordFilters: [], crossCompany: false });
    expect(addWatchSchema.parse({ careersUrl: "https://boards.greenhouse.io/acme" }).keywordFilters).toEqual([]);
  });
});
