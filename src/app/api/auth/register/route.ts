import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { enforceRateLimit, json } from "@/lib/api";
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

// POST /api/auth/register — create an email/password account, then the client
// signs in via the Credentials provider. Google users never hit this route.
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

  const email = parsed.data.email.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing.length > 0) {
    return json({ error: "An account with that email already exists." }, 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name || null,
    passwordHash,
  });

  return json({ ok: true }, 201);
}
