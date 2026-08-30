import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbTests = process.env.RUN_DB_TESTS === "1";

// Controllable ATS layer so we drive exactly what a "poll" returns.
const atsControl = vi.hoisted(() => ({
  impl: null as null | ((provider: string, slug: string) => Promise<unknown[]>),
}));

vi.mock("@/lib/ats", () => {
  class AtsFetchError extends Error {
    status?: number;
    retryable: boolean;
    constructor(message: string, status?: number, retryable = false) {
      super(message);
      this.status = status;
      this.retryable = retryable;
    }
  }
  return {
    AtsFetchError,
    fetchAtsJobs: (provider: string, slug: string) => {
      if (!atsControl.impl) throw new Error("atsControl.impl not set");
      return atsControl.impl(provider, slug);
    },
  };
});
vi.mock("@/lib/email", () => ({ sendEmail: async () => {} }));
vi.mock("@/lib/discord", () => ({
  sendDiscord: async () => {},
  isValidDiscordWebhookUrl: (u: string) => typeof u === "string" && u.includes("discord.com/api/webhooks/"),
}));

describe.skipIf(!dbTests)("pollDueCompanies", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let pollDueCompanies: typeof import("@/lib/poller").pollDueCompanies;
  let AtsFetchError: typeof import("@/lib/ats").AtsFetchError;

  const created: { users: string[]; companies: string[] } = { users: [], companies: [] };

  async function makeUser(plan: "free" | "pro" | "max") {
    const [u] = await db
      .insert(schema.users)
      .values({ email: `p-${Math.random().toString(36).slice(2)}@snipe.test`, plan, planStatus: "active", emailVerified: new Date() })
      .returning();
    created.users.push(u!.id);
    return u!;
  }
  async function makeCompany() {
    const [c] = await db
      .insert(schema.companies)
      .values({ name: "co", atsProvider: "greenhouse", atsSlug: `c-${Math.random().toString(36).slice(2)}` })
      .returning();
    created.companies.push(c!.id);
    return c!;
  }

  beforeEach(async () => {
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ pollDueCompanies } = await import("@/lib/poller"));
    ({ AtsFetchError } = await import("@/lib/ats"));
    atsControl.impl = null;
  });
  afterEach(async () => {
    for (const id of created.users) await db.delete(schema.users).where(eq(schema.users.id, id));
    for (const id of created.companies) await db.delete(schema.companies).where(eq(schema.companies.id, id));
    created.users.length = 0;
    created.companies.length = 0;
  });

  it("inserts new jobs and notifies only matching watchers", async () => {
    const u = await makeUser("pro");
    const c = await makeCompany();
    await db.insert(schema.watches).values({ userId: u.id, companyId: c.id, keywordFilters: ["engineer"] });

    atsControl.impl = async () => [
      { externalId: "1", title: "Senior Engineer", location: "Remote", url: "https://x/1" },
      { externalId: "2", title: "Product Designer", location: "NYC", url: "https://x/2" },
    ];

    const res = await pollDueCompanies();
    expect(res.newJobs).toBe(2);

    const jobs = await db.select().from(schema.seenJobs).where(eq(schema.seenJobs.companyId, c.id));
    expect(jobs).toHaveLength(2);

    const notifs = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, u.id));
    expect(notifs).toHaveLength(1); // only "Senior Engineer" matched "engineer"
  });

  it("does not re-insert already-seen jobs (diff)", async () => {
    const u = await makeUser("pro");
    const c = await makeCompany();
    await db.insert(schema.watches).values({ userId: u.id, companyId: c.id, keywordFilters: [] });
    await db.insert(schema.seenJobs).values({ companyId: c.id, externalJobId: "1", title: "Old", location: null, url: "https://x/1" });

    atsControl.impl = async () => [
      { externalId: "1", title: "Old", location: null, url: "https://x/1" },
      { externalId: "3", title: "New Role", location: null, url: "https://x/3" },
    ];

    const res = await pollDueCompanies();
    expect(res.newJobs).toBe(1);
    const jobs = await db.select().from(schema.seenJobs).where(eq(schema.seenJobs.companyId, c.id));
    expect(jobs).toHaveLength(2); // "Old" + "New Role"
  });

  it("backs off on an ATS error", async () => {
    const u = await makeUser("pro");
    const c = await makeCompany();
    await db.insert(schema.watches).values({ userId: u.id, companyId: c.id });

    atsControl.impl = async () => {
      throw new AtsFetchError("rate limited", 429, true);
    };

    const res = await pollDueCompanies();
    expect(res.errors).toBe(1);
    const [after] = await db.select().from(schema.companies).where(eq(schema.companies.id, c.id));
    expect(after!.consecutiveErrors).toBe(1);
    expect(after!.nextEarliestPollAt).not.toBeNull();
  });

  it("Max cross-company profile matches a job even when the watch filter doesn't", async () => {
    const u = await makeUser("max");
    const c = await makeCompany();
    // Watch filter deliberately won't match; the cross-company profile will.
    await db.insert(schema.watches).values({ userId: u.id, companyId: c.id, keywordFilters: ["zzz-nomatch"] });
    await db.insert(schema.profiles).values({ userId: u.id, name: "Staff", keywordFilters: ["staff"], crossCompany: true });

    atsControl.impl = async () => [
      { externalId: "9", title: "Staff Engineer", location: "Remote", url: "https://x/9" },
    ];

    await pollDueCompanies();
    const notifs = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, u.id));
    expect(notifs.length).toBeGreaterThanOrEqual(1); // matched via cross-company profile
  });
});
