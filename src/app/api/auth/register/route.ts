import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getServerEnv } from "@/env";
import { enforceRateLimit, json } from "@/lib/api";
import { createEmailToken } from "@/lib/auth/tokens";
import { sendExistingAccountEmail, sendVerifyEmail } from "@/lib/email";
import { log } from "@/lib/log";
import { clientIp, magicLinkByIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200),
  name: z.string().trim().max(120).optional(),
});

// POST /api/auth/register — create an UNVERIFIED email/password account and send
// a verification email. The response is identical whether the email is new or
// already registered, so it never reveals account existence (anti-enumeration).
export async function POST(req: Request) {
  const limited = await enforceRateLimit(magicLinkByIp(), clientIp(req));
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  const env = getServerEnv();
  const email = parsed.data.email;
  const lower = email.toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${lower}`)
    .limit(1);

  if (existing.length > 0) {
    // Already registered — notify the address rather than erroring, so the
    // response is indistinguishable from a fresh signup.
    try {
      await sendExistingAccountEmail(email, `${env.APP_URL}/login`);
    } catch {
      log.error("register_existing_notice_failed", {});
    }
    return json({ ok: true });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({
    email,
    name: parsed.data.name || null,
    passwordHash,
  });

  const token = await createEmailToken("verify", email);
  const url = `${env.APP_URL}/api/auth/verify?token=${encodeURIComponent(
    token,
  )}&email=${encodeURIComponent(email)}`;
  try {
    await sendVerifyEmail(email, url);
  } catch {
    // Best-effort: the account exists; they can request a new link.
    log.error("register_verify_email_failed", {});
  }

  return json({ ok: true });
}
