import "server-only";

import { getServerEnv } from "@/env";

/**
 * Plan configuration — the single source of truth for entitlements.
 *
 * Design rules (from the spec, enforced here):
 *  - Entitlement tier is resolved from the Stripe PRICE ID on the subscription,
 *    never from the client, the redirect, or a dollar amount.
 *  - Every limit is enforced server-side on write using these numbers.
 *  - A hard cap on total watches applies to EVERY tier (including "unlimited")
 *    so no single account can explode the Resend/Neon bill.
 */

export type PlanTier = "free" | "pro" | "max";
export type BillingInterval = "monthly" | "annual";
export type DeliveryMode = "digest" | "instant";
export type Channel = "email" | "discord" | "sms";

export interface PlanLimits {
  tier: PlanTier;
  label: string;
  /** Max distinct companies a user may watch. `null` = unlimited (still capped
   *  by HARD_MAX_WATCHES_PER_USER below). */
  maxCompanies: number | null;
  /** Max notification profiles. `null` = unlimited (capped by the hard cap). */
  maxProfiles: number | null;
  /** Minimum seconds between polls for companies at this tier. Lower = fresher. */
  pollIntervalSeconds: number;
  /** Instant per-job alerts vs. a batched daily digest. */
  delivery: DeliveryMode;
  /** Channels this tier may deliver through. */
  channels: readonly Channel[];
  /** Match keywords across every indexed company (Max only). */
  crossCompanySearch: boolean;
  /** Full job history + CSV export (Max only). */
  fullHistoryExport: boolean;
}

/**
 * Absolute ceiling on watches per account, independent of plan. "Unlimited"
 * plans are unlimited only up to this number. Abuse/cost guardrail.
 */
export const HARD_MAX_WATCHES_PER_USER = 1000;
export const HARD_MAX_PROFILES_PER_USER = 100;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    tier: "free",
    label: "Free",
    maxCompanies: 3,
    maxProfiles: 1,
    pollIntervalSeconds: 24 * 60 * 60, // daily digest cadence
    delivery: "digest",
    channels: ["email"],
    crossCompanySearch: false,
    fullHistoryExport: false,
  },
  pro: {
    tier: "pro",
    label: "Pro",
    maxCompanies: 25,
    maxProfiles: 3,
    pollIntervalSeconds: 5 * 60, // 5-minute polling
    delivery: "instant",
    channels: ["email", "discord"],
    crossCompanySearch: false,
    fullHistoryExport: false,
  },
  max: {
    tier: "max",
    label: "Max",
    maxCompanies: null, // unlimited (up to HARD_MAX_WATCHES_PER_USER)
    maxProfiles: null, // unlimited (up to HARD_MAX_PROFILES_PER_USER)
    pollIntervalSeconds: 60, // 1-minute polling
    delivery: "instant",
    channels: ["email", "discord", "sms"],
    crossCompanySearch: true,
    fullHistoryExport: true,
  },
};

/**
 * Display pricing for the marketing/pricing table ONLY. These numbers are never
 * used for entitlement decisions — Stripe is the source of truth for what was
 * actually paid. Annual = 10x monthly (two months free).
 */
export const PLAN_PRICING = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 10, annual: 100 },
  max: { monthly: 20, annual: 200 },
} as const;

export interface PriceMapping {
  tier: PlanTier;
  interval: BillingInterval;
}

/**
 * price_id -> { tier, interval }. Built from env at call time so the same code
 * works across test/live Stripe modes without redeploying logic. This is the
 * ONLY place plan tier is derived from a subscription.
 */
export function buildPriceMap(): Record<string, PriceMapping> {
  const env = getServerEnv();
  return {
    [env.STRIPE_PRICE_PRO_MONTHLY]: { tier: "pro", interval: "monthly" },
    [env.STRIPE_PRICE_PRO_ANNUAL]: { tier: "pro", interval: "annual" },
    [env.STRIPE_PRICE_MAX_MONTHLY]: { tier: "max", interval: "monthly" },
    [env.STRIPE_PRICE_MAX_ANNUAL]: { tier: "max", interval: "annual" },
  };
}

/** Resolve a Stripe price ID to a plan tier, or null if it is unknown. */
export function tierForPriceId(priceId: string): PriceMapping | null {
  return buildPriceMap()[priceId] ?? null;
}

/** The reverse: resolve a (paid tier, interval) to its configured price ID. */
export function priceIdFor(
  tier: Exclude<PlanTier, "free">,
  interval: BillingInterval,
): string {
  const env = getServerEnv();
  const table: Record<"pro" | "max", Record<BillingInterval, string>> = {
    pro: {
      monthly: env.STRIPE_PRICE_PRO_MONTHLY,
      annual: env.STRIPE_PRICE_PRO_ANNUAL,
    },
    max: {
      monthly: env.STRIPE_PRICE_MAX_MONTHLY,
      annual: env.STRIPE_PRICE_MAX_ANNUAL,
    },
  };
  return table[tier][interval];
}

/**
 * Stripe subscription statuses that grant paid entitlement. Anything else
 * (past_due, canceled, unpaid, incomplete, ...) falls back to Free without
 * locking the account.
 */
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

/**
 * Resolve the EFFECTIVE entitlement tier from the plan tier stored on the user
 * and their raw Stripe status. This is what every limit check reads.
 */
export function effectiveTier(
  plan: PlanTier,
  planStatus: string,
): PlanTier {
  if (plan === "free") return "free";
  return ENTITLED_STATUSES.has(planStatus) ? plan : "free";
}

export function limitsFor(plan: PlanTier, planStatus: string): PlanLimits {
  return PLAN_LIMITS[effectiveTier(plan, planStatus)];
}

/**
 * Poll interval (seconds) per tier, derived from PLAN_LIMITS so it can never
 * drift. The poller builds its SQL `CASE` from these values — one source of
 * truth for both the app-layer cadence and the DB-side due-company query.
 */
export const POLL_INTERVAL_SECONDS: Record<PlanTier, number> = {
  free: PLAN_LIMITS.free.pollIntervalSeconds,
  pro: PLAN_LIMITS.pro.pollIntervalSeconds,
  max: PLAN_LIMITS.max.pollIntervalSeconds,
};
