"use client";

import { useEffect, useState } from "react";
import { Water } from "@paper-design/shaders-react";

/**
 * Full-bleed animated WATER background for the hero — a real-time caustic water
 * surface (on-theme for "apply before the flood"). WebGL via
 * @paper-design/shaders-react — CSP-safe (no eval / no external requests).
 * Near-monochrome to keep the black & white look; motion pauses under
 * prefers-reduced-motion.
 *
 * Video-ready: to use real nature footage instead, drop `hero-water.mp4` in
 * /public and replace <Water/> below with a muted, looping <video>.
 */
export function ShaderBg() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Water
        colorBack="#05080a"
        colorHighlight="#b9c6cc"
        caustic={0.7}
        waves={0.55}
        highlights={0.5}
        layering={0.55}
        edges={0.3}
        size={1.3}
        speed={reduced ? 0 : 0.45}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
