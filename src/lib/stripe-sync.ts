import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscriptions, users, type User } from "@/db/schema";
import { tierForPriceId, type PlanTier } from "@/config/plans";
import { getStripe } from "@/lib/stripe";
import { reconcileProfilesToPlan, reconcileWatchesToPlan } from "@/lib/entitlements";

async function findUserByCustomer(customerId: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

async function loadUserById(userId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

/**
 * Apply a Stripe Subscription to our user's entitlement. This is the ONLY place
 * plan access is granted or revoked. Tier is resolved from the price ID via the
 * config map — never from amounts or client input. `revoke` forces Free (used
 * for customer.subscription.deleted).
 */
export async function syncSubscriptionToUser(
  sub: Stripe.Subscription,
  opts: { revoke?: boolean } = {},
): Promise<void> {
  const customerId = customerIdOf(sub);
  const priceId = sub.items.data[0]?.price.id;

  let user = await findUserByCustomer(customerId);
  if (!user && typeof sub.metadata?.userId === "string") {
    user = await loadUserById(sub.metadata.userId);
    // Backfill the customer link if we matched via metadata.
    if (user && !user.stripeCustomerId) {
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }
  if (!user) {
    // Can't map this subscription to a user; nothing to grant. Fail closed.
    return;
  }

  // Record/refresh the subscription row (idempotent upsert).
  if (priceId) {
    const periodEnd =
      typeof sub.current_period_end === "number"
        ? new Date(sub.current_period_end * 1000)
        : null;
    await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        stripeSubscriptionId: sub.id,
        priceId,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          priceId,
          status: sub.status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          updatedAt: new Date(),
        },
      });
  }

  // Resolve entitlement tier. Unknown price => free (fail closed).
  const mapping = priceId ? tierForPriceId(priceId) : null;
  const tier: PlanTier = opts.revoke ? "free" : (mapping?.tier ?? "free");
  const status = opts.revoke ? "canceled" : sub.status;

  await db
    .update(users)
    .set({ plan: tier, planStatus: status, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Reconcile watches/profiles to the (possibly lower) new limit. Uses the
  // effective tier, so past_due/canceled correctly fall back to Free limits.
  const updated: User = { ...user, plan: tier, planStatus: status };
  await reconcileWatchesToPlan(updated);
  await reconcileProfilesToPlan(updated);
}

/** Route a verified Stripe event to the right handler. Idempotency is enforced
 *  by the caller before this runs. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const sub = await getStripe().subscriptions.retrieve(subId);
        await syncSubscriptionToUser(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await syncSubscriptionToUser(event.data.object);
      break;
    }
    case "customer.subscription.deleted": {
      await syncSubscriptionToUser(event.data.object, { revoke: true });
      break;
    }
    default:
      // Ignore unhandled event types.
      break;
  }
}
