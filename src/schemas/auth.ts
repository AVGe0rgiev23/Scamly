// Input rules (Zod schemas) for registration and login.
// Shared by the API routes and, later, by the forms in the browser (Session F).
// Every rule carries its Bulgarian error message from bg.ts, so the API can show
// the first problem directly (src/server/http/errors.ts).
// A Zod schema is like a Pydantic model in Python.

import { z } from "zod";
import { bg } from "@/i18n/bg";

export const RegisterSchema = z.object(
  {
    email: z.email({ error: bg.auth.emailInvalid }).max(254, { error: bg.auth.emailInvalid }),
    // 10+ characters (our rule); 72 is the most Supabase Auth (bcrypt) can use.
    password: z
      .string({ error: bg.auth.passwordTooShort })
      .min(10, { error: bg.auth.passwordTooShort })
      .max(72, { error: bg.auth.passwordTooLong }),
    displayName: z
      .string({ error: bg.auth.displayNameInvalid })
      .trim()
      .min(1, { error: bg.auth.displayNameInvalid })
      .max(60, { error: bg.auth.displayNameInvalid }),
  },
  { error: bg.errors.validation },
);

export const LoginSchema = z.object(
  {
    email: z.email({ error: bg.auth.emailInvalid }).max(254, { error: bg.auth.emailInvalid }),
    password: z
      .string({ error: bg.auth.passwordRequired })
      .min(1, { error: bg.auth.passwordRequired })
      .max(200, { error: bg.auth.invalidCredentials }),
  },
  { error: bg.errors.validation },
);

// The checked types (like the Python class you get from a Pydantic model).
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
