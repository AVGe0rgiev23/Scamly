// Vitest settings: our unit-test runner (like pytest for Python).
// Run the tests with `npm test`, or `npm run test:coverage` for a coverage report.

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same shortcut as in tsconfig.json: "@/config/app" means "src/config/app".
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" stops a browser bundle from importing server code. Tests are
      // not a browser, so they get the package's empty version instead.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    // Our unit tests run in plain Node.js (no browser needed).
    environment: "node",
    // Unit tests live next to the code (src/**/*.test.ts). Playwright tests (tests/e2e) are not ours.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
