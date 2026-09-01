import type { Config } from "tailwindcss";

/** RGB-channel CSS var → color with alpha support. */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: withAlpha("--bg"),
        surface: {
          DEFAULT: withAlpha("--surface"),
          2: withAlpha("--surface-2"),
        },
        fg: withAlpha("--fg"),
        muted: withAlpha("--muted"),
        border: withAlpha("--border"),
        primary: {
          DEFAULT: withAlpha("--primary"),
          bright: withAlpha("--primary-bright"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
          bright: withAlpha("--accent-bright"),
        },
        warning: withAlpha("--warning"),
        destructive: withAlpha("--destructive"),
        ring: withAlpha("--ring"),
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--primary) / 0.25), 0 8px 40px -12px rgb(var(--primary) / 0.45)",
        card: "0 1px 0 0 rgb(var(--border) / 0.06), 0 20px 40px -24px rgb(0 0 0 / 0.8)",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
