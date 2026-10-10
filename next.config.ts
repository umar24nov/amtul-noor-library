import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The public join form asks for scanned Aadhaar documents (jpgs, pngs and
  // pdfs), so the one-megabyte default body limit would reject a phone photo.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;