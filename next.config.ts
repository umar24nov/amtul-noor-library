import type { NextConfig } from "next";

// Defence-in-depth response headers applied to every route. A full
// Content-Security-Policy is intentionally left off for now: it would have to
// be audited against every page (inline styles, fonts, images) before it could
// be trusted not to break the app.
//
// Framing is limited to this site rather than denied outright: the admin
// panel previews an Aadhaar PDF in an <iframe> served by the authenticated
// /api/aadhaar route, and that response has to be frameable by our own pages.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // The public join form asks for scanned Aadhaar documents (jpgs, pngs and
  // pdfs), so the one-megabyte default body limit would reject a phone photo.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
