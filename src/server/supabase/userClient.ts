// The USER-SCOPED Supabase client: talks to the database as the logged-in person.
//
// It reads the login cookies of the current request, so every query runs with that
// person's JWT and PostgreSQL's RLS policies decide what they may see (the "second
// lock", BUILD_PLAN section 0). Use this client wherever possible; the admin client
// (adminClient.ts) is only for the short list in BUILD_PLAN 2.4.
//
// Create a new one for every request (never share it between requests).

import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/publicEnv";
import { AUTH_COOKIE_OPTIONS } from "@/server/supabase/cookieOptions";
import type { Database } from "@/types/database";

// A Supabase client that knows our tables (from src/types/database.ts), so a typo in
// a column name is a type error. Used for both the user and the admin client.
export type DbClient = SupabaseClient<Database>;

export async function createUserClient(): Promise<DbClient> {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      // Give @supabase/ssr all cookies of the request (it picks its own).
      getAll() {
        return cookieStore.getAll();
      },
      // Called when the session changes (login, logout, token refresh).
      // In Route Handlers this puts Set-Cookie headers on the response. Server
      // Components (pages) are not allowed to set cookies, so there it fails; that
      // is fine, because the proxy (src/proxy.ts) already refreshed the session.
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Called from a Server Component: ignore (see above).
        }
      },
    },
  });
}
