// Errors and JSON answers of our REST API.
//
// Every API error has the same shape, so the forms can always show it:
//   { "error": { "code": "invalid_code", "messageBg": "Кодът е грешен или е изтекъл." } }
// `code` is for the program (English, stable), `messageBg` is for the person.
//
// Route handlers throw an ApiError anywhere (like `raise HTTPException(...)` in
// Python's FastAPI) and catch everything at the end with handleApiError(), which
// turns it into a Response. No stack traces ever reach the browser.

import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { bg } from "@/i18n/bg";

// An error that already knows its HTTP status and its Bulgarian message.
// `extends Error` is like `class ApiError(Exception)` in Python.
export class ApiError extends Error {
  status: number;
  code: string;
  messageBg: string;

  constructor(status: number, code: string, messageBg: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.messageBg = messageBg;
  }
}

// Shortcuts for the common errors (BUILD_PLAN section 3, "Status codes").
export function badRequest(code: string, messageBg: string): ApiError {
  return new ApiError(400, code, messageBg);
}
export function unauthorized(): ApiError {
  return new ApiError(401, "unauthorized", bg.errors.unauthorized);
}
export function forbidden(): ApiError {
  return new ApiError(403, "forbidden", bg.errors.forbidden);
}
// We answer 404 (not 403) for things the caller may not see, so we don't reveal
// that they exist.
export function notFound(): ApiError {
  return new ApiError(404, "not_found", bg.errors.notFound);
}
export function conflict(code: string, messageBg: string): ApiError {
  return new ApiError(409, code, messageBg);
}
export function tooManyRequests(): ApiError {
  return new ApiError(429, "rate_limited", bg.errors.rateLimited);
}

// The shape of an error body. `fields` lists the invalid input fields (validation only).
export type ErrorBody = {
  error: { code: string; messageBg: string; fields?: string[] };
};

// A JSON answer. "no-store": answers of our API are personal, never cache them.
export function json(data: unknown, status: number = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Turns ANY thrown value into a safe JSON error answer.
export function handleApiError(error: unknown): Response {
  // Next.js itself also uses thrown errors as signals (e.g. "stop prerendering here").
  // Those must not be caught by us, so we throw them on. (`unstable_` = the name may
  // change in a later Next.js version.)
  unstable_rethrow(error);

  if (error instanceof ApiError) {
    const body: ErrorBody = { error: { code: error.code, messageBg: error.messageBg } };
    return json(body, error.status);
  }

  // Invalid input. Our Zod schemas (src/schemas) carry Bulgarian messages from bg.ts,
  // so the first problem's message is already the right text for the person.
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const fields = error.issues.map((issue) => issue.path.join("."));
    const body: ErrorBody = {
      error: {
        code: "validation",
        messageBg: first?.message ?? bg.errors.validation,
        fields,
      },
    };
    return json(body, 400);
  }

  // Anything else is a bug or an outage: log it for us (only the name and message,
  // which never contain passwords), and give the person a friendly message.
  const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error("[api] unexpected error:", description);
  const body: ErrorBody = { error: { code: "internal", messageBg: bg.errors.internal } };
  return json(body, 500);
}
