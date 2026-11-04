// Seed a known test account for manual testing.
//
//   1) make sure the auth migration is applied:  npm run db:migrate
//   2) set SEED_TEST_PASSWORD in .env.local (never commit it)
//   3) run:  node --env-file=.env.local scripts/seed-test-user.mjs
//
// The password is read from the environment so it never lives in the repo.
// Uses node-postgres so it works against a local Postgres or Neon (over TCP).
import bcrypt from "bcryptjs";
import pg from "pg";

const EMAIL = "demo@snipe.test";
const PASSWORD = process.env.SEED_TEST_PASSWORD;

if (!PASSWORD || PASSWORD.length < 12) {
  console.error("SEED_TEST_PASSWORD is not set (12+ characters). Add it to .env.local.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Try: node --env-file=.env.local scripts/seed-test-user.mjs");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
// node-postgres parses sslmode etc. out of the connection string and that
// parsed value overrides an explicit `ssl` option, so strip the query string
// first, otherwise a URL with ?sslmode=require ignores ssl:false below and
// tries SSL against a local server that doesn't support it.
const strippedUrl = url.replace(/\?.*$/, "");
const client = new pg.Client({
  connectionString: strippedUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const passwordHash = await bcrypt.hash(PASSWORD, 12);

try {
  await client.connect();
  const existing = await client.query(
    "select id from users where lower(email) = lower($1) limit 1",
    [EMAIL],
  );
  if (existing.rowCount > 0) {
    await client.query("update users set password_hash = $1, updated_at = now() where id = $2", [
      passwordHash,
      existing.rows[0].id,
    ]);
    console.log("Updated the existing test account's password.");
  } else {
    await client.query(
      "insert into users (id, email, password_hash, email_verified) values (gen_random_uuid()::text, $1, $2, now())",
      [EMAIL, passwordHash],
    );
    console.log("Created the test account.");
  }
  console.log(`\n  Sign in at /login as ${EMAIL} with the SEED_TEST_PASSWORD from .env.local.\n`);
} catch (err) {
  console.error("Seed failed:", err.message);
  console.error("Did you run the migration (npm run db:migrate) first?");
  process.exit(1);
} finally {
  await client.end();
}
