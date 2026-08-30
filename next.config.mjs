/** @type {import('next').NextConfig} */

// Static security headers applied to every response.
// NOTE: Content-Security-Policy is intentionally NOT set here. It is set
// per-request in src/middleware.ts with a fresh nonce so we can avoid
// `unsafe-inline` for scripts. Setting a static CSP here would either force
// `unsafe-inline` (forbidden) or fight the nonce-based middleware policy.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // We never render remote/ATS-controlled images; disable remote optimization.
  images: { remotePatterns: [] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
