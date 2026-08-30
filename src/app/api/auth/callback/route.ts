import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import { getServerEnv } from "@/env";
import { hashToken } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { getOrCreateUserByEmail, markEmailVerified } from "@/lib/auth/users";
import { authCallbackByIp, clientIp } from "@/lib/ratelimit";
import { emailSchema } from "@/lib/validation";

export const runtime = "nodejs";

const querySchema = z.object({
  token: z.string().min(1).max(200),
  email: emailSchema,
});

function redirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, getServerEnv().APP_URL));
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  try {
    const rl = await authCallbackByIp().limit(ip);
    if (!rl.success) return redirect("/login?error=rate_limited");
  } catch {
    return redirect("/login?error=unavailable");
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    token: searchParams.get("token"),
    email: searchParams.get("email"),
  });
  if (!parsed.success) return redirect("/login?error=invalid");

  const { token, email } = parsed.data;
  const tokenHash = hashToken(token);

  // Look up the single matching token for this identifier.
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, tokenHash),
      ),
    )
    .limit(1);

  const record = rows[0];

  // Single-use: delete the token immediately whether or not it's still valid,
  // so a captured link can't be replayed.
  if (record) {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, tokenHash),
        ),
      );
  }

  if (!record || record.expires.getTime() < Date.now()) {
    return redirect("/login?error=invalid");
  }

  const user = await getOrCreateUserByEmail(email);
  await markEmailVerified(user.id);
  await createSession(user.id);

  return redirect("/dashboard");
}
