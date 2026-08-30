import { getServerEnv } from "@/env";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/stripe/portal — open the Customer Portal for plan changes and
// cancellation. The customer is ALWAYS the one stored on the session user;
// no customer id is ever accepted from the client.
export async function POST() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  if (!user.stripeCustomerId) {
    return json({ error: "No billing account yet. Upgrade first." }, 400);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getServerEnv().APP_URL}/dashboard`,
  });

  return json({ url: session.url });
}
