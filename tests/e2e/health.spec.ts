// End-to-end test for GET /api/health (the keep-alive endpoint, HOW_IT_WORKS 3.22).
//
// In CI there is no Supabase project, so the database check fails there and the
// route answers 503. This test therefore checks the SHAPE of the answer (both the
// healthy and the unhealthy one), and that it is never cached, not that the
// database is up. The live check against Supabase is done by hand (and every 12 hours
// by .github/workflows/keep-alive.yml).

import { expect, test } from "@playwright/test";

test("/api/health answers JSON with ok, never cached", async ({ request }) => {
  const response = await request.get("/api/health");

  expect([200, 503]).toContain(response.status());
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = await response.json();
  if (response.status() === 200) {
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    // The time is a real ISO date (Date.parse gives NaN for anything else).
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  } else {
    // The unhealthy answer has exactly these two fields: no error details.
    expect(body).toEqual({ ok: false, db: false });
  }
});
