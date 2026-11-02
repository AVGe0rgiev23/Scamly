// Checks the server's environment variables (keys, secrets, settings) with Zod.
//
// The full list, with an explanation of each variable, is in .env.example.
// The check runs only when getServerEnv() is called (not when this file is imported),
// so `next build` still works on a machine that has no .env.local file.
//
// Only server code may import this file: it returns secret keys.
// The feature switches (FEATURE_*) are read separately in src/config/features.ts.

import { z } from "zod";

// The rules for every variable. A Zod schema is like a Pydantic model in Python.
const serverEnvSchema = z.object({
  // Supabase (database + login). Needed from Week 1.
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Secret "pepper" values mixed into hashes (pairing codes, phone numbers).
  PAIRING_PEPPER: z.string().min(32, "must be at least 32 characters long"),
  HASH_PEPPER: z.string().min(32, "must be at least 32 characters long"),

  // E-mail. "noop" sends nothing, which is the safe default for local work.
  EMAIL_PROVIDER: z.enum(["brevo", "resend", "noop"]).default("noop"),
  BREVO_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.email().optional(),

  // Web push (Week 2).
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),

  // AI providers (Week 3, optional feature).
  GEMINI_API_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),

  // Shared secret that protects our scheduled (cron) endpoints.
  CRON_SECRET: z.string().min(1).optional(),
});

// The type of the checked result, worked out from the schema
// (like getting a Python class from a Pydantic model for free).
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Environment variables can be missing, so every value may be undefined.
// Record<string, string | undefined> is like Python's dict[str, str | None].
type Env = Record<string, string | undefined>;

// Turns empty strings into "missing", so `KEY=` in .env.local counts as not set.
function dropEmptyValues(env: Env): Env {
  const cleaned: Env = {};
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined && value.trim() !== "") {
      cleaned[name] = value;
    }
  }
  return cleaned;
}

// Checks the variables and returns them with the right types.
// Throws an error that names every wrong or missing variable (never their values).
// Tests pass their own `env` object; the app uses the real process.env.
export function getServerEnv(env: Env = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(dropEmptyValues(env));
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables (see .env.example):\n${problems.join("\n")}`);
  }
  return result.data;
}
