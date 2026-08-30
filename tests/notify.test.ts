import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbTests = process.env.RUN_DB_TESTS === "1";

// Capture outbound sends instead of hitting Resend/Discord.
const sentEmails: { to: string; itemCount: number }[] = [];
const sentDiscords: { url: string }[] = [];

vi.mock("@/lib/email", () => ({
  sendEmail: async (args: { to: string; html: string }) => {
    // count <li> items as a rough batch-size signal
    sentEmails.push({ to: args.to, itemCount: (args.html.match(/<li/g) ?? []).length });
  },
}));
vi.mock("@/lib/discord", () => ({
  sendDiscord: async (url: string) => {
    sentDiscords.push({ url });
  },
  isValidDiscordWebhookUrl: (u: string) =>
    typeof u === "string" && /^https:\/\/discord\.com\/api\/webhooks\//.test(u),
}));

describe.skipIf(!dbTests)("dispatchPending", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let dispatchPending: typeof import("@/lib/notify").dispatchPending;

  const created: { users: string[]; companies: string[] } = { users: [], companies: [] };

  async function makeUser(over: Partial<import("@/db/schema").NewUser> = {}) {
    const [u] = await db
      .insert(schema.users)
      .values({
        email: `n-${Math.random().toString(36).slice(2)}@snipe.test`,
        plan: "pro",
        planStatus: "active",
        emailVerified: new Date(),
        emailNotificationsEnabled: true,
        ...over,
      })
      .returning();
    created.users.push(u!.id);
    return u!;
  }

  async function makeJob() {
    const [c] = await db
      .insert(schema.companies)
      .values({ name: "co", atsProvider: "greenhouse", atsSlug: `c-${Math.random().toString(36).slice(2)}` })
      .returning();
    created.companies.push(c!.id);
    const [j] = await db
      .insert(schema.seenJobs)
      .values({ companyId: c!.id, externalJobId: "1", title: "Engineer", location: "Remote", url: "https://x/1" })
      .returning();
    return j!;
  }

  beforeEach(async () => {
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ dispatchPending } = await import("@/lib/notify"));
    sentEmails.length = 0;
    sentDiscords.length = 0;
  });

  afterEach(async () => {
    for (const id of created.users) await db.delete(schema.users).where(eq(schema.users.id, id));
    for (const id of created.companies) await db.delete(schema.companies).where(eq(schema.companies.id, id));
    created.users.length = 0;
    created.companies.length = 0;
  });

  it("batches multiple matches into one email per user and marks them sent", async () => {
    const u = await makeUser();
    const j1 = await makeJob();
    const j2 = await makeJob();
    await db.insert(schema.notifications).values([
      { userId: u.id, jobId: j1.id, channel: "email" },
      { userId: u.id, jobId: j2.id, channel: "email" },
    ]);

    const n = await dispatchPending("instant");
    expect(n).toBe(2);
    expect(sentEmails).toHaveLength(1); // one batched email
    expect(sentEmails[0]!.itemCount).toBe(2);

    // Second run sends nothing (idempotent — rows now sent).
    sentEmails.length = 0;
    expect(await dispatchPending("instant")).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });

  it("suppresses email for an unconfirmed / unsubscribed user without sending", async () => {
    const u = await makeUser({ emailVerified: null });
    const j = await makeJob();
    await db.insert(schema.notifications).values({ userId: u.id, jobId: j.id, channel: "email" });

    expect(await dispatchPending("instant")).toBe(0);
    expect(sentEmails).toHaveLength(0);
    const [row] = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, u.id));
    expect(row!.sentAt).not.toBeNull(); // dequeued, not stuck
  });

  it("does not send Discord without a valid webhook", async () => {
    const u = await makeUser({ discordWebhookUrl: null });
    const j = await makeJob();
    await db.insert(schema.notifications).values({ userId: u.id, jobId: j.id, channel: "discord" });

    expect(await dispatchPending("instant")).toBe(0);
    expect(sentDiscords).toHaveLength(0);
  });

  it("does not dispatch a free (digest) user's rows in instant mode", async () => {
    const u = await makeUser({ plan: "free", planStatus: "active" });
    const j = await makeJob();
    await db.insert(schema.notifications).values({ userId: u.id, jobId: j.id, channel: "email" });

    expect(await dispatchPending("instant")).toBe(0);
    expect(sentEmails).toHaveLength(0);
    // But the digest run picks it up.
    expect(await dispatchPending("digest")).toBe(1);
    expect(sentEmails).toHaveLength(1);
  });
});
