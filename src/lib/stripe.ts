import "server-only";

import Stripe from "stripe";

import { getServerEnv } from "@/env";

// Pinned to the API version bundled with the installed Stripe SDK (17.5.0).
export const STRIPE_API_VERSION = "2024-12-18.acacia";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(getServerEnv().STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return cached;
}
