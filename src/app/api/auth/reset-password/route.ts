import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { enforceRateLimit, json } from "@/lib/api";
import { consumeEmailToken } from "@/lib/auth/tokens";
import { authCallbackByIp, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(254),
  token: z.string().min(1).max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200),
});

// POST /api/auth/reset-password — set a new password using a valid reset token.
export async function POST(req: Request) {
  const limited = await enforceRateLimit(authCallbackByIp(), clientIp(req));
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  const ok = await consumeEmailToken("reset", parsed.data.email, parsed.data.token);
  if (!ok) {
    return json({ error: "This reset link is invalid or has expired." }, 400);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`);

  return json({ ok: true });
}
