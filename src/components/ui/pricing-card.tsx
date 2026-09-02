"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Public data model (serializable, built on the server from PLAN_LIMITS) ---

export type BillingCycle = "monthly" | "annually";

/** A comparison-table cell: a string renders as text, a boolean as a check/✗. */
export type ComparisonCell = string | boolean;

export interface PricingPlan {
  id: "free" | "pro" | "max";
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnually: number;
  isPopular: boolean;
  buttonLabel: string;
  /** Where the CTA points (sign-up for logged-out, dashboard for logged-in). */
  href: string;
  /** Headline features shown on the card itself. */
  features: string[];
}

export interface ComparisonRow {
  label: string;
  values: Record<PricingPlan["id"], ComparisonCell>;
}

interface PricingSectionProps {
  plans: PricingPlan[];
  comparison: ComparisonRow[];
  /** Discount shown on the Annually toggle (already computed from real prices). */
  annualDiscountPercent: number;
}

// --- Cell renderer for the comparison table ---

function Cell({ value }: { value: ComparisonCell }) {
  if (typeof value === "string") {
    return <span className="text-sm text-neutral-200">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-white" aria-label="Included" />
  ) : (
    <X className="mx-auto h-5 w-5 text-neutral-600" aria-label="Not included" />
  );
}

export function PricingSection({
  plans,
  comparison,
  annualDiscountPercent,
}: PricingSectionProps) {
  const [cycle, setCycle] = React.useState<BillingCycle>("annually");

  return (
    <div className="mx-auto w-full max-w-content px-4 py-14 text-white selection:bg-white selection:text-black sm:px-6 md:py-20">
      {/* Header */}
      <header
        className="animate-flood-rise mb-10 text-center"
        style={{ animationDelay: "40ms" }}
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Pricing that keeps up{" "}
          <span className="text-neutral-500">with your search.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-neutral-400">
          Start free. Upgrade when speed matters — the faster we poll, the sooner
          you apply.
        </p>
      </header>

      {/* Billing toggle */}
      <div
        className="animate-flood-rise mb-10 mt-2 flex justify-center"
        style={{ animationDelay: "140ms" }}
      >
        <ToggleGroup
          type="single"
          value={cycle}
          onValueChange={(v) => {
            if (v === "monthly" || v === "annually") setCycle(v);
          }}
          aria-label="Select billing cycle"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1"
        >
          <ToggleGroupItem
            value="monthly"
            aria-label="Monthly billing"
            className="h-9 rounded-md px-6 text-sm font-medium text-neutral-400 hover:bg-white/[0.05] hover:text-white data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm"
          >
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem
            value="annually"
            aria-label="Annual billing"
            className="relative h-9 rounded-md px-6 text-sm font-medium text-neutral-400 hover:bg-white/[0.05] hover:text-white data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm"
          >
            Annually
            <span className="absolute -right-3 -top-3 z-10 whitespace-nowrap rounded-full bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white ring-1 ring-white/20">
              Save {annualDiscountPercent}%
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Pricing cards */}
      <section
        aria-label="Plans"
        style={{ animationDelay: "240ms" }}
        className="animate-flood-rise grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-6"
      >
        {plans.map((plan) => {
          const isFeatured = plan.isPopular;
          const isFree = plan.priceMonthly === 0 && plan.priceAnnually === 0;
          const price = cycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
          const suffix = isFree ? "/forever" : cycle === "monthly" ? "/mo" : "/yr";
          const strokePrice = plan.priceMonthly * 12; // list annual price (no discount)

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col transition-colors duration-300",
                isFeatured
                  ? "relative overflow-hidden border-white/[0.25] bg-black shadow-2xl md:scale-[1.02]"
                  : "border-white/[0.08] bg-[#050505] hover:border-white/[0.15]",
              )}
            >
              {isFeatured && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px w-full bg-white"
                />
              )}
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-2xl font-semibold text-white">
                    {plan.name}
                  </CardTitle>
                  {isFeatured && (
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-black">
                      Most popular
                    </span>
                  )}
                </div>
                <CardDescription className="mt-1 text-sm text-neutral-400">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-medium tracking-tighter tabular">
                      ${price}
                    </span>
                    <span className="text-base font-normal text-neutral-500">
                      {suffix}
                    </span>
                  </p>
                  {!isFree && cycle === "annually" && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Billed annually ·{" "}
                      <span className="text-neutral-600 line-through tabular">
                        ${strokePrice}/yr
                      </span>
                    </p>
                  )}
                  {!isFree && cycle === "monthly" && (
                    <p className="mt-1 text-xs text-neutral-500">
                      or ${plan.priceAnnually}/yr — two months free
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-grow p-6 pt-0">
                <h4 className="mb-2 mt-2 text-sm font-medium text-neutral-300">
                  Includes:
                </h4>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 py-0.5">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isFeatured ? "text-white" : "text-neutral-500",
                        )}
                      />
                      <span className="text-sm text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "w-full gap-2",
                    isFeatured
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "border border-white/[0.12] bg-transparent text-white hover:bg-white/[0.05]",
                  )}
                >
                  <Link href={plan.href}>
                    {plan.buttonLabel}
                    {isFeatured && <ArrowRight className="h-4 w-4" />}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </section>

      {/* Feature comparison */}
      <section
        aria-label="Feature comparison"
        style={{ animationDelay: "360ms" }}
        className="animate-flood-rise mt-16"
      >
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-white">
          Compare every feature
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="min-w-full divide-y divide-white/[0.08]">
            <thead>
              <tr className="bg-white/[0.03]">
                <th
                  scope="col"
                  className="w-[220px] whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-neutral-400"
                >
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-6 py-4 text-center text-sm font-semibold",
                      plan.isPopular
                        ? "bg-white/[0.06] text-white"
                        : "text-neutral-300",
                    )}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {comparison.map((row, i) => (
                <tr key={row.label} className={cn(i % 2 === 1 && "bg-white/[0.02]")}>
                  <td className="whitespace-nowrap px-6 py-3 text-left text-sm font-medium text-neutral-200">
                    {row.label}
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.id}
                      className={cn(
                        "px-6 py-3 text-center",
                        plan.isPopular && "bg-white/[0.04]",
                      )}
                    >
                      <Cell value={row.values[plan.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage note */}
      <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-neutral-500">
        <span className="h-2 w-2 rounded-full bg-neutral-700" />
        Every plan polls public ATS endpoints only — no scraping, no bots, cancel
        anytime.
      </p>
    </div>
  );
}
