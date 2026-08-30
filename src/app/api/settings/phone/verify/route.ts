import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { effectiveTier } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { hashToken, safeEqual } from "@/lib/auth/crypto";
import { getRedis } from "@/lib/redis";
import { smsVerifyByUser } from "@/lib/ratelimit";

export const runtime = "nodejs";

const redisKey = (userId: string) => `sms:verify:${userId}`;
const bodySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

const storedSchema = z.object({ hash: z.string(), phone: z.string() });

// POST /api/settings/phone/verify — confirm the code and mark the phone verified.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (effectiveTier(user.plan, user.planStatus) !== "max") {
    return json({ error: "SMS alerts are available on the Max plan." }, 403);
  }

  const limited = await enforceRateLimit(smsVerifyByUser(), user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter the 6-digit code." }, 422);

  const raw = await getRedis().get(redisKey(user.id));
  if (!raw) return json({ error: "Code expired. Request a new one." }, 400);

  // Upstash may return the value already parsed; normalize.
  const stored = storedSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
  if (!stored.success) return json({ error: "Code expired. Request a new one." }, 400);

  if (!safeEqual(hashToken(parsed.data.code), stored.data.hash)) {
    return json({ error: "Incorrect code." }, 400);
  }

  await db
    .update(users)
    .set({ phoneE164: stored.data.phone, phoneVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await getRedis().del(redisKey(user.id));

  return json({ ok: true });
}
