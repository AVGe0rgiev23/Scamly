// End-to-end checks of the moderation API (W3-04) that need no database: a request
// from another site is refused before anything else happens (CSRF, 3.12). The role
// checks, the compare-and-set and the audit line are unit-tested with fakes
// (src/server/services/moderationService.test.ts) and were checked live; the moderation
// screen (W3-04 UI) is still to come.

import { expect, test } from "@playwright/test";
import { bg } from "@/i18n/bg";

const REPORT = "/api/moderation/reports/c0000000-0000-4000-8000-000000000001";

test("PATCH from another site is refused with 403", async ({ request }) => {
  const response = await request.patch(REPORT, {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { decision: "approve" },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.messageBg).toBe(bg.errors.badOrigin);
});
