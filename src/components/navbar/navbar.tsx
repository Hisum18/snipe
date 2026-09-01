"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "Sign in", href: "/login" },
] as const;

/** Which tab the current route maps to (anchors on "/" stay Home). */
function activeFromPath(pathname: string): number {
  if (pathname.startsWith("/pricing")) return 2;
  if (pathname.startsWith("/login")) return 3;
  return 0;
}

/**
 * Pill navbar: a dark rounded bar ringed in white with a white "active" pill
 * that slides between the real site tabs. CSS-only motion (no animation
 * dependency) — the indicator is positioned from each item's measured offset.
 */
export function Navbar() {
  const pathname = usePathname();
  const [active, setActive] = useState(() => activeFromPath(pathname));
  const [ready, setReady] = useState(false);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Follow route changes (e.g. navigating to /pricing highlights Pricing).
  useEffect(() => {
    setActive(activeFromPath(pathname));
  }, [pathname]);

  useEffect(() => {
    function update() {
      const el = itemRefs.current[active];
      if (el) {
        setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
        setReady(true);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active]);

  return (
    <nav
      aria-label="Primary"
      className="relative flex items-center rounded-full bg-neutral-900 p-1.5 ring-1 ring-white ring-offset-[5px] ring-offset-black"
    >
      {/* Sliding active pill (behind the labels). */}
      <span
        aria-hidden="true"
        style={{ left: indicator.left, width: indicator.width }}
        className={cn(
          "absolute inset-y-1.5 rounded-full bg-white",
          ready
            ? "opacity-100 transition-[left,width] duration-300 ease-out"
            : "opacity-0",
        )}
      />
      {ITEMS.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          onClick={() => setActive(i)}
          aria-current={active === i ? "page" : undefined}
          className={cn(
            "relative z-10 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] transition-colors duration-300",
            active === i ? "text-black" : "text-neutral-400 hover:text-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default Navbar;
