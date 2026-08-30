/**
 * Test/CI database client.
 *
 * Production `@/db` uses the neon-http driver, which speaks Neon's HTTP protocol
 * and can't talk to a plain Postgres. In tests we alias `@/db` to THIS module
 * (see vitest.config.ts), a node-postgres-backed drizzle client, so the exact
 * same app code (routes, poller, notify, stripe-sync) runs against a local /
 * CI Postgres via DATABASE_URL. Prod code is untouched.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export { schema };
