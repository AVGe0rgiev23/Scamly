// The PUBLIC Supabase client: the publishable key only, no login cookies at all.
//
// For public data that is the same for every visitor (the scam map, GET
// /api/map/stats). It always acts as a guest, so:
//   * RLS treats it like anyone on the internet (it can't see anything private);
//   * the answer doesn't depend on who asks, so a CDN may cache it for everybody;
//   * it never reads or writes cookies (the user client does, which would make a
//     shared cache unsafe).
// Like userClient.ts, create a new one for each request.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/publicEnv";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

export function createPublicClient(): DbClient {
  const env = getPublicEnv();
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
