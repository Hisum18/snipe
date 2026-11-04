"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import { ArrowUpRight, SnipeLogo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string };

const LOGGED_OUT: Item[] = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const AUTHED: Item[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
];

function isActive(href: string, pathname: string): boolean {
  const base = href.split("#")[0] || "/";
  return base === "/" ? pathname === "/" : pathname.startsWith(base);
}

/**
 * Shared site navbar. Logo left, primary links centered (truly centered via
 * the [1fr_auto_1fr] grid, regardless of how wide the left/right groups
 * are), actions right. Transparent at the top of the page so it reads as
 * part of it; a solid background and soft shadow appear once the page
 * scrolls, to keep links legible over content.
 * Rendered once from the root layout across every public/marketing route.
 */
export function Navbar({
  authed,
  email,
  planLabel,
}: {
  authed: boolean;
  email?: string;
  planLabel?: string;
}) {
  const pathname = usePathname();
  const items = authed ? AUTHED : LOGGED_OUT;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Dismiss the user menu on outside click / Escape.
  useEffect(() => {
    if (!userOpen) return;
    function onDoc(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [userOpen]);

  const initial = (email?.trim()?.[0] ?? "U").toUpperCase();

  // Auth pages are full-screen; the site bar would clutter them. The logged-in
  // app area (dashboard/companies/jobs/billing/settings/help) has its own
  // collapsible sidebar shell (src/app/(app)/layout.tsx) instead.
  const NO_NAVBAR_PREFIXES = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/dashboard",
    "/companies",
    "/jobs",
    "/billing",
    "/checkout",
    "/settings",
    "/help",
  ];
  if (NO_NAVBAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow] duration-200",
        // Part of the page at the top; once scrolled, a solid page-colored
        // bar with a soft shadow (no divider line, no glass blur).
        scrolled || mobileOpen
          ? "bg-black shadow-[0_10px_30px_-24px_rgb(var(--shadow)/0.45)]"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto grid h-[72px] max-w-content grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 lg:px-10">
        {/* Left: mobile toggle + logo */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="group inline-flex size-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/[0.06] md:hidden"
          >
            <svg
              className="pointer-events-none"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d="M4 12L20 12"
                className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
              />
              <path
                d="M4 12H20"
                className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
              />
              <path
                d="M4 12H20"
                className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
              />
            </svg>
          </button>

          <Link
            href={authed ? "/dashboard" : "/"}
            className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-white"
          >
            <SnipeLogo className="h-6 w-6 text-brand" />
            <span className="max-sm:hidden">Snipe</span>
          </Link>
        </div>

        {/* Center: primary nav — plain links, no container. The current page
            is marked in the brand color with a short underline. */}
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {items.map((item) => {
            const current = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative py-2 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:transition-colors",
                  current
                    ? "font-medium text-brand-text after:bg-brand"
                    : "text-neutral-400 after:bg-transparent hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-3">
          <ThemeToggle />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          {authed ? (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-label="Account menu"
                onClick={() => setUserOpen((o) => !o)}
                className="flex size-9 items-center justify-center rounded-full bg-accent-2 text-sm font-medium text-accent-2-foreground transition-opacity hover:opacity-90"
              >
                {initial}
              </button>
              {userOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-overlay"
                >
                  {(email || planLabel) && (
                    <div className="px-3 py-2">
                      {email && (
                        <div className="truncate text-xs text-neutral-500">{email}</div>
                      )}
                      {planLabel && (
                        <div className="mt-0.5 text-xs text-neutral-300">
                          {planLabel} plan
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    role="menuitem"
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    role="menuitem"
                    href="/billing"
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Billing &amp; plan
                  </Link>
                  <Link
                    role="menuitem"
                    href="/settings"
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Settings
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Get started
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-b border-border bg-black px-6 py-2 md:hidden">
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(item.href, pathname) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-normal transition-colors",
                  isActive(item.href, pathname)
                    ? "bg-selected font-medium text-selected-foreground"
                    : "text-neutral-300 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
            {authed ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-normal text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-normal text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </Link>
            )}
            <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2.5">
              <span className="text-sm font-normal text-neutral-300">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
