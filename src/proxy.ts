import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content-Security-Policy with a fresh nonce.
 *
 * Next.js reads the nonce from the CSP header we set on the *request* and
 * applies it to its own inline bootstrap scripts, which lets us ship a strict
 * `script-src` with NO `unsafe-inline`. `strict-dynamic` allows scripts loaded
 * by the nonce'd bootstrap to run without individually listing hosts.
 *
 * The other security headers (HSTS, nosniff, frame options, referrer policy)
 * are set statically in next.config.mjs.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV !== "production";
  // In dev, Next injects eval-based HMR/refresh scripts; allow them in dev only.
  // Stripe.js (Embedded Checkout) is injected by our nonce'd bundle, so
  // strict-dynamic already admits it; the host is listed for CSP2 browsers.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://js.stripe.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Tailwind ships a static stylesheet; style-src 'self' is enough. We allow
    // inline styles because React sets a few (e.g. hidden) — no script risk.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.stripe.com`,
    `font-src 'self'`,
    // Our own origin, plus Stripe for Embedded Checkout (the upgrade dialog).
    `connect-src 'self' https://api.stripe.com https://checkout.stripe.com`,
    `frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://hooks.stripe.com`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    isDev ? "" : `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Skip static assets and image optimizer; apply to everything else.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
