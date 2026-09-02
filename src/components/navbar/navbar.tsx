"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import { ArrowRight, Target } from "@/components/icons";
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
 * Shared site navbar (originui navbar3 layout, adapted to our black & white
 * theme): a bordered bar with the logo + links on the left and an actions
 * cluster on the right. Rendered once from the root layout so it stays
 * consistent across every route. No new dependencies.
 */
export function Navbar({ authed, email }: { authed: boolean; email?: string }) {
  const pathname = usePathname();
  const items = authed ? AUTHED : LOGGED_OUT;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

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

  // Auth pages are full-screen; the site bar would clutter them.
  if (
    ["/login", "/signup", "/forgot-password", "/reset-password"].includes(
      pathname,
    )
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-3">
      <div className="nav-glass mx-auto flex h-14 max-w-content items-center justify-between gap-6 rounded-full border border-white/[0.14] px-3 backdrop-blur-2xl backdrop-saturate-150 md:px-4">
        {/* Left: mobile toggle + logo + links */}
        <div className="flex items-center gap-6">
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

          <div className="flex items-center gap-8">
            <Link
              href={authed ? "/dashboard" : "/"}
              className="flex items-center gap-2 font-bold tracking-tight text-white"
            >
              <Target className="h-5 w-5 text-white" />
              <span className="max-sm:hidden">Snipe</span>
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
              {items.map((item) => {
                const current = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      current ? "text-white" : "text-neutral-400 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          {authed ? (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-label="Account menu"
                onClick={() => setUserOpen((o) => !o)}
                className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                {initial}
              </button>
              {userOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.12] bg-neutral-900/95 p-1 shadow-xl backdrop-blur"
                >
                  {email && (
                    <div className="truncate px-3 py-2 text-xs text-neutral-500">
                      {email}
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
                    href="/pricing"
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    Billing &amp; plans
                  </Link>
                  <div className="my-1 h-px bg-white/[0.08]" />
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
                className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-content rounded-2xl border border-white/[0.12] bg-neutral-900/85 p-2 backdrop-blur-2xl md:hidden">
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(item.href, pathname) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href, pathname)
                    ? "bg-white/[0.06] text-white"
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
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
