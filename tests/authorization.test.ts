import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Cross-user authorization: user B must not be able to read, modify, or delete
 * user A's watches or profiles. These exercise the REAL route handlers against
 * a REAL Postgres, so they run only when RUN_DB_TESTS=1 and DATABASE_URL points
 * at a disposable, migrated test database.
 *
 *   RUN_DB_TESTS=1 DATABASE_URL=postgres://... npm test
 */
const dbTestsEnabled = process.env.RUN_DB_TESTS === "1";

// Swap the session resolver so we can act as a chosen user per request.
const session: { value: unknown } = { value: null };
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => session.value,
}));

describe.skipIf(!dbTestsEnabled)("cross-user authorization", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let watchRoute: typeof import("@/app/api/watches/[id]/route");
  let profileRoute: typeof import("@/app/api/profiles/[id]/route");

  let userA: import("@/db/schema").User;
  let userB: import("@/db/schema").User;
  let companyId: string;
  let watchAId: string;
  let profileAId: string;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    watchRoute = await import("@/app/api/watches/[id]/route");
    profileRoute = await import("@/app/api/profiles/[id]/route");

    const [a] = await db
      .insert(schema.users)
      .values({ email: `a-${Date.now()}@snipe.test` })
      .returning();
    const [b] = await db
      .insert(schema.users)
      .values({ email: `b-${Date.now()}@snipe.test` })
      .returning();
    userA = a!;
    userB = b!;

    const [c] = await db
      .insert(schema.companies)
      .values({ name: "acme", atsProvider: "greenhouse", atsSlug: `acme-${Date.now()}` })
      .returning();
    companyId = c!.id;

    const [w] = await db
      .insert(schema.watches)
      .values({ userId: userA.id, companyId, keywordFilters: ["engineer"] })
      .returning();
    watchAId = w!.id;

    const [p] = await db
      .insert(schema.profiles)
      .values({ userId: userA.id, name: "A's profile", keywordFilters: [] })
      .returning();
    profileAId = p!.id;
  });

  afterAll(async () => {
    // Cascade cleanup.
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyId));
  });

  it("B cannot delete A's watch", async () => {
    session.value = userB;
    const res = await watchRoute.DELETE(new Request("http://t/api/watches/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: watchAId }),
    });
    expect(res.status).toBe(404);
    const still = await db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.id, watchAId));
    expect(still.length).toBe(1); // untouched
  });

  it("B cannot modify A's watch", async () => {
    session.value = userB;
    const res = await watchRoute.PATCH(
      new Request("http://t/api/watches/x", {
        method: "PATCH",
        body: JSON.stringify({ keywordFilters: ["hacked"] }),
      }),
      { params: Promise.resolve({ id: watchAId }) },
    );
    expect(res.status).toBe(404);
    const [row] = await db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.id, watchAId));
    expect(row!.keywordFilters).toEqual(["engineer"]); // unchanged
  });

  it("B cannot delete A's profile", async () => {
    session.value = userB;
    const res = await profileRoute.DELETE(new Request("http://t/api/profiles/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: profileAId }),
    });
    expect(res.status).toBe(404);
    const still = await db
      .select()
      .from(schema.profiles)
      .where(and(eq(schema.profiles.id, profileAId), eq(schema.profiles.userId, userA.id)));
    expect(still.length).toBe(1);
  });

  it("A CAN delete A's own watch", async () => {
    session.value = userA;
    const res = await watchRoute.DELETE(new Request("http://t/api/watches/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: watchAId }),
    });
    expect(res.status).toBe(200);
    const gone = await db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.id, watchAId));
    expect(gone.length).toBe(0);
  });
});
