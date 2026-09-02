import "server-only";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import { generateToken, hashToken } from "./crypto";

/**
 * Single-use, hashed email tokens for email verification and password reset.
 * Reuses the Auth.js-shaped `verification_tokens` table (identifier namespaced
 * by purpose). Only the SHA-256 hash is stored, so a DB leak yields no usable
 * links; tokens are deleted on use and expire.
 */

const TTL_MS: Record<Purpose, number> = {
  verify: 24 * 60 * 60 * 1000, // 24h
  reset: 60 * 60 * 1000, // 1h
};

export type Purpose = "verify" | "reset";

function identifier(purpose: Purpose, email: string): string {
  return `${purpose}:${email.toLowerCase()}`;
}

/** Create a token for (purpose, email), replacing any prior one. Returns RAW token. */
export async function createEmailToken(
  purpose: Purpose,
  email: string,
): Promise<string> {
  const id = identifier(purpose, email);
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, id));

  const raw = generateToken();
  await db.insert(verificationTokens).values({
    identifier: id,
    token: hashToken(raw),
    expires: new Date(Date.now() + TTL_MS[purpose]),
  });
  return raw;
}

/** Validate + consume (single-use) a token. Returns true iff valid + unexpired. */
export async function consumeEmailToken(
  purpose: Purpose,
  email: string,
  raw: string,
): Promise<boolean> {
  const id = identifier(purpose, email);
  const hash = hashToken(raw);

  const rows = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, id),
        eq(verificationTokens.token, hash),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);
  if (rows.length === 0) return false;

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, id),
        eq(verificationTokens.token, hash),
      ),
    );
  return true;
}
