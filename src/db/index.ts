import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/env";
import * as schema from "./schema";

// `server-only` makes importing this file from a client component a build error,
// so the connection string can never leak into the browser bundle.

const sqlClient = neon(getServerEnv().DATABASE_URL);

export const db = drizzle(sqlClient, { schema });

export { schema };
