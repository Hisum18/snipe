"use client";

import { useElements, useStripe } from "@stripe/react-stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Check, ShieldCheck, X } from "@/components/icons";
import {
  CardElements,
  CardFields,
  announceBillingChange,
  billingDetailsOf,
  formatMoney,
  saveCard,
} from "@/components/payments/stripe-client";
import { cn } from "@/lib/utils";

type Tier = "pro" | "max";
type Interval = "monthly" | "annual";

interface Price {
  amount: number; // cents
  currency: string;
}

export type CheckoutOptions = Record<
  Tier,
  { name: string; features: string[]; prices: Record<Interval, Price> }
>;

export interface CheckoutCurrent {
  tier: Tier;
  interval: Interval;
  pastDue: boolean;
  /** Pre-formatted on the server, so server and client render the same text. */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Promo {
  code: string;
  discount: number;
  totalDue: number;
  duration: string;
}

const PER: Record<Interval, string> = { monthly: "month", annual: "year" };
const BILLED: Record<Interval, string> = { monthly: "billed monthly", annual: "billed yearly" };

/**
 * Snipe's own checkout: plan summary on the left, payment on the right.
 * New subscribers save a card in Stripe's Payment Element and are charged by
 * /api/billing/subscribe; existing subscribers switch plans in place.
 */
export function CheckoutView({
  email,
  initialPlan,
  initialInterval,
  options,
  current,
}: {
  email: string;
  initialPlan: Tier;
  initialInterval: Interval;
  options: CheckoutOptions;
  current: CheckoutCurrent | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Tier>(initialPlan);
  const [interval, setBillingInterval] = useState<Interval>(initialInterval);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [done, setDone] = useState<"subscribed" | "switched" | null>(null);

  const option = options[plan];
  const price = option.prices[interval];
  const annualSavings = option.prices.monthly.amount * 12 - option.prices.annual.amount;

  const mode = !current
    ? "new"
    : current.pastDue
      ? "past_due"
      : current.tier === plan && current.interval === interval
        ? "current"
        : "switch";

  function choose(nextPlan: Tier, nextInterval: Interval) {
    setPlan(nextPlan);
    setBillingInterval(nextInterval);
    // A code was checked against the old plan; make them re-apply it.
    setPromo(null);
    router.replace(`/checkout?plan=${nextPlan}&interval=${nextInterval}`, { scroll: false });
  }

  if (done) {
    return (
      <Success
        name={option.name}
        highlights={option.features.slice(0, 3)}
        subscribed={done === "subscribed"}
      />
    );
  }

  const dueToday = promo ? promo.totalDue : price.amount;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16">
      {/* Summary */}
      <section aria-labelledby="checkout-title" className="animate-enter">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
          {mode === "new" ? "Subscribe" : "Your plan"}
        </p>
        <h1 id="checkout-title" className="mt-2 text-3xl tracking-tight sm:text-4xl">
          Snipe {option.name}
        </h1>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl tabular-nums tracking-tight">
            {formatMoney(price.amount, price.currency)}
          </span>
          <span className="text-neutral-400">per {PER[interval]}</span>
        </p>
        <p className="mt-1 h-5 text-sm text-neutral-400">
          {interval === "annual" && annualSavings > 0
            ? `${formatMoney(annualSavings, price.currency)} less than paying monthly`
            : interval === "monthly" && annualSavings > 0
              ? `Or ${formatMoney(option.prices.annual.amount, price.currency)} a year and save ${formatMoney(annualSavings, price.currency)}`
              : ""}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Segmented
            label="Plan"
            value={plan}
            options={[
              { value: "pro", label: options.pro.name },
              { value: "max", label: options.max.name },
            ]}
            onChange={(v) => choose(v, interval)}
          />
          <Segmented
            label="Billing period"
            value={interval}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Yearly" },
            ]}
            onChange={(v) => choose(plan, v)}
          />
        </div>

        <ul className="mt-8 space-y-3">
          {option.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-neutral-400" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {mode === "new" && (
          <div className="mt-8 border-t border-white/[0.08] pt-6">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-400">
                  Snipe {option.name}, {BILLED[interval]}
                </dt>
                <dd className="tabular-nums">{formatMoney(price.amount, price.currency)}</dd>
              </div>
              {promo && (
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">
                    <span className="font-mono">{promo.code}</span>, {promo.duration}
                  </dt>
                  <dd className="tabular-nums">−{formatMoney(promo.discount, price.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-white/[0.08] pt-3 text-base">
                <dt>Due today</dt>
                <dd className="tabular-nums">{formatMoney(dueToday, price.currency)}</dd>
              </div>
            </dl>
            <PromoField plan={plan} interval={interval} promo={promo} onChange={setPromo} />
          </div>
        )}
      </section>

      {/* Payment / plan change */}
      <section
        aria-label={mode === "new" ? "Payment" : "Change plan"}
        className="card-glass animate-enter self-start rounded-2xl p-6"
        style={{ animationDelay: "60ms" }}
      >
        {mode === "new" && (
          <>
            <h2 className="text-lg">Payment</h2>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm">
              <span className="text-neutral-400">Email</span>
              <span className="truncate">{email}</span>
            </div>
            <CardElements>
              <PayForm
                plan={plan}
                interval={interval}
                promoCode={promo?.code}
                dueToday={formatMoney(dueToday, price.currency)}
                recurring={`${formatMoney(price.amount, price.currency)} every ${PER[interval]}`}
                onDone={() => setDone("subscribed")}
              />
            </CardElements>
          </>
        )}

        {mode === "switch" && current && (
          <SwitchPanel
            current={current}
            currentName={options[current.tier].name}
            target={{ plan, interval, name: option.name }}
            onDone={() => setDone("switched")}
          />
        )}

        {mode === "current" && (
          <>
            <h2 className="text-lg">This is your current plan</h2>
            <p className="mt-2 text-sm text-neutral-400">
              {current?.cancelAtPeriodEnd && current.periodEnd
                ? `It's set to end on ${current.periodEnd}. You can resume it from Manage billing.`
                : "Pick a different plan or billing period to switch."}
            </p>
            <Link
              href="/billing/manage"
              className="mt-5 inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
            >
              Manage billing
            </Link>
          </>
        )}

        {mode === "past_due" && (
          <>
            <h2 className="text-lg">Your last payment failed</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Update your card first. We&apos;ll retry the outstanding payment on the new card,
              then you can change plans.
            </p>
            <Link
              href="/billing/manage#payment-method"
              className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent/90"
            >
              Update card
            </Link>
          </>
        )}

        <p className="mt-6 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs text-neutral-500">
          <ShieldCheck className="size-3.5 shrink-0" />
          Payments are processed by Stripe. Snipe never sees your card number.
        </p>
      </section>
    </div>
  );
}

function PayForm({
  plan,
  interval,
  promoCode,
  dueToday,
  recurring,
  onDone,
}: {
  plan: Tier;
  interval: Interval;
  promoCode?: string;
  dueToday: string;
  recurring: string;
  onDone: () => void;
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
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval, setupIntentId: saved.setupIntentId, promotionCode: promoCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Payment failed. You haven't been charged.");
        setWorking(false);
        return;
      }
    } catch {
      setError("Network error. Check your connection before trying again.");
      setWorking(false);
      return;
    }

    announceBillingChange();
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <CardFields disabled={working} />
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || working}
        className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
      >
        {working ? "Processing…" : `Subscribe · ${dueToday}`}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        You&apos;ll be charged {dueToday} today, then {recurring} until you cancel
        {promoCode ? " (less any discount still running)" : ""}. Cancel anytime from Manage
        billing.
      </p>
    </form>
  );
}

function SwitchPanel({
  current,
  currentName,
  target,
  onDone,
}: {
  current: CheckoutCurrent;
  currentName: string;
  target: { plan: Tier; interval: Interval; name: string };
  onDone: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const intervalChanges = current.interval !== target.interval;

  async function confirm() {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/billing/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: target.plan, interval: target.interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't switch plans.");
        setWorking(false);
        return;
      }
    } catch {
      setError("Network error.");
      setWorking(false);
      return;
    }
    announceBillingChange();
    onDone();
  }

  return (
    <>
      <h2 className="text-lg">Change plan</h2>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-white/[0.06] px-2 py-1">
          {currentName}, {BILLED[current.interval]}
        </span>
        <span aria-hidden="true" className="text-neutral-500">→</span>
        <span className="rounded-md border border-white/20 px-2 py-1">
          {target.name}, {BILLED[target.interval]}
        </span>
      </p>
      <p className="mt-4 text-sm text-neutral-400">
        {intervalChanges
          ? "Your new billing period starts today: you're charged for the new plan now, minus a credit for the unused time on your current one."
          : `The change takes effect now. The prorated difference is settled on your next invoice${current.periodEnd ? ` on ${current.periodEnd}` : ""}.`}{" "}
        Your card on file is used, so there&apos;s nothing to enter.
      </p>
      {current.cancelAtPeriodEnd && (
        <p className="mt-3 text-sm text-neutral-400">
          Your plan is still set to end{current.periodEnd ? ` on ${current.periodEnd}` : ""}. Resume
          it from Manage billing if you want to keep it.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={working}
        className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
      >
        {working ? "Switching…" : `Switch to ${target.name}`}
      </button>
    </>
  );
}

function PromoField({
  plan,
  interval,
  promo,
  onChange,
}: {
  plan: Tier;
  interval: Interval;
  promo: Promo | null;
  onChange: (p: Promo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  if (promo) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
        Code <span className="font-mono text-white">{promo.code}</span> applied
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove code ${promo.code}`}
          className="rounded p-0.5 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-neutral-400 underline-offset-4 hover:text-brand-text hover:underline"
      >
        Add a promotion code
      </button>
    );
  }

  async function apply(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/billing/promo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That code can't be used.");
      } else {
        onChange({
          code: data.code,
          discount: data.discount,
          totalDue: data.totalDue,
          duration: data.duration,
        });
        setCode("");
        setOpen(false);
      }
    } catch {
      setError("Network error.");
    }
    setWorking(false);
  }

  return (
    <form onSubmit={apply} className="mt-4">
      <label htmlFor="promo-code" className="sr-only">
        Promotion code
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promotion code"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={64}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:font-sans placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={working || !code.trim()}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06] disabled:opacity-60"
        >
          {working ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-white/10 p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-1.5",
            value === o.value ? "bg-selected font-medium text-selected-foreground" : "text-neutral-400 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Success({
  name,
  highlights,
  subscribed,
}: {
  name: string;
  highlights: string[];
  subscribed: boolean;
}) {
  return (
    <div className="card-glass animate-enter mx-auto max-w-lg rounded-2xl p-8 text-center sm:p-10">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Check className="size-5" />
      </span>
      <h1 className="mt-5 text-2xl tracking-tight sm:text-3xl">You&apos;re on Snipe {name}</h1>
      <p className="mt-3 text-sm text-neutral-400">
        {subscribed ? "Payment received. " : ""}Your new limits are live:{" "}
        {highlights.map((h) => h.toLowerCase()).join(", ")}.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          Go to dashboard
        </Link>
        <Link
          href="/billing/manage"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm hover:bg-white/[0.06]"
        >
          Manage billing
        </Link>
      </div>
      <p className="mt-6 text-xs text-neutral-500">
        You can close this tab. Your other Snipe tabs update on their own.
      </p>
    </div>
  );
}
