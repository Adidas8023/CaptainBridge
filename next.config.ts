import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // GA4 via the shared /abel-analytics.js (Google's documented GA4 hosts).
  "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // Reown AppKit's wallet modal loads its typeface from fonts.reown.com.
  "font-src 'self' data: https://fonts.reown.com",
  "connect-src 'self' https: wss:",
  "frame-src https:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Each route group has its own root layout (wallet code only on /bridge and
    // /history), so the 404 page needs to be self-contained.
    globalNotFound: true,
  },
  // Local logos are pre-sized during development. Serving them directly lets
  // Cloudflare cache immutable assets without invoking an image Worker.
  images: {
    unoptimized: true,
  },
  async redirects() {
    return ['en', 'zh'].map((language) => ({
      source: '/',
      has: [{ type: 'query' as const, key: 'lang', value: language }],
      destination: `/${language}`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        // workers.dev version-preview URLs serve the same pages; keep them out of search.
        source: '/:path*',
        has: [{ type: 'host' as const, value: '(?<host>.+)\\.workers\\.dev' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
