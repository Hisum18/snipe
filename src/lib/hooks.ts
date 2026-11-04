"use client";

import { useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeToMediaQuery(query),
    () => window.matchMedia(query).matches,
    () => false, // SSR snapshot: matches server-rendered markup, no hydration mismatch
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useIsMobile(breakpointPx = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpointPx - 1}px)`);
}
