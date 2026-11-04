import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { priceIdFor, tierForPriceId, type BillingInterval, type PlanTier } from "@/config/plans";
import { getStripe } from "@/lib/stripe";

/**
 * Shared server logic for Snipe's own billing pages (/checkout and
 * /billing/manage) and their API routes under /api/billing. Every Stripe
 * object is resolved from the SESSION user's stored customer id — nothing
 * identity- or price-related is ever taken from the client.
 *
 * New subscriptions are only ever created once the first payment succeeds
 * (card saved via a SetupIntent first, then `error_if_incomplete`), the same
 * guarantee Stripe Checkout gave. That matters because stripe-sync treats an
 * `incomplete` subscription as a failed payment and suspends tracking.
 */

/** Statuses that count as "already subscribed" — matches the guard in
 *  api/stripe/checkout so a customer can never end up with two live subs. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type PaidTier = Exclude<PlanTier, "free">;

/** Return the user's Stripe customer id, creating (and storing) it if needed. */
export async function ensureCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return customer.id;
}

/** The customer's live subscription (asked of Stripe, the source of truth). */
export async function findLiveSubscription(
  customerId: string,
  expand: string[] = [],
): Promise<Stripe.Subscription | null> {
  const list = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: expand.map((e) => `data.${e}`),
  });
  return list.data.find((s) => LIVE_STATUSES.has(s.status)) ?? null;
}

/**
 * Resolve a SetupIntent the browser just confirmed into its saved payment
 * method — but only if it belongs to THIS customer and actually succeeded.
 * Returns null otherwise (callers answer 400).
 */
export async function verifiedSetupPaymentMethod(
  setupIntentId: string,
  customerId: string,
): Promise<string | null> {
  const si = await getStripe().setupIntents.retrieve(setupIntentId);
  const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id;
  if (siCustomer !== customerId || si.status !== "succeeded") return null;
  const pm = si.payment_method;
  return typeof pm === "string" ? pm : (pm?.id ?? null);
}

/** Look up an active promotion code by the code a customer typed. */
export async function findPromotionCode(code: string): Promise<Stripe.PromotionCode | null> {
  const list = await getStripe().promotionCodes.list({ code, active: true, limit: 1 });
  return list.data[0] ?? null;
}

export interface PriceInfo {
  amount: number; // cents
  currency: string;
}

/** Real amounts for a tier's monthly and annual prices, straight from Stripe. */
export async function getTierPrices(
  tier: PaidTier,
): Promise<Record<BillingInterval, PriceInfo>> {
  const stripe = getStripe();
  const [monthly, annual] = await Promise.all([
    stripe.prices.retrieve(priceIdFor(tier, "monthly")),
    stripe.prices.retrieve(priceIdFor(tier, "annual")),
  ]);
  const info = (p: Stripe.Price): PriceInfo => ({
    amount: p.unit_amount ?? 0,
    currency: p.currency,
  });
  return { monthly: info(monthly), annual: info(annual) };
}

/** Tier + interval of a subscription, from its price id (null if unknown). */
export function planOfSubscription(
  sub: Stripe.Subscription,
): { tier: PlanTier; interval: BillingInterval } | null {
  const priceId = sub.items.data[0]?.price.id;
  return priceId ? tierForPriceId(priceId) : null;
}

/** Period end of a subscription, whichever API shape the object came in. */
export function periodEndOf(sub: Stripe.Subscription): Date | null {
  const itemEnd = (sub.items.data[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const raw = sub.current_period_end ?? itemEnd;
  return typeof raw === "number" ? new Date(raw * 1000) : null;
}

/** A human message for a Stripe error, without leaking internals. */
export function stripeErrorMessage(err: unknown, fallback: string): string {
  const e = err as { type?: string; message?: string };
  // Card errors carry customer-safe messages ("Your card was declined.").
  if (e?.type === "StripeCardError" && typeof e.message === "string") return e.message;
  return fallback;
}
