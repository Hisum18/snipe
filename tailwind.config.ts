import type { Config } from "tailwindcss";

/** RGB-channel CSS var → color with alpha support. */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

/**
 * Borders written as `border-white/[x]` (the app's long-standing hairline
 * idiom) resolve to the palette's real border colors instead of text at an
 * opacity: faint ones (≤10%) to --border, emphasized ones (button outlines,
 * featured cards) to --border-strong. Also covers `divide-white/[x]`.
 */
const lineColor = ({ opacityValue }: { opacityValue?: string }) => {
  const alpha = Number.parseFloat(opacityValue ?? "");
  return Number.isFinite(alpha) && alpha <= 0.1
    ? "rgb(var(--border))"
    : "rgb(var(--border-strong))";
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Theme-aware literal remap ---
        // The app almost never uses the semantic tokens below (bg-bg, text-fg,
        // text-muted, ...) — every real page uses raw Tailwind literals
        // (bg-black, text-white, text-neutral-400, border-white/[x]). Since
        // those literals are used consistently (never gray/slate/zinc),
        // pointing them at the theme CSS vars (globals.css) retints and
        // re-themes the whole app from here instead of touching 30 files
        // individually — `black` tracks --bg (page canvas) and `white`
        // tracks --fg (primary text), so e.g. a literal `bg-white text-black`
        // button automatically becomes "foreground-colored fill, background-
        // colored label" in both light and dark.
        black: withAlpha("--bg"),
        white: withAlpha("--fg"),
        neutral: {
          200: withAlpha("--n-200"),
          300: withAlpha("--n-300"),
          400: withAlpha("--n-400"),
          500: withAlpha("--n-500"),
          600: withAlpha("--n-600"),
          700: withAlpha("--n-700"),
          900: withAlpha("--n-900"),
          950: withAlpha("--n-950"),
        },

        // --- Snipe's native tokens (unchanged) ---
        bg: withAlpha("--bg"),
        // Selected/active states (nav, sidebar, toggles, badges): a tint and
        // its text color, tuned per palette for AA.
        selected: {
          DEFAULT: withAlpha("--selected"),
          foreground: withAlpha("--selected-fg"),
        },
        // Deep carbon: the footer band and other dark sections.
        deep: withAlpha("--deep"),
        surface: {
          DEFAULT: withAlpha("--surface"),
          2: withAlpha("--surface-2"),
        },
        fg: withAlpha("--fg"),
        muted: withAlpha("--muted"),
        // The selected segment in a segmented control.
        raised: withAlpha("--raised"),
        border: {
          DEFAULT: withAlpha("--border"),
          strong: withAlpha("--border-strong"),
        },
        // The accent for marks, lines and text: `brand` for
        // dots, badges, indicators, charts, selected outlines and the mark;
        // `brand-text` for small text and links. Buttons use `accent` below.
        brand: {
          DEFAULT: withAlpha("--brand"),
          text: withAlpha("--brand-text"),
        },
        // Secondary accent (concrete): avatars, icons, soft details — never
        // text on light backgrounds.
        "accent-2": withAlpha("--accent-2"),
        "accent-2-foreground": withAlpha("--accent-2-ink"),
        primary: {
          DEFAULT: withAlpha("--primary"),
          bright: withAlpha("--primary-bright"),
          // shadcn pairing: text on a --primary fill.
          foreground: withAlpha("--bg"),
        },
        // Primary button fill (racing red in both themes) and its label.
        accent: {
          DEFAULT: withAlpha("--brand-fill"),
          bright: withAlpha("--brand"),
          foreground: withAlpha("--brand-ink"),
        },
        warning: withAlpha("--warning"),
        destructive: {
          DEFAULT: withAlpha("--destructive"),
          foreground: withAlpha("--destructive-ink"),
        },
        ring: withAlpha("--ring"),

        // --- shadcn/ui token aliases, mapped onto the same channels so the
        // installed primitives (button/card/toggle) render in Snipe's palette
        // instead of pulling in a second theme. Additive: no native key above
        // is redefined, so existing `text-muted`, `bg-primary`, etc. are intact.
        background: withAlpha("--bg"),
        foreground: withAlpha("--fg"),
        card: withAlpha("--surface"),
        "card-foreground": withAlpha("--fg"),
        popover: withAlpha("--surface"),
        "popover-foreground": withAlpha("--fg"),
        secondary: withAlpha("--surface-2"),
        "secondary-foreground": withAlpha("--fg"),
        "muted-foreground": withAlpha("--muted"),
        "primary-foreground": withAlpha("--bg"),
        "accent-foreground": withAlpha("--brand-ink"),
        "destructive-foreground": withAlpha("--destructive-ink"),
        input: withAlpha("--border"),
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
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "rgb(var(--border))",
        // Tailwind accepts color functions at runtime; its types don't model them.
        white: lineColor as unknown as string,
      },
      borderRadius: {
        // Refined, not bubbly: 8px on buttons/inputs/nav items, 12px on
        // cards, 18px on the largest panels. `full` stays circular (avatars,
        // dots, switches).
        lg: "8px",
        xl: "12px",
        "2xl": "12px",
        "3xl": "18px",
      },
      boxShadow: {
        // Soft shadows (--shadow is carbon in light mode, black in dark).
        card: "0 1px 2px rgb(var(--shadow) / 0.05), 0 10px 28px -20px rgb(var(--shadow) / 0.22)",
        float: "0 2px 8px rgb(var(--shadow) / 0.05), 0 32px 64px -24px rgb(var(--shadow) / 0.32)",
        overlay: "0 16px 40px -12px rgb(var(--shadow) / 0.35)",
      },
      maxWidth: {
        // The site frame shared by the navbar, hero and footer (rem, so it
        // grows with the large-display scaling in globals.css).
        content: "92rem",
      },
    },
  },
  plugins: [],
};

export default config;
