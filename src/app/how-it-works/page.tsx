import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import {
  FeatureCarousel,
  type CarouselStep,
} from "@/components/how-it-works/feature-carousel";
import {
  DetectOpportunityVisual,
  GetNotifiedVisual,
  TrackCompaniesVisual,
} from "@/components/how-it-works/step-visuals";

export const metadata: Metadata = {
  title: "How it works — Snipe",
  description:
    "How Snipe works: track a company's careers page, we detect new postings on their ATS, and you get alerted the moment a matching role goes up.",
};

const STEPS: readonly CarouselStep[] = [
  {
    name: "Step 1",
    title: "Track companies",
    description:
      "Add Google, Microsoft, Meta — or any company on Greenhouse, Lever, or Ashby — and Snipe starts watching their public job feed.",
    visual: <TrackCompaniesVisual />,
  },
  {
    name: "Step 2",
    title: "Detect opportunities",
    description:
      "Snipe polls the ATS's own endpoints directly — as often as once a minute — and catches new postings the moment they go live.",
    visual: <DetectOpportunityVisual />,
  },
  {
    name: "Step 3",
    title: "Get notified",
    description:
      "The moment a new role appears, we alert you on Discord, by text, and by email — before the crowd shows up.",
    visual: <GetNotifiedVisual />,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--header-h))] flex-col bg-black text-white">
      {/* One centered column, vertically centered in the screen. */}
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center px-6 py-16 lg:px-10 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-brand-text">
            How it works
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            From careers page to your phone, first.
          </h1>
          <p className="mt-3 text-lg text-neutral-400">
            Three steps from a careers URL to your first alert.
          </p>
        </div>

        <div className="mt-10">
          <FeatureCarousel steps={STEPS} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent/90"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.15] bg-surface px-6 py-3 text-sm font-medium text-white transition-colors hover:border-brand hover:text-brand-text"
          >
            See plans &amp; compare
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
