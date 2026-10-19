import type { NextConfig } from "next";

// Defence-in-depth response headers applied to every route. A full
// Content-Security-Policy is intentionally left off for now: the admin panel
// embeds Aadhaar scans (images and PDFs) straight from Vercel Blob in an
// <iframe>, so a policy would have to allow those hosts and be re-tested on
// every page before it could be trusted not to break the app.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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
