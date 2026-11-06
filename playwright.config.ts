// Playwright settings: our end-to-end (e2e) tests, which click through the real app
// in a real browser. Run them with `npm run e2e`.
//
// Playwright builds and starts the app by itself (see `webServer` below), then runs every
// test twice: once on a desktop Chrome and once on a cheap Android phone screen.

import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// `process.env.CI` is set to "true" by GitHub Actions. `Boolean(...)` is like Python's bool(...).
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  // Fail the CI run if someone left `test.only` in a test file by mistake.
  forbidOnly: isCI,
  // On CI, try a failed test once more before calling it failed.
  retries: isCI ? 1 : 0,
  // "list" prints each test in the terminal; "html" saves a report to playwright-report/.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Save a trace (a recording of the test) when a test fails and is retried.
    trace: "on-first-retry",
    // Our service worker (public/sw.js, W2-09) would pass page loads through itself,
    // and page.route() can't see requests made by a service worker, so tests that
    // fake a page would hit the real server. Blocked by default; tests/e2e/pwa.spec.ts
    // allows it for the offline-card test.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Pixel 5: a typical small, cheap Android phone screen (393 × 851, touch).
      name: "android-phone",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    // Build the app and start it exactly as it runs in production.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    // Locally, reuse an app that is already running on port 3000 (faster).
    reuseExistingServer: !isCI,
    // Building can take a while on a slow machine: wait up to 3 minutes.
    timeout: 180_000,
  },
});
