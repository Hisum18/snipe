// Seed a known test account for manual testing.
//
//   1) make sure the auth migration is applied:  npm run db:migrate
//   2) run:  node --env-file=.env.local scripts/seed-test-user.mjs
//
// Uses node-postgres so it works against a local Postgres or Neon (over TCP).
import bcrypt from "bcryptjs";
import pg from "pg";

const EMAIL = "demo@snipe.test";
const PASSWORD = "SnipeDemo2026!";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Try: node --env-file=.env.local scripts/seed-test-user.mjs");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({
  connectionString: url,
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
  console.log(`\n  Sign in at /login with:\n    email:    ${EMAIL}\n    password: ${PASSWORD}\n`);
} catch (err) {
  console.error("Seed failed:", err.message);
  console.error("Did you run the migration (npm run db:migrate) first?");
  process.exit(1);
} finally {
  await client.end();
}
