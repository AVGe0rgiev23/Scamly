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
      // The invite page has a secret token in its address (/pokana?t=…, W2-14): the
      // browser must never send that address to another page or site as `Referer`.
      // The same for login and registration while they carry it in `next`.
      {
        source: "/pokana",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/:page(vhod|registratsia)",
        has: [{ type: "query", key: "next" }],
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
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
