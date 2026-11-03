// The BROWSER Supabase client, for code that runs on the phone or computer.
//
// It uses only the publishable key, so it can do only what RLS allows a guest.
// Our login cookies are HttpOnly (src/server/supabase/cookieOptions.ts), so this
// client can NOT read the user's session: that is on purpose, JavaScript never sees
// the tokens. Rule 1 of BUILD_PLAN section 0: the browser never writes to the
// database; every write goes through our API.
//
// What it is for: Realtime subscriptions (live alerts, Week 2). For those, the page
// will ask our API for a short-lived access token and pass it to
// client.realtime.setAuth(token).

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/publicEnv";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  const env = getPublicEnv();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
