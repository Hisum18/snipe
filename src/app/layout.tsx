import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

import { Navbar } from "@/components/navbar/navbar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { limitsFor } from "@/config/plans";
import { getCurrentUser } from "@/lib/auth/session";

// Self-hosted by next/font (no external stylesheet), so CSP stays font-src 'self'.
// Space Grotesk for headings (applied to h1-h4 in globals.css), Inter for
// body, JetBrains Mono for timestamps and labels.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Snipe — Apply before the flood",
  description:
    "Snipe alerts you within minutes when a company posts a new job, by polling applicant tracking systems directly. Be first in the queue.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const planLabel = user ? limitsFor(user.plan, user.planStatus).label : undefined;
  // Theme is read from a cookie server-side and baked straight into the
  // initial HTML — no flash, and no client bootstrap script needed (every
  // route here is already dynamically rendered via getCurrentUser() above,
  // so reading a cookie costs nothing extra). ThemeProvider's toggle writes
  // this same cookie. Defaults to "dark" (the brand default) for a
  // first-ever visit with no stored preference.
  const theme = cookieStore.get("snipe-theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh bg-black font-sans text-fg antialiased">
        <ThemeProvider initialTheme={theme}>
          <Navbar authed={!!user} email={user?.email ?? undefined} planLabel={planLabel} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
