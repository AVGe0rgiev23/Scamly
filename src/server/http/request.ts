// Small helpers for reading an incoming API request.

import { ApiError } from "@/server/http/errors";
import { bg } from "@/i18n/bg";

// Reads the JSON body. A body that is not valid JSON becomes a 400 error
// (instead of a crash and a 500). The result is `unknown`: Zod checks it next.
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", bg.errors.invalidJson);
  }
}

// The caller's IP address, used only for rate limiting (and only as an HMAC, see
// src/server/security/rateLimit.ts). On Vercel, x-real-ip and x-forwarded-for are
// set by Vercel itself, so the caller can't fake them there. Locally they are
// usually missing, so every local request shares the bucket "unknown".
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp !== null && realIp.trim() !== "") {
    return realIp.trim();
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor !== null) {
    // "client, proxy1, proxy2": the first one is the original caller.
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return "unknown";
}
