import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

import { Navbar } from "@/components/navbar/navbar";
import { getCurrentUser } from "@/lib/auth/session";

// Self-hosted by next/font (no external stylesheet), so CSP stays font-src 'self'.
const sans = Plus_Jakarta_Sans({
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
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Navbar authed={!!user} email={user?.email ?? undefined} />
        {children}
      </body>
    </html>
  );
}
