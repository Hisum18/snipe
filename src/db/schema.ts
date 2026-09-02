import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/* ---------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const atsProviderEnum = pgEnum("ats_provider", [
  "greenhouse",
  "lever",
  "ashby",
]);

/** Entitlement tier. Derived only from the Stripe price ID in the webhook. */
export const planTierEnum = pgEnum("plan_tier", ["free", "pro", "max"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "discord",
  "sms",
]);

/* ---------------------------------------------------------------------------
 * Accounts + sessions + verification tokens
 *
 * `users`, `sessions`, and `verification_tokens` deliberately follow the
 * Auth.js table shape so we can drop in Auth.js later without a migration, but
 * they are driven here by our own magic-link + session code (src/lib/auth/*).
 * ------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Auth.js standard fields
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    // Credentials (email/password) login. Null for OAuth-only accounts.
    passwordHash: text("password_hash"),

    // Billing (all derived server-side; never trusted from the client)
    stripeCustomerId: text("stripe_customer_id"),
    plan: planTierEnum("plan").notNull().default("free"),
    // Raw Stripe subscription status (active, trialing, past_due, canceled, ...).
    // Entitlement = plan, but only when planStatus is active/trialing.
    planStatus: text("plan_status").notNull().default("active"),

    // Delivery channel settings
    emailNotificationsEnabled: boolean("email_notifications_enabled")
      .notNull()
      .default(true),
    discordWebhookUrl: text("discord_webhook_url"),
    phoneE164: text("phone_e164"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Case-insensitive uniqueness so Alice@x.com and alice@x.com are one account.
    uniqueIndex("users_email_lower_unique").on(sql`lower(${t.email})`),
    uniqueIndex("users_stripe_customer_unique")
      .on(t.stripeCustomerId)
      .where(sql`${t.stripeCustomerId} is not null`),
  ],
);

/** Database-backed sessions so logout can invalidate server-side. */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/**
 * Magic-link verification tokens. Auth.js hashes the token (sha256 with the
 * app secret) before it reaches the adapter, so only the hash is ever stored.
 * Tokens are single-use (deleted on redemption) and short-lived (15 min).
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** OAuth provider accounts (Google), linked to a user — Auth.js adapter shape. */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

/* ---------------------------------------------------------------------------
 * Companies + jobs
 * ------------------------------------------------------------------------- */

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    atsProvider: atsProviderEnum("ats_provider").notNull(),
    atsSlug: text("ats_slug").notNull(),

    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    // Backoff bookkeeping. Poller skips companies whose next-allowed time is in
    // the future; consecutiveErrors drives exponential backoff on ATS 429/5xx.
    nextEarliestPollAt: timestamp("next_earliest_poll_at", {
      withTimezone: true,
    }),
    consecutiveErrors: integer("consecutive_errors").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One canonical row per (provider, slug). Watches point at this.
    uniqueIndex("companies_provider_slug_unique").on(t.atsProvider, t.atsSlug),
    index("companies_next_poll_idx").on(t.nextEarliestPollAt),
  ],
);

/**
 * Distinct jobs we have observed per company. The (company_id, external_job_id)
 * pair is the dedupe key; a new row here is what triggers notifications.
 */
export const seenJobs = pgTable(
  "seen_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    externalJobId: text("external_job_id").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    url: text("url").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("seen_jobs_company_external_unique").on(
      t.companyId,
      t.externalJobId,
    ),
    index("seen_jobs_company_first_seen_idx").on(t.companyId, t.firstSeenAt),
  ],
);

/* ---------------------------------------------------------------------------
 * User-owned rows (watches, profiles, notifications, subscriptions)
 * ------------------------------------------------------------------------- */

export const watches = pgTable(
  "watches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    keywordFilters: jsonb("keyword_filters")
      .$type<string[]>()
      .notNull()
      .default([]),
    locationFilter: text("location_filter"),
    // On downgrade we deactivate the newest watches over the plan limit rather
    // than delete them, so they can be restored on re-upgrade.
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("watches_user_company_unique").on(t.userId, t.companyId),
    // Poller fans out from a company to its active watchers.
    index("watches_company_active_idx").on(t.companyId, t.active),
    index("watches_user_idx").on(t.userId),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keywordFilters: jsonb("keyword_filters")
      .$type<string[]>()
      .notNull()
      .default([]),
    locationFilter: text("location_filter"),
    // Max-only: match keywords across every indexed company, not just watched.
    crossCompany: boolean("cross_company").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profiles_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => seenJobs.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Idempotency: at most one notification per (user, job, channel). The
    // poller relies on this unique index to avoid double-sending.
    uniqueIndex("notifications_user_job_channel_unique").on(
      t.userId,
      t.jobId,
      t.channel,
    ),
    index("notifications_user_idx").on(t.userId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    priceId: text("price_id").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_id_unique").on(t.stripeSubscriptionId),
    index("subscriptions_user_idx").on(t.userId),
  ],
);

/**
 * Idempotency ledger for Stripe webhooks. We record every processed event id
 * and no-op on repeats so retried/duplicated deliveries can't double-apply.
 */
export const processedStripeEvents = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ---------------------------------------------------------------------------
 * Inferred types for use across the app
 * ------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type SeenJob = typeof seenJobs.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
