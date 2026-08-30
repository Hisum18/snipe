import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Integration tests share one Postgres; run files serially so global reads
    // (e.g. dispatchPending) never see another file's in-flight rows.
    fileParallelism: false,
  },
  resolve: {
    // Order matters: the more specific `@/db` alias must come before `@`.
    alias: [
      // Swap the neon-http client for a node-postgres one so integration tests
      // run the real app code against a plain Postgres (DATABASE_URL).
      { find: /^@\/db$/, replacement: fileURLToPath(new URL("./src/test/db.ts", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
      // `server-only` throws when imported outside an RSC bundler; stub it in tests.
      { find: "server-only", replacement: fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)) },
    ],
  },
});
