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
    return <span className="text-sm text-fg/90">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-accent-bright" aria-label="Included" />
  ) : (
    <X className="mx-auto h-5 w-5 text-muted/60" aria-label="Not included" />
  );
}

export function PricingSection({
  plans,
  comparison,
  annualDiscountPercent,
}: PricingSectionProps) {
  const [cycle, setCycle] = React.useState<BillingCycle>("annually");

  return (
    <div className="mx-auto w-full max-w-content px-4 py-14 sm:px-6 md:py-20">
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Pricing that keeps up with your search.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">
          Start free. Upgrade when speed matters — the faster we poll, the sooner
          you apply.
        </p>
      </header>

      {/* Billing toggle */}
      <div className="mb-10 mt-2 flex justify-center">
        <ToggleGroup
          type="single"
          value={cycle}
          onValueChange={(v) => {
            if (v === "monthly" || v === "annually") setCycle(v);
          }}
          aria-label="Select billing cycle"
          className="rounded-lg border border-border/10 bg-surface-2/60 p-1"
        >
          <ToggleGroupItem
            value="monthly"
            aria-label="Monthly billing"
            className="h-9 rounded-md px-6 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
          >
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem
            value="annually"
            aria-label="Annual billing"
            className="relative h-9 rounded-md px-6 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
          >
            Annually
            <span className="absolute -right-2 -top-3 whitespace-nowrap rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-bright">
              Save {annualDiscountPercent}%
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Pricing cards */}
      <section aria-label="Plans" className="grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
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
                "flex flex-col transition-shadow duration-300 hover:shadow-card",
                isFeatured &&
                  "relative shadow-glow ring-2 ring-primary md:scale-[1.02]",
              )}
            >
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  {isFeatured && (
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}
                </div>
                <CardDescription className="mt-1 text-sm text-muted">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight tabular">
                      ${price}
                    </span>
                    <span className="text-base font-normal text-muted">{suffix}</span>
                  </p>
                  {!isFree && cycle === "annually" && (
                    <p className="mt-1 text-xs text-muted">
                      Billed annually ·{" "}
                      <span className="text-muted/70 line-through tabular">
                        ${strokePrice}/yr
                      </span>
                    </p>
                  )}
                  {!isFree && cycle === "monthly" && (
                    <p className="mt-1 text-xs text-muted">
                      or ${plan.priceAnnually}/yr — two months free
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-grow p-6 pt-0">
                <h4 className="mb-2 mt-2 text-sm font-semibold text-fg/80">
                  Includes:
                </h4>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 py-0.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" />
                      <span className="text-sm text-fg/90">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  asChild
                  size="lg"
                  variant={isFeatured ? "default" : "outline"}
                  className={cn("w-full gap-2", !isFeatured && "hover:bg-surface-2")}
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
      <section aria-label="Feature comparison" className="mt-16">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
          Compare every feature
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border/10">
          <table className="min-w-full divide-y divide-border/10">
            <thead>
              <tr className="bg-surface-2/40">
                <th
                  scope="col"
                  className="w-[220px] whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-fg/80"
                >
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-fg/80",
                      plan.isPopular && "bg-primary/10 text-primary-bright",
                    )}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/[0.06]">
              {comparison.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(i % 2 === 1 && "bg-surface-2/20")}
                >
                  <td className="whitespace-nowrap px-6 py-3 text-left text-sm font-medium text-fg/90">
                    {row.label}
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.id}
                      className={cn(
                        "px-6 py-3 text-center",
                        plan.isPopular && "bg-primary/[0.06]",
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
      <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-muted">
        <span className="h-2 w-2 rounded-full bg-accent/70" />
        Every plan polls public ATS endpoints only — no scraping, no bots, cancel
        anytime.
      </p>
    </div>
  );
}
