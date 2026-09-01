"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const LINKS = ["Home", "Pricing", "Features", "Docs", "Blog"] as const;

/**
 * Pill navbar: a dark rounded bar ringed in white, with a white "active" pill
 * that slides between items. CSS-only motion (no animation dependency) — the
 * indicator is positioned from each item's measured offset so widths can vary.
 */
export function Navbar() {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

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
      {LINKS.map((link, i) => (
        <button
          key={link}
          type="button"
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          onClick={() => setActive(i)}
          aria-current={active === i ? "page" : undefined}
          className={cn(
            "relative z-10 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-300",
            active === i ? "text-black" : "text-neutral-400 hover:text-white",
          )}
        >
          {link}
        </button>
      ))}
    </nav>
  );
}

export default Navbar;
