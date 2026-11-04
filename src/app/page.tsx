import Link from "next/link";

import { ArrowUpRight } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { DiscordAppIcon, GmailAppIcon, MessagesAppIcon } from "@/components/hero/brand-logos";
import { HeroIntro } from "@/components/hero/hero-intro";

const ATS_PROVIDERS = ["Greenhouse", "Lever", "Ashby"];

export default function LandingPage() {
  return (
    <div className="bg-black text-white">
      {/* The hero is exactly one screen tall (minus the navbar) on every
          display: content centered in it, the provider strip along its
          bottom, and the footer just below the fold. */}
      <section className="relative flex min-h-[calc(100dvh-var(--header-h))] flex-col overflow-hidden pt-14 sm:pt-20 xl:pt-8">
        {/* Copy left, product right from xl up; stacked and centered below
            that, where two columns would shrink the picture too far. */}
        <div className="relative z-10 mx-auto w-full max-w-content flex-1 px-6 lg:px-10 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-14">
          <div className="mx-auto max-w-xl text-center xl:mx-0 xl:max-w-[32rem] xl:text-left">
            <h1
              className="animate-enter text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-7xl xl:text-[4.75rem]"
              style={{ animationDelay: "40ms" }}
            >
              Apply before <span className="headline-accent">the flood.</span>
            </h1>

            <p
              className="animate-enter mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-neutral-400 xl:mx-0"
              style={{ animationDelay: "100ms" }}
            >
              Discover internship opportunities the moment they&apos;re posted.
              Get notified instantly and apply before everyone else.
            </p>

            <div
              className="animate-enter mt-10 flex flex-wrap items-center justify-center gap-3 xl:justify-start"
              style={{ animationDelay: "160ms" }}
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent/90"
              >
                Get started free
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center rounded-lg border border-white/15 bg-surface px-6 py-3 text-[15px] font-medium transition-colors hover:border-brand hover:text-brand-text"
              >
                See how it works
              </Link>
            </div>

            <div
              className="animate-enter mt-9 flex items-center justify-center gap-3 text-left xl:justify-start"
              style={{ animationDelay: "220ms" }}
            >
              <div className="flex items-center gap-1.5">
                <DiscordAppIcon className="size-9" />
                <MessagesAppIcon className="size-9" />
                <GmailAppIcon className="size-9" />
              </div>
              <div className="leading-snug">
                <p className="text-sm font-medium text-white">Instant alerts, free to start</p>
                <p className="text-sm text-neutral-500">Discord, SMS &amp; email</p>
              </div>
            </div>
          </div>

          {/* Product visual */}
          <div className="mt-20 flex justify-center lg:mt-24 xl:mt-0 xl:justify-end">
            <HeroIntro />
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-10 pt-20 text-center xl:pt-12">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">
            Watches job postings on
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-14 gap-y-4">
            {ATS_PROVIDERS.map((name) => (
              <li key={name} className="text-2xl font-semibold tracking-tight text-neutral-600">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
