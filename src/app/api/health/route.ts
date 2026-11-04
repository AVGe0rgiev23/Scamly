// GET /api/health: is the app up and can it reach the database? (BUILD_PLAN 3, #1)
//   200 { ok: true, db: true, time: "<ISO time>" }   the database answered
//   503 { ok: false, db: false }                      it didn't (no details, ever)
// Open to anyone, no login. Called every 12 hours by .github/workflows/keep-alive.yml,
// which keeps the free Supabase project from being paused (BUILD_PLAN R1).
//
// It uses the USER client with no login cookie, i.e. as a guest with only the
// publishable key. The districts table is public, so no secret key is needed: even if
// this route had a bug, it could not read or change anything private.

import { connection } from "next/server";
import { json } from "@/server/http/errors";
import { pingDistricts } from "@/server/repositories/districtsRepository";
import { checkHealth } from "@/server/services/healthService";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET() {
  // Every call must really query the database: never build this answer in advance
  // at `next build` time and never reuse an old one. connection() tells Next.js to
  // wait for a real request; json() adds `Cache-Control: no-store` for browsers and CDNs.
  await connection();

  const result = await checkHealth({
    // Creating the client is inside the check too, so missing Supabase settings
    // (e.g. in CI) give a clean 503 instead of a crash.
    pingDatabase: async () => pingDistricts(await createUserClient()),
    now: () => new Date(),
  });
  return json(result, result.ok ? 200 : 503);
}
