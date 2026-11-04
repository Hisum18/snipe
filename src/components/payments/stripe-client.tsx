"use client";

import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
} from "@stripe/react-stripe-js";
import type {
  Stripe,
  StripeCardElementChangeEvent,
  StripeElements,
  StripeElementStyle,
} from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useMemo, useState, type ReactNode } from "react";

import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { publicEnv } from "@/env";

// The `pure` entry doesn't fetch Stripe.js at import time — only once a card
// form actually mounts — and the promise is reused after that.
let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe() {
  stripePromise ??= loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

// The card number / expiry / CVC inputs are Stripe iframes (so card data
// never touches Snipe), but everything around them — labels, borders, focus
// state — is our own markup. Only the text inside each iframe is styled
// through Stripe, which can't read our CSS variables, so the text colors from
// globals.css are repeated here.
const INK: Record<Theme, { fg: string; muted: string; danger: string }> = {
  dark: { fg: "#EEEAE1", muted: "#9B9993", danger: "#F59A8E" },
  light: { fg: "#202124", muted: "#66645E", danger: "#8E1F2A" },
};

function cardStyle(theme: Theme): StripeElementStyle {
  const c = INK[theme];
  return {
    base: {
      color: c.fg,
      iconColor: c.muted,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "14px",
      fontSmoothing: "antialiased",
      "::placeholder": { color: c.muted },
    },
    invalid: { color: c.danger, iconColor: c.danger },
  };
}

const FIELD =
  "rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm transition-colors placeholder:text-neutral-500 focus:border-brand focus:outline-none";
// Stripe adds these classes to each element's container as the state changes.
const STRIPE_FIELD = `${FIELD} [&.StripeElement--focus]:border-brand [&.StripeElement--invalid]:border-destructive/70`;

/** Stripe Elements for the card fields below, with Snipe's body font. */
export function CardElements({ children }: { children: ReactNode }) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" }],
      }}
    >
      {children}
    </Elements>
  );
}

/**
 * Card number, expiry and CVC (Stripe iframes) plus name and ZIP (plain
 * inputs named `cardholder` and `postal`, read from the surrounding form).
 */
export function CardFields({ disabled }: { disabled?: boolean }) {
  const { theme } = useTheme();
  const style = useMemo(() => cardStyle(theme), [theme]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const track = (field: string) => (e: StripeCardElementChangeEvent | { error?: { message: string } }) =>
    setErrors((prev) => ({ ...prev, [field]: e.error?.message ?? "" }));
  const message = Object.values(errors).find(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Card number</FieldLabel>
        <CardNumberElement
          className={STRIPE_FIELD}
          // No Link "Autofill" badge: the form stays Snipe's, card-only.
          options={{ style, showIcon: true, disabled, disableLink: true }}
          onChange={track("number")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Expiry</FieldLabel>
          <CardExpiryElement
            className={STRIPE_FIELD}
            options={{ style, disabled }}
            onChange={track("expiry")}
          />
        </div>
        <div>
          <FieldLabel>CVC</FieldLabel>
          <CardCvcElement
            className={STRIPE_FIELD}
            options={{ style, disabled }}
            onChange={track("cvc")}
          />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3">
        <div>
          <label htmlFor="cardholder" className="mb-1.5 block text-xs text-neutral-400">
            Name on card
          </label>
          <input
            id="cardholder"
            name="cardholder"
            autoComplete="cc-name"
            required
            maxLength={100}
            disabled={disabled}
            className={`${FIELD} w-full`}
          />
        </div>
        <div>
          <label htmlFor="postal" className="mb-1.5 block text-xs text-neutral-400">
            ZIP / postal code
          </label>
          <input
            id="postal"
            name="postal"
            autoComplete="postal-code"
            maxLength={12}
            disabled={disabled}
            className={`${FIELD} w-full`}
          />
        </div>
      </div>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  // Stripe's inputs live in iframes (each carries its own accessible name),
  // so this is a visual label only — a <label for> can't target them.
  return (
    <span aria-hidden="true" className="mb-1.5 block text-xs text-neutral-400">
      {children}
    </span>
  );
}

/** Name and ZIP from `CardFields`' plain inputs. Read them before disabling
 *  the form — disabled inputs drop out of FormData. */
export function billingDetailsOf(form: HTMLFormElement): { name: string; postal: string } {
  const fields = new FormData(form);
  return {
    name: String(fields.get("cardholder") ?? "").trim(),
    postal: String(fields.get("postal") ?? "").trim(),
  };
}

/**
 * Have Stripe save the card in `CardFields` for this customer (3-D Secure
 * runs here if the bank asks for it) and return the SetupIntent id for the
 * server to verify and use.
 */
export async function saveCard(
  stripe: Stripe,
  elements: StripeElements,
  { name, postal }: { name: string; postal: string },
): Promise<{ setupIntentId: string } | { error: string }> {
  const card = elements.getElement(CardNumberElement);
  if (!card) return { error: "The card form didn't load. Refresh and try again." };
  if (!name) return { error: "Enter the name on the card." };

  const res = await fetch("/api/billing/setup-intent", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.clientSecret !== "string") {
    return { error: data.error ?? "Couldn't start saving your card." };
  }

  const { error, setupIntent } = await stripe.confirmCardSetup(data.clientSecret, {
    payment_method: {
      card,
      billing_details: { name, ...(postal ? { address: { postal_code: postal } } : {}) },
    },
  });
  if (error) return { error: error.message ?? "Your card couldn't be saved." };
  if (setupIntent?.status !== "succeeded") return { error: "Your card couldn't be verified." };
  return { setupIntentId: setupIntent.id };
}

/** Tell other open Snipe tabs that billing changed, so they refresh. */
export function announceBillingChange() {
  try {
    const channel = new BroadcastChannel("snipe-billing");
    channel.postMessage("changed");
    channel.close();
  } catch {
    // Older browsers: the other tab just shows the change on its next load.
  }
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}
