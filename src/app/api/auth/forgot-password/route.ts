import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getServerEnv } from "@/env";
import { enforceRateLimit, json } from "@/lib/api";
import { createEmailToken } from "@/lib/auth/tokens";
import { sendResetEmail } from "@/lib/email";
import { log } from "@/lib/log";
import { clientIp, magicLinkByEmail, magicLinkByIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().email().max(254) });

// POST /api/auth/forgot-password — email a reset link if a password account
// exists. Always returns the same response (no account-existence enumeration).
export async function POST(req: Request) {
  const ipLimited = await enforceRateLimit(magicLinkByIp(), clientIp(req));
  if (ipLimited) return ipLimited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a valid email." }, 400);

  const email = parsed.data.email;
  const emailLimited = await enforceRateLimit(magicLinkByEmail(), email.toLowerCase());
  if (emailLimited) return emailLimited;

  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  const user = rows[0];

  // Only OAuth-less accounts with a password can reset. Silent otherwise.
  if (user?.passwordHash) {
    try {
      const token = await createEmailToken("reset", email);
      const env = getServerEnv();
      const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(
        token,
      )}&email=${encodeURIComponent(email)}`;
      await sendResetEmail(email, url);
    } catch {
      log.error("reset_email_failed", {});
    }
  }

  return json({ ok: true });
}
