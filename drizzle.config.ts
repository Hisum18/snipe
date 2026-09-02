import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI, not run through Next, so .env.local is not
// loaded automatically the way it is for `next dev` / `next build`. Load it
// here so `npm run db:migrate` etc. work without prefixing the command.
config({ path: ".env.local", quiet: true });

// drizzle-kit runs at build/CI time (Node), not in the edge runtime, so we read
// the connection string directly from the environment here rather than through
// the Zod-validated src/env.ts (which pulls in server-only client code).
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to run drizzle-kit");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
