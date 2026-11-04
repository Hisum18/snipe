"use client";

import { useElements, useStripe } from "@stripe/react-stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CreditCard } from "@/components/icons";
import {
  CardElements,
  CardFields,
  announceBillingChange,
  billingDetailsOf,
  formatMoney,
  saveCard,
} from "@/components/payments/stripe-client";

export interface ManagePlan {
  tier: "pro" | "max";
  interval: "monthly" | "annual";
  name: string;
  amount: number; // cents
  currency: string;
  status: string;
  /** Pre-formatted on the server. */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ManageCard {
  brand: string;
  last4: string;
  expires: string;
}

export interface ManageInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  url: string | null;
}

const PER = { monthly: "month", annual: "year" } as const;

/**
 * Snipe's own billing management (replaces Stripe's hosted portal): plan,
 * renewal, change plan, cancel/resume, card on file, and receipts. Every
 * action goes through /api/billing/*, then refreshes this page's server data
 * and tells other open Snipe tabs to refresh too.
 */
export function ManageBillingView({
  email,
  plan,
  card,
  invoices,
  unavailable,
}: {
  email: string;
  plan: ManagePlan | null;
  card: ManageCard | null;
  invoices: ManageInvoice[];
  unavailable: boolean;
}) {
  const router = useRouter();
  const suspended = plan !== null && (plan.status === "past_due" || plan.status === "unpaid");

  function changed() {
    announceBillingChange();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-enter">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">Billing</p>
        <h1 className="mt-2 text-3xl tracking-tight sm:text-4xl">Manage billing</h1>
        <p className="mt-2 text-sm text-neutral-400">{email}</p>
      </header>

      {unavailable && (
        <p className="rounded-2xl border border-white/10 p-5 text-sm text-neutral-400">
          We couldn&apos;t reach our payment provider just now, so some details are missing.
          Refresh in a minute.
        </p>
      )}

      {suspended && (
        <p className="animate-enter rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-5 text-sm text-destructive">
          Your last payment failed, so tracking and alerts are paused. Update your card below and
          we&apos;ll retry the outstanding payment on the new card right away.
        </p>
      )}

      <PlanSection plan={plan} suspended={suspended} onChanged={changed} />

      {(plan || card) && (
        <PaymentMethodSection
          card={card}
          startOpen={suspended}
          onChanged={changed}
        />
      )}

      {invoices.length > 0 && <InvoicesSection invoices={invoices} />}

      <p className="pt-2 text-center text-sm">
        <Link href="/dashboard" className="text-neutral-400 underline-offset-4 hover:text-brand-text hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

function PlanSection({
  plan,
  suspended,
  onChanged,
}: {
  plan: ManagePlan | null;
  suspended: boolean;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function setCancellation(action: "cancel" | "resume") {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setConfirming(false);
        onChanged();
      }
    } catch {
      setError("Network error.");
    }
    setWorking(false);
  }

  if (!plan) {
    return (
      <section className="card-glass animate-enter rounded-2xl p-6" style={{ animationDelay: "40ms" }}>
        <h2 className="text-lg">Plan</h2>
        <p className="mt-1 text-2xl tracking-tight">Free</p>
        <p className="mt-2 text-sm text-neutral-400">
          Up to 3 companies with a daily digest email. Upgrade for faster checks and instant
          alerts.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/checkout?plan=pro&interval=monthly"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent/90"
          >
            Upgrade to Pro
          </Link>
          <Link
            href="/checkout?plan=max&interval=monthly"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            See Max
          </Link>
        </div>
      </section>
    );
  }

  const other = plan.tier === "pro" ? "max" : "pro";

  return (
    <section className="card-glass animate-enter rounded-2xl p-6" style={{ animationDelay: "40ms" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg">Plan</h2>
          <p className="mt-1 text-2xl tracking-tight">
            {plan.name}{" "}
            <span className="text-base text-neutral-400">
              · {formatMoney(plan.amount, plan.currency)} per {PER[plan.interval]}
            </span>
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            {suspended
              ? "Payment failed. Tracking is paused until it's fixed."
              : plan.cancelAtPeriodEnd
                ? `Ends ${plan.periodEnd ? `on ${plan.periodEnd}` : "at the end of this period"}. You keep ${plan.name} until then, then move to Free. Nothing is deleted.`
                : plan.periodEnd
                  ? `Renews on ${plan.periodEnd}.`
                  : "Renews automatically."}
          </p>
        </div>
        {!suspended && (
          <Link
            href={`/checkout?plan=${other}&interval=${plan.interval}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            Change plan
          </Link>
        )}
      </div>

      {!suspended && (
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          {plan.cancelAtPeriodEnd ? (
            <button
              type="button"
              onClick={() => setCancellation("resume")}
              disabled={working}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06] disabled:opacity-60"
            >
              {working ? "Resuming…" : `Keep ${plan.name}`}
            </button>
          ) : confirming ? (
            <div>
              <p className="text-sm">
                Cancel {plan.name}? You keep it until{" "}
                {plan.periodEnd ?? "the end of this billing period"}, then move to Free. Your
                companies and alerts stay saved.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
                >
                  Keep my plan
                </button>
                <button
                  type="button"
                  onClick={() => setCancellation("cancel")}
                  disabled={working}
                  className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/[0.08] disabled:opacity-60"
                >
                  {working ? "Cancelling…" : "Cancel plan"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm text-neutral-400 underline-offset-4 hover:text-brand-text hover:underline"
            >
              Cancel plan
            </button>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PaymentMethodSection({
  card,
  startOpen,
  onChanged,
}: {
  card: ManageCard | null;
  startOpen: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(startOpen);
  const [notice, setNotice] = useState("");

  return (
    <section
      id="payment-method"
      className="card-glass animate-enter scroll-mt-6 rounded-2xl p-6"
      style={{ animationDelay: "100ms" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg">Payment method</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setEditing(true);
            }}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            {card ? "Update card" : "Add a card"}
          </button>
        )}
      </div>

      {card ? (
        <p className="mt-3 flex items-center gap-3 text-sm">
          <CreditCard className="size-4 text-neutral-400" />
          <span>
            <span className="capitalize">{card.brand}</span> ending in{" "}
            <span className="tabular-nums">{card.last4}</span>
          </span>
          <span className="text-neutral-500">Expires {card.expires}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">No card on file.</p>
      )}

      {notice && (
        <p role="status" className="mt-3 text-sm text-neutral-300">
          {notice}
        </p>
      )}

      {editing && (
        <CardElements>
          <UpdateCardForm
            onCancel={() => setEditing(false)}
            onSaved={(message) => {
              setEditing(false);
              setNotice(message);
              onChanged();
            }}
          />
        </CardElements>
      )}
    </section>
  );
}

function UpdateCardForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const billing = billingDetailsOf(e.currentTarget as HTMLFormElement);
    setWorking(true);
    setError("");

    const saved = await saveCard(stripe, elements, billing);
    if ("error" in saved) {
      setError(saved.error);
      setWorking(false);
      return;
    }

    try {
      const res = await fetch("/api/billing/payment-method", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupIntentId: saved.setupIntentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't update your card.");
        setWorking(false);
        return;
      }
      if (data.retryError) {
        // The card is saved either way; say exactly what didn't happen.
        onSaved(`New card saved, but the outstanding payment didn't go through: ${data.retryError}`);
      } else if (data.recovered) {
        onSaved("Card updated and the outstanding payment went through. Tracking is back on.");
      } else {
        onSaved("Card updated. Future payments use this card.");
      }
    } catch {
      setError("Network error.");
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 border-t border-white/[0.08] pt-5">
      <CardFields disabled={working} />
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || working}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
        >
          {working ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InvoicesSection({ invoices }: { invoices: ManageInvoice[] }) {
  return (
    <section className="card-glass animate-enter rounded-2xl p-6" style={{ animationDelay: "160ms" }}>
      <h2 className="text-lg">Billing history</h2>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate">{inv.description}</div>
              <div className="font-mono text-xs text-neutral-500">{inv.date}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums">{formatMoney(inv.amount, inv.currency)}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] capitalize text-neutral-400">
                {inv.status}
              </span>
              {inv.url && (
                <a
                  href={inv.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-xs text-neutral-400 hover:text-brand-text hover:underline"
                >
                  Receipt
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
