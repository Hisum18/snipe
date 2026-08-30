import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Snipe — Apply before the flood",
  description:
    "Snipe alerts you within minutes when a company posts a new job, by polling applicant tracking systems directly. Be first in the queue.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
