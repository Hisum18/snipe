import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * - `serverEnv` is imported only from server code. Importing it into a client
 *   component would leak secrets into the client bundle, so it throws if it
 *   ever runs in the browser.
 * - `publicEnv` holds the NEXT_PUBLIC_* values that are safe for the browser.
 *
 * Validation runs once at module load so a misconfigured deploy fails fast
 * instead of surfacing as a confusing runtime error deep in a request.
 */

const serverSchema = z.object({
  APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  DATABASE_URL: z.string().url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_PRO_ANNUAL: z.string().min(1),
  STRIPE_PRICE_MAX_MONTHLY: z.string().min(1),
  STRIPE_PRICE_MAX_ANNUAL: z.string().min(1),

  CRON_SECRET: z.string().min(16, "CRON_SECRET should be a long random string"),

  // Optional SMS (Twilio). When all three are set, Max-tier SMS activates.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

let cachedServerEnv: ServerEnv | null = null;

/**
 * Lazily validate and return the server environment. Lazy so that merely
 * importing a module that references this does not crash at build time before
 * env vars are present; the first server request validates and caches.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must never be called in the browser");
  }
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

// Public env is inlined by Next at build time, so it is safe to evaluate eagerly.
export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
