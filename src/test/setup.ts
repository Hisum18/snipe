// Provide deterministic env for modules that validate process.env at import.
const defaults: Record<string, string> = {
  APP_URL: "https://snipe.test",
  NEXT_PUBLIC_APP_URL: "https://snipe.test",
  AUTH_SECRET: "test-secret-abcdefghijklmnopqrstuvwxyz-0123",
  DATABASE_URL: "postgresql://u:p@localhost/db",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Snipe <a@snipe.test>",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "tok",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_test_x",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
  STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
  STRIPE_PRICE_MAX_MONTHLY: "price_max_monthly",
  STRIPE_PRICE_MAX_ANNUAL: "price_max_annual",
  CRON_SECRET: "cron-secret-abcdefghijklmnop-0123456789",
};

for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
