import Link from "next/link";

import { ShieldCheck, SnipeLogo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";

// Shared frame for Snipe's own payment pages (/checkout, /billing/manage),
// which open in their own tab: Snipe's mark and name up top, a plain
// "secured by Stripe" note, and nothing else competing with the form. The
// site navbar skips these routes (components/navbar/navbar.tsx).
export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <header>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Snipe dashboard">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
                <SnipeLogo className="h-[18px] w-[18px]" />
              </span>
              <span className="font-display text-[17px] font-semibold tracking-tight">Snipe</span>
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-border" />
            <span className="truncate text-sm text-neutral-400">Billing</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-neutral-400 sm:flex">
              <ShieldCheck className="size-3.5" />
              Payments secured by Stripe
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>

      <footer className="inverse bg-deep">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-neutral-500 sm:px-6">
          <span>© {new Date().getFullYear()} Snipe</span>
          <span>Card details are handled by Stripe and never reach Snipe&apos;s servers.</span>
        </div>
      </footer>
    </div>
  );
}
