// Playwright settings for the W2-11 round-trip test (tests/roundtrip/): the whole
// demo flow against a REAL local Supabase. Run it with `npm run e2e:roundtrip`,
// which starts Supabase and sets the environment first (scripts/e2e/roundtrip.sh).
//
// Separate from playwright.config.ts because the normal browser tests fake the API
// and run without a database; this one needs Docker.

import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/roundtrip",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // One flow at a time: the test shares one database and one pairing rate limit.
  workers: 1,
  timeout: 120_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-roundtrip" }]],
  use: {
    baseURL: BASE_URL,
    serviceWorkers: "block",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
