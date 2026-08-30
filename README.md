# Snipe

Get alerted within minutes when a company posts a new job — by polling
applicant tracking systems' public JSON endpoints directly, faster than any
aggregator.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · Postgres (Neon) · Drizzle ORM
· Resend (email) · Stripe (billing) · Upstash Redis (rate limiting) · Zod ·
deployed to Vercel.

## Getting started

```bash
cp .env.example .env      # then fill in real values
npm install
npm run db:generate       # generate SQL from src/db/schema.ts
npm run db:migrate        # apply migrations to DATABASE_URL
npm run dev
```

## Scripts

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Local dev server                               |
| `npm run build`       | Production build                               |
| `npm run typecheck`   | `tsc --noEmit`                                 |
| `npm run db:generate` | Generate a migration from the schema           |
| `npm run db:migrate`  | Apply migrations                               |
| `npm run db:studio`   | Drizzle Studio                                 |
| `npm test`            | Vitest                                         |

## Architecture map

| Concern             | Location                              |
| ------------------- | ------------------------------------- |
| DB schema           | `src/db/schema.ts`                    |
| Plan/price config   | `src/config/plans.ts`                 |
| Env validation      | `src/env.ts`                          |
| SSRF-safe ATS fetch | `src/lib/ats.ts`                      |
| Discord webhook     | `src/lib/discord.ts`                  |
| Rate limiting       | `src/lib/ratelimit.ts`                |
| Magic-link auth     | `src/lib/auth/*`, `src/app/api/auth/*`|
| Security headers    | `next.config.mjs` + `src/proxy.ts` (CSP nonce) |
| Poller + notifications | `src/lib/poller.ts`, `src/lib/notify.ts`     |
| Stripe sync         | `src/lib/stripe-sync.ts`, `src/app/api/stripe/*` |

## Security posture

Highlights (details in code comments): strict hostname allowlist for all
outbound fetches (no user URL is ever fetched), per-email and per-IP rate limits
on magic links, hashed single-use 15-minute tokens, server-derived identity on
every user-scoped query, nonce-based CSP with no `unsafe-inline` scripts, and
Stripe webhook idempotency.

## Testing

```bash
npm test                                   # pure unit tests (no DB needed)
RUN_DB_TESTS=1 DATABASE_URL=postgres://… npm test   # + integration/authorization suites
```

Integration tests run the real app code against a plain Postgres via a
node-postgres alias (`src/test/db.ts`), since production uses the neon-http
driver. CI (`.github/workflows/ci.yml`) runs typecheck, lint, the full test
suite against a Postgres service, build, and a high/critical `npm audit` gate.

## Deploying

See [`DEPLOY.md`](./DEPLOY.md) for the full checklist (Neon, Upstash, Resend,
Stripe, optional Twilio, Vercel + cron).
