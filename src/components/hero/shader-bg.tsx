"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Full-bleed animated shader background for the hero, monochrome to match the
 * black & white theme. WebGL via @paper-design/shaders-react — CSP-safe (no
 * eval / no external requests). Motion pauses under prefers-reduced-motion.
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
      <MeshGradient
        colors={["#000000", "#0d0d0d", "#1d1d1d", "#343434", "#5c5c5c"]}
        distortion={0.9}
        swirl={0.5}
        grainOverlay={0.06}
        speed={reduced ? 0 : 0.3}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
