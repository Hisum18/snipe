"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ArrowRight, LogOut, Menu, Target, X } from "@/components/icons";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string };

const LOGGED_OUT: Item[] = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
];

const AUTHED: Item[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
];

/** Longest matching route wins; anchors on "/" stay Home. -1 = no active tab. */
function activeIndex(items: Item[], pathname: string): number {
  let best = -1;
  let bestLen = -1;
  items.forEach((it, i) => {
    const base = it.href.split("#")[0] || "/";
    const match = base === "/" ? pathname === "/" : pathname.startsWith(base);
    if (match && base.length > bestLen) {
      best = i;
      bestLen = base.length;
    }
  });
  return best;
}

/**
 * One shared, auth-aware site navbar (bundui navbars-04 layout, adapted to our
 * black & white palette). Rendered once from the root layout so it persists
 * across every route — the bar never remounts and the active pill slides
 * smoothly on navigation. CSS-only motion, no animation dependency.
 */
export function Navbar({ authed, email }: { authed: boolean; email?: string }) {
  const pathname = usePathname();
  const items = authed ? AUTHED : LOGGED_OUT;

  const [active, setActive] = useState(() => activeIndex(items, pathname));
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Follow route changes and close the mobile menu on navigation.
  useEffect(() => {
    setActive(activeIndex(items, pathname));
    setMobileOpen(false);
  }, [pathname, items]);

  // Position the sliding pill from the active tab's measured offset.
  useEffect(() => {
    function update() {
      const el = itemRefs.current[active];
      if (el && el.offsetWidth > 0) {
        setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
        setReady(true);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, items]);

  return (
    <div className="sticky top-0 z-40 bg-black/70 backdrop-blur-md">
      <div className="mx-auto max-w-content px-4 py-3">
        <header className="flex h-14 items-center justify-between gap-2 rounded-full border border-white/[0.12] bg-neutral-900/90 pl-3 pr-2">
          {/* Left: logo + desktop tabs */}
          <div className="flex items-center gap-4">
            <Link
              href={authed ? "/dashboard" : "/"}
              className="flex items-center gap-2 font-bold tracking-tight text-white"
            >
              <Target className="h-5 w-5 text-white" />
              <span className="max-sm:hidden">Snipe</span>
            </Link>

            {/* Desktop tabs with the sliding active pill */}
            <nav aria-label="Primary" className="relative hidden items-center md:flex">
              <span
                aria-hidden="true"
                style={{ left: indicator.left, width: indicator.width }}
                className={cn(
                  "absolute inset-y-1 rounded-full bg-white",
                  active >= 0 && ready
                    ? "opacity-100 transition-[left,width] duration-300 ease-out"
                    : "opacity-0",
                )}
              />
              {items.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  onClick={() => setActive(i)}
                  aria-current={active === i ? "page" : undefined}
                  className={cn(
                    "relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-300",
                    active === i ? "text-black" : "text-neutral-400 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            {authed ? (
              <>
                {email && (
                  <span className="hidden max-w-[16rem] truncate text-sm text-neutral-400 lg:inline">
                    {email}
                  </span>
                )}
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/#get-started"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
                >
                  Get alerts <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/[0.06] md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="mt-2 space-y-1 rounded-2xl border border-white/[0.12] bg-neutral-900/95 p-2 backdrop-blur md:hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={
                  activeIndex(items, pathname) === items.indexOf(item)
                    ? "page"
                    : undefined
                }
                className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            {!authed && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:hidden"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;
