import { asc, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { companies, subscriptions, users, watches } from "@/db/schema";
import { syncSubscriptionToUser } from "@/lib/stripe-sync";

const dbTests = process.env.RUN_DB_TESTS === "1";

function fakeSub(overrides: Partial<Stripe.Subscription> & { priceId: string }): Stripe.Subscription {
  const { priceId, ...rest } = overrides;
  return {
    id: "sub_test",
    customer: "cus_test",
    status: "active",
    cancel_at_period_end: false,
    current_period_end: Math.floor(Date.now() / 1000) + 86400,
    items: { data: [{ price: { id: priceId } }] },
    metadata: {},
    ...rest,
  } as unknown as Stripe.Subscription;
}

describe.skipIf(!dbTests)("syncSubscriptionToUser", () => {
  const customerId = `cus_${Date.now()}`;
  let userId: string;
  const companyIds: string[] = [];

  async function seed(nWatches: number) {
    const [u] = await db
      .insert(users)
      .values({ email: `sync-${Date.now()}@snipe.test`, stripeCustomerId: customerId })
      .returning();
    userId = u!.id;
    const base = Date.now();
    for (let i = 0; i < nWatches; i++) {
      const [c] = await db
        .insert(companies)
        .values({ name: `co${i}`, atsProvider: "greenhouse", atsSlug: `co-${base}-${i}` })
        .returning();
      companyIds.push(c!.id);
      await db.insert(watches).values({
        userId,
        companyId: c!.id,
        createdAt: new Date(base + i * 1000), // deterministic ordering
      });
    }
  }

  afterEach(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId));
    for (const id of companyIds) await db.delete(companies).where(eq(companies.id, id));
    companyIds.length = 0;
  });

  it("grants the tier resolved from the price id and records the subscription", async () => {
    await seed(5);
    await syncSubscriptionToUser(fakeSub({ customer: customerId, priceId: process.env.STRIPE_PRICE_PRO_MONTHLY! }));

    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect(u!.plan).toBe("pro");
    expect(u!.planStatus).toBe("active");

    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    expect(subs).toHaveLength(1);
    expect(subs[0]!.priceId).toBe(process.env.STRIPE_PRICE_PRO_MONTHLY);

    // Pro cap is 25 — all 5 watches remain active.
    const active = await db.select().from(watches).where(eq(watches.userId, userId));
    expect(active.every((w) => w.active)).toBe(true);
  });

  it("revoke downgrades to Free and deactivates watches beyond the Free limit (oldest kept)", async () => {
    await seed(5);
    await syncSubscriptionToUser(fakeSub({ customer: customerId, priceId: process.env.STRIPE_PRICE_MAX_MONTHLY! }));
    // Now revoke.
    await syncSubscriptionToUser(
      fakeSub({ customer: customerId, priceId: process.env.STRIPE_PRICE_MAX_MONTHLY!, status: "canceled" }),
      { revoke: true },
    );

    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect(u!.plan).toBe("free");

    const ordered = await db
      .select()
      .from(watches)
      .where(eq(watches.userId, userId))
      .orderBy(asc(watches.createdAt));
    // Free cap = 3: oldest 3 active, newest 2 inactive.
    expect(ordered.slice(0, 3).every((w) => w.active)).toBe(true);
    expect(ordered.slice(3).every((w) => !w.active)).toBe(true);
  });

  it("is idempotent on repeat", async () => {
    await seed(1);
    const sub = fakeSub({ customer: customerId, priceId: process.env.STRIPE_PRICE_PRO_ANNUAL! });
    await syncSubscriptionToUser(sub);
    await syncSubscriptionToUser(sub);
    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    expect(subs).toHaveLength(1); // upsert, not duplicate
  });
});
