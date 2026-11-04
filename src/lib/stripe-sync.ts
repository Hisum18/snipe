import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscriptions, users, type User } from "@/db/schema";
import { isPaymentSuspended, tierForPriceId, type PlanTier } from "@/config/plans";
import { getServerEnv } from "@/env";
import { sendPaymentFailedEmail, sendPaymentRecoveredEmail } from "@/lib/email";
import { log } from "@/lib/log";
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
    // Stripe moved current_period_end from the subscription to its first item
    // in newer API versions (2025-03-31+). Webhook payloads are serialized at
    // whatever API version the endpoint/CLI forwarder is using, which can be
    // newer than the version this SDK's types model — so check both shapes
    // rather than trusting only the (possibly absent) top-level field.
    const itemPeriodEnd = (
      sub.items.data[0] as unknown as { current_period_end?: number } | undefined
    )?.current_period_end;
    const rawPeriodEnd = sub.current_period_end ?? itemPeriodEnd;
    const periodEnd = typeof rawPeriodEnd === "number" ? new Date(rawPeriodEnd * 1000) : null;
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
  const previousStatus = user.planStatus;

  await db
    .update(users)
    .set({ plan: tier, planStatus: status, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Reconcile watches/profiles to the (possibly lower) new limit. Uses the
  // effective tier, so past_due/canceled correctly fall back to Free limits;
  // a payment-suspended status forces the cap to 0 (see entitlements.ts).
  const updated: User = { ...user, plan: tier, planStatus: status };
  await reconcileWatchesToPlan(updated);
  await reconcileProfilesToPlan(updated);

  // Email on the SUSPENSION EDGE only (not on every Stripe retry attempt, and
  // not on a deliberate cancellation) so the user isn't spammed and always
  // hears about both the pause and the recovery exactly once.
  const wasSuspended = isPaymentSuspended(previousStatus);
  const nowSuspended = isPaymentSuspended(status);
  if (!wasSuspended && nowSuspended) {
    const appUrl = getServerEnv().APP_URL;
    await sendPaymentFailedEmail(user.email, `${appUrl}/billing`).catch((err) => {
      log.warn("payment_failed_email_error", { userId: user.id, error: String(err) });
    });
  } else if (wasSuspended && !nowSuspended) {
    const appUrl = getServerEnv().APP_URL;
    await sendPaymentRecoveredEmail(user.email, `${appUrl}/dashboard`).catch((err) => {
      log.warn("payment_recovered_email_error", { userId: user.id, error: String(err) });
    });
  }
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
