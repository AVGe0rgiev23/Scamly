// Calls our own REST API from the family pages (Client Components) and turns every
// answer into one simple result: { ok: true, data } or { ok: false, messageBg }.
// The pages never talk to the database directly: the API checks the login, the
// role and the owner, and RLS checks every row (two locks, BUILD_PLAN section 0).

import { bg } from "@/i18n/bg";

// The API's answer types, imported as TYPES only: `import type` is removed when the
// code is compiled, so no server code reaches the browser (like a Python TYPE_CHECKING import).
export type { PersonDetailsDto, PersonDto, DeviceDto } from "@/server/services/personService";
export type { ContactDto } from "@/server/services/contactService";
export type { CheckDto } from "@/schemas/checks";

// A result is either a success with data or a failure with a Bulgarian message
// (like returning a (ok, value) tuple in Python).
export type ApiResult<T> =
  { ok: true; status: number; data: T } | { ok: false; status: number; messageBg: string };

// The Bulgarian message of an API error body { error: { code, messageBg } }.
function messageOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (typeof error === "object" && error !== null && "messageBg" in error) {
      if (typeof error.messageBg === "string") {
        return error.messageBg;
      }
    }
  }
  return bg.errors.internal;
}

// One request to our API. `T` is the shape of a successful answer (like a Python
// TypeVar): the caller says what it expects, e.g. callApi<{ persons: PersonDto[] }>.
export async function callApi<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // No answer at all: offline, or the server is down.
    return { ok: false, status: 0, messageBg: bg.family.networkError };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null; // not JSON (e.g. a proxy error page)
  }
  if (!response.ok) {
    return { ok: false, status: response.status, messageBg: messageOf(data) };
  }
  return { ok: true, status: response.status, data: data as T };
}
