import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local logos are pre-sized during development. Serving them directly lets
  // Cloudflare cache immutable assets without invoking an image Worker.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
