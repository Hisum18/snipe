# Deploying Snipe

A step-by-step checklist to take Snipe from this repo to a live deployment on
Vercel. Nothing here has been run for you — you'll provision the services and
paste their credentials into env vars.

## 0. Accounts you'll need

- [Vercel](https://vercel.com) — hosting + cron (see the cron note at the bottom)
- [Neon](https://neon.tech) — Postgres
- [Upstash](https://upstash.com) — Redis (rate limiting)
- [Resend](https://resend.com) — transactional + alert email
- [Stripe](https://stripe.com) — billing

## 1. Postgres (Neon)

1. Create a project → copy the **pooled** connection string → `DATABASE_URL`.
2. Apply the schema:
   ```bash
   DATABASE_URL="postgresql://…" npm run db:migrate
   ```
   (Migrations live in `drizzle/`; `db:generate` regenerates them from
   `src/db/schema.ts` if you change the schema.)

## 2. Redis (Upstash)

1. Create a Redis database.
2. Copy the **REST URL** and **REST token** → `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`.

## 3. Email (Resend)

1. Add and **verify your sending domain** (add the SPF/DKIM records Resend
   shows; add a DMARC record too for deliverability). Alerts won't be trusted
   without this.
2. Create an API key → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified address, e.g. `Snipe <alerts@yourdomain.com>`.

## 4. Billing (Stripe)

1. Create **two products**: "Snipe Pro" and "Snipe Max".
2. On each, add a **monthly** and an **annual** recurring price
   (annual = 10× monthly per the spec):
   - Pro: $10/mo, $100/yr
   - Max: $20/mo, $200/yr
3. Copy the four price IDs →
   `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`,
   `STRIPE_PRICE_MAX_MONTHLY`, `STRIPE_PRICE_MAX_ANNUAL`.
   (These are the ONLY source of plan entitlement — the webhook resolves tier
   from the price ID.)
4. API keys → `STRIPE_SECRET_KEY` (server), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
5. **Customer Portal**: Settings → Billing → Customer Portal → activate, and
   allow plan switching + cancellation.
6. **Webhook**: add an endpoint `https://<your-domain>/api/stripe/webhook`
   subscribed to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## 5. App secrets

```bash
openssl rand -base64 32   # -> AUTH_SECRET
openssl rand -base64 32   # -> CRON_SECRET
```
Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to your canonical https origin.

## 6. Deploy to Vercel

1. Import the repo in Vercel.
2. Add **every** variable from `.env.example` in Project → Settings →
   Environment Variables (Production + Preview).
3. Deploy. `vercel.json` registers the crons automatically:
   - `/api/cron/poll` every minute
   - `/api/cron/digest` daily at 13:00 UTC

   Vercel attaches `Authorization: Bearer $CRON_SECRET` to cron requests when
   `CRON_SECRET` is set, which the routes require.

## 7. Post-deploy smoke test

- [ ] Landing page renders; pricing toggle works.
- [ ] Enter your email → receive a magic link → it logs you in (and expires /
      is single-use).
- [ ] Add a real careers URL (e.g. a Greenhouse/Lever/Ashby board) → it appears
      in "Watched companies" with the real company name.
- [ ] Manually hit the cron once to confirm polling works:
      ```bash
      curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/poll
      ```
      (Without the header it must return 401.)
- [ ] Upgrade via Checkout with a Stripe **test card** (`4242 4242 4242 4242`)
      → webhook fires → dashboard shows the new plan + limits.
- [ ] Open the Customer Portal from the dashboard → cancel → confirm you fall
      back to Free (watches beyond the Free limit go inactive, not deleted).
- [ ] Delete account → all rows gone, redirected to the landing page.

## Notes & gotchas

- **Cron frequency requires Vercel Pro.** Hobby plans cap cron granularity and
  function duration; the every-minute poll and `maxDuration = 60` need Pro.
- **Run migrations on every schema change** before deploying code that depends
  on them.
- **`npm audit`**: 4 moderate advisories remain from `drizzle-kit`'s dev-only
  esbuild loader — not shipped in the runtime. Do not `--force` fix (it
  downgrades drizzle-kit). 0 critical / 0 high.
- **SMS** (Max) activates automatically once `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set (`smsConfigured()` in
  `src/lib/sms.ts` gates it). Leave them unset to keep SMS off.
- **CI**: `.github/workflows/ci.yml` runs typecheck, lint, the integration +
  authorization tests (`RUN_DB_TESTS=1` against a Postgres service), build, and a
  high/critical `npm audit` gate on every push/PR.
