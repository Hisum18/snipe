import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import { getServerEnv } from "@/env";
import { generateToken, hashToken } from "@/lib/auth/crypto";
import { getOrCreateUserByEmail } from "@/lib/auth/users";
import { sendMagicLinkEmail } from "@/lib/email";
import { log } from "@/lib/log";
import { clientIp, magicLinkByEmail, magicLinkByIp } from "@/lib/ratelimit";
import { magicLinkRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// A generic response used for EVERY outcome that isn't rate-limited or a server
// error, so the caller can never tell whether the email is registered. Minted
// fresh per call — a Response body can only be consumed once, so a shared
// instance would break on the second request.
function genericOk(): NextResponse {
  return NextResponse.json({
    ok: true,
    message: "If that email can receive mail, a sign-in link is on its way.",
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = magicLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Do not echo which field failed in a way that aids enumeration.
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email } = parsed.data;
  const ip = clientIp(req);

  // Rate limit per IP AND per email (5/hour each). Fail CLOSED if the limiter
  // is unreachable — better to reject a login than to allow unbounded sends.
  try {
    const [ipRes, emailRes] = await Promise.all([
      magicLinkByIp().limit(ip),
      magicLinkByEmail().limit(email),
    ]);
    if (!ipRes.success || !emailRes.success) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  // Always do the same work regardless of prior registration state.
  try {
    await getOrCreateUserByEmail(email);

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    // Only one outstanding link per email: drop prior tokens, store the hash.
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
    await db.insert(verificationTokens).values({
      identifier: email,
      token: tokenHash,
      expires,
    });

    const url = new URL("/api/auth/callback", getServerEnv().APP_URL);
    url.searchParams.set("token", rawToken);
    url.searchParams.set("email", email);
    // NEVER log `url` — it grants sign-in.
    await sendMagicLinkEmail(email, url.toString());
  } catch {
    // Swallow to keep the response identical. Log an OPAQUE event only — never
    // the email, token, or magic URL.
    log.warn("magic_link_send_failed");
    return genericOk();
  }

  return genericOk();
}
