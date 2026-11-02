// Next.js settings. These are the defaults that `create-next-app` chose for Next.js 16.4.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: pages are pre-rendered where possible and we choose what to cache
  // with "use cache". The Next.js docs say to turn on partialPrefetching together with it.
  cacheComponents: true,
  partialPrefetching: true,
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
