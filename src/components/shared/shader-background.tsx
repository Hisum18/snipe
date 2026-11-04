"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { usePrefersReducedMotion, useIsMobile } from "@/lib/hooks";
import { useTheme } from "@/components/theme/theme-provider";

// WebGL shader color props can't consume CSS custom properties, so these are
// hardcoded — bg/surface match --bg/--surface in globals.css, and `muted` is a
// heavily muted version of each theme's brand color. Keep in sync if those
// tokens ever change.
const DARK = {
  bg: "#080908",
  surface: "#101211",
  muted: "#163322", // a deep green lift — the dark theme's brand green, muted
};
const LIGHT = {
  bg: "#F7F3EA",
  surface: "#FFFCF6",
  muted: "#DCE2EE", // a pale navy haze — the light theme's brand navy, muted
};

type ShaderBackgroundProps = {
  className?: string;
};

/**
 * A very subtle ambient gradient mesh used behind the auth split-panel —
 * close-in-value tones only,
 * low opacity, slow motion, so it reads as soft ambient light rather than a
 * competing visual. Falls back to a static radial gradient under
 * prefers-reduced-motion, and skips the second layer on mobile to keep it
 * light. Picks a light or dark color set via useTheme() so it never renders
 * as a jarring dark patch on the light theme.
 */
export function ShaderBackground({ className }: ShaderBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const shaderSpeed = isMobile ? 0.08 : 0.15;
  const palette = theme === "light" ? LIGHT : DARK;

  if (reducedMotion) {
    return (
      <div
        className={`absolute inset-0 ${className ?? ""}`}
        style={{
          background: `radial-gradient(circle at 30% 20%, ${palette.muted} 0%, ${palette.bg} 60%)`,
        }}
      />
    );
  }

  return (
    <div className={`absolute inset-0 opacity-60 ${className ?? ""}`}>
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={[palette.bg, palette.surface, palette.muted]}
        speed={shaderSpeed}
      />
    </div>
  );
}
