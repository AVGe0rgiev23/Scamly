// Checks the server's environment variables (keys, secrets, settings) with Zod.
//
// The full list, with an explanation of each variable, is in .env.example.
// The check runs only when getServerEnv() is called (not when this file is imported),
// so `next build` still works on a machine that has no .env.local file.
//
// Only server code may import this file: it returns secret keys.
// The feature switches (FEATURE_*) are read separately in src/config/features.ts.

import { z } from "zod";

// Used by .catch() below: warns that an optional variable was ignored, then returns
// the safe value (like a Python "except ValueError: warn(...); return default").
function fallback<T>(name: string, safeValue: T): T {
  console.warn(`[env] ${name} has an invalid value and is ignored; using the safe default.`);
  return safeValue;
}

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
  // Optional extras must never take the whole server down: a wrong value here only
  // switches that extra off (with a warning naming the variable, never its value).
  EMAIL_PROVIDER: z
    .enum(["brevo", "resend", "noop"])
    .default("noop")
    .catch(() => fallback("EMAIL_PROVIDER", "noop" as const)),
  BREVO_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z
    .email()
    .optional()
    .catch(() => fallback("EMAIL_FROM", undefined)),

  // The site's public address, for links in alert e-mails, e.g. https://scamly.vercel.app
  // Optional: without it we use Vercel's own VERCEL_PROJECT_PRODUCTION_URL (Vercel sets
  // it automatically, without "https://"), and locally http://localhost:3000.
  SITE_URL: z
    .url()
    .optional()
    .catch(() => fallback("SITE_URL", undefined)),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),

  // Web push (W2-05). Optional: without both keys, push is simply off.
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  // Who runs the push sender: a "mailto:" or "https:" address the push services
  // (Google, Mozilla, Apple) may contact if our messages cause trouble.
  VAPID_SUBJECT: z
    .string()
    .regex(/^(mailto:|https:\/\/)\S+$/, 'must start with "mailto:" or "https://"')
    .default("mailto:scamly-demo@example.invalid")
    .catch(() => fallback("VAPID_SUBJECT", "mailto:scamly-demo@example.invalid")),

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
