// Database queries for the districts table (the 28 Bulgarian districts, BUILD_PLAN 2.1).
//
// For now it holds only the health check's query. The table is public: RLS lets
// anyone read it (migration 4, "Anyone can read districts"), so the query works with
// the publishable key alone and needs no secret key and no logged-in user.

import type { DbClient } from "@/server/supabase/userClient";

// How long the health check waits for the database before it gives up.
// Without a limit, a paused or broken project could keep the request open until
// Vercel stops the function; with it, /api/health answers 503 after 5 seconds.
export const PING_TIMEOUT_MS = 5_000;

// Reads one district code: the cheapest real query we have (one tiny row, one index).
// Throws when the database can't be reached or answers with an error.
// An empty answer still counts as "the database works": the query itself succeeded.
export async function pingDistricts(client: DbClient): Promise<void> {
  const { error } = await client
    .from("districts")
    .select("code")
    .limit(1)
    // AbortSignal.timeout() cancels the HTTP request after the given time
    // (like `requests.get(url, timeout=5)` in Python).
    .abortSignal(AbortSignal.timeout(PING_TIMEOUT_MS));
  if (error) {
    throw new Error(`pingDistricts failed: ${error.message}`);
  }
}
