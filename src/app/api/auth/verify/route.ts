import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getServerEnv } from "@/env";
import { enforceRateLimit } from "@/lib/api";
import { consumeEmailToken } from "@/lib/auth/tokens";
import { authCallbackByIp, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1).max(200),
  email: z.string().email().max(254),
});

// GET /api/auth/verify?token=&email= — confirm an email address, then bounce to
// the sign-in page. Rate-limited per IP to blunt token guessing.
export async function GET(req: Request) {
  const env = getServerEnv();
  const limited = await enforceRateLimit(authCallbackByIp(), clientIp(req));
  if (limited) return NextResponse.redirect(`${env.APP_URL}/login?error=rate_limited`);

  const url = new URL(req.url);
  const parsed = schema.safeParse({
    token: url.searchParams.get("token"),
    email: url.searchParams.get("email"),
  });
  if (!parsed.success) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=invalid`);
  }

  const ok = await consumeEmailToken("verify", parsed.data.email, parsed.data.token);
  if (!ok) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=invalid`);
  }

  await db
    .update(users)
    .set({ emailVerified: new Date(), updatedAt: new Date() })
    .where(sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`);

  return NextResponse.redirect(`${env.APP_URL}/login?verified=1`);
}
