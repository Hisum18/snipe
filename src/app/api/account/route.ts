import { cookies } from "next/headers";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscriptions, users, verificationTokens } from "@/db/schema";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { log } from "@/lib/log";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * DELETE /api/account — hard-delete the caller's account and all their data.
 *
 * A user's watched companies reveal that they're job hunting, so deletion is a
 * true hard delete: removing the users row cascades to watches, profiles,
 * notifications, sessions, and subscriptions (all FKs are ON DELETE CASCADE).
 * We also best-effort cancel any live Stripe subscription so billing stops.
 */
export async function DELETE() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  // Best-effort: cancel active Stripe subscriptions before wiping rows.
  if (user.stripeCustomerId) {
    try {
      const stripe = getStripe();
      const subs = await db
        .select({ id: subscriptions.stripeSubscriptionId })
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id));
      for (const s of subs) {
        try {
          await stripe.subscriptions.cancel(s.id);
        } catch {
          log.warn("account_delete_stripe_cancel_failed", { userId: user.id });
        }
      }
    } catch {
      // Never block account deletion on a Stripe hiccup.
      log.warn("account_delete_stripe_lookup_failed", { userId: user.id });
    }
  }

  // Invalidate any outstanding magic links for this email. verification_tokens
  // are keyed by email (not FK'd to the user), so without this an in-flight
  // sign-in link could recreate the account after deletion.
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, user.email));

  // Cascade delete everything owned by the user (watches, profiles,
  // notifications, sessions, subscriptions all have ON DELETE CASCADE).
  await db.delete(users).where(eq(users.id, user.id));

  // Clear the Auth.js session cookie (dev + prod cookie names).
  const store = await cookies();
  store.delete("authjs.session-token");
  store.delete("__Secure-authjs.session-token");

  return json({ ok: true });
}
