// The two PUBLIC Supabase settings: the project URL and the publishable key.
//
// "Public" means they may reach the browser: the publishable key (new format
// sb_publishable_…, called "anon key" in older projects) only lets a caller do what
// RLS allows. The secret keys and peppers are read in src/lib/env.ts (server only).
//
// This file is used by the browser client, the proxy and the server clients.

import { z } from "zod";

const publicEnvSchema = z.object({
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(1),
});

// Like a small Python dataclass with two str fields.
export type PublicEnv = z.infer<typeof publicEnvSchema>;

// Returns the public settings, or null when they are not set (e.g. in CI, where the
// app runs without a Supabase project). The names are written out in full
// (process.env.NEXT_PUBLIC_…) because Next.js copies these values into the browser
// code only when it sees the exact name.
export function readPublicEnv(): PublicEnv | null {
  const result = publicEnvSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return result.success ? result.data : null;
}

// Same as readPublicEnv(), but throws when the settings are missing.
// Used where the app can't work without Supabase (API routes, logged-in pages).
export function getPublicEnv(): PublicEnv {
  const env = readPublicEnv();
  if (env === null) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)",
    );
  }
  return env;
}
