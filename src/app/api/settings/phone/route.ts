import { randomInt } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { effectiveTier } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { hashToken } from "@/lib/auth/crypto";
import { getRedis } from "@/lib/redis";
import { smsSendByUser } from "@/lib/ratelimit";
import { isValidE164, sendSms, smsConfigured } from "@/lib/sms";

export const runtime = "nodejs";

const CODE_TTL_SECONDS = 10 * 60;
const redisKey = (userId: string) => `sms:verify:${userId}`;

const bodySchema = z.object({
  phone: z.string().trim().refine(isValidE164, "must be E.164, e.g. +14155551234"),
});

// POST /api/settings/phone — start phone verification (Max only). Sends a 6-digit
// code via SMS and stores only its hash in Redis with a 10-minute TTL.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (effectiveTier(user.plan, user.planStatus) !== "max") {
    return json({ error: "SMS alerts are available on the Max plan." }, 403);
  }
  if (!smsConfigured()) {
    return json({ error: "SMS is not available right now." }, 503);
  }

  const limited = await enforceRateLimit(smsSendByUser(), user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a valid phone number." }, 422);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await getRedis().set(
    redisKey(user.id),
    JSON.stringify({ hash: hashToken(code), phone: parsed.data.phone }),
    { ex: CODE_TTL_SECONDS },
  );

  try {
    await sendSms(parsed.data.phone, `Your Snipe verification code is ${code}`);
  } catch {
    return json({ error: "Couldn't send the code. Check the number." }, 502);
  }

  return json({ ok: true });
}

// Optional: clear a verified phone number (turn off SMS).
export async function DELETE() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  await db
    .update(users)
    .set({ phoneE164: null, phoneVerifiedAt: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await getRedis().del(redisKey(user.id));
  return json({ ok: true });
}
