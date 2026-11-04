// Next.js settings. These are the defaults that `create-next-app` chose for Next.js 16.4.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: pages are pre-rendered where possible and we choose what to cache
  // with "use cache". The Next.js docs say to turn on partialPrefetching together with it.
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker for web push (public/sw.js, task W2-05). No caching: the
  // browser must ask us for a newer version every time it checks, so a fix reaches
  // every phone at once. Its scope is "/" because the file is at the root of the site.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  // Tailwind CSS is processed by its own plugin for Turbopack (the Next.js bundler).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
