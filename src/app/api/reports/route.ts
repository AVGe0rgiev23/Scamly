// POST /api/reports: an anonymous report of a scam call for the public map
// (BUILD_PLAN 3, #27; task W3-01). Anyone may send one, no login.
// Body: { districtCode: "BG-02", scriptType: "police", occurredOn: "2026-11-08",
//         description?: "…", callerNumber?: "0888 123 456", website: "" }
//   201 { ok: true }   stored as "pending" (a moderator approves it before it counts on
//                      the map); ALSO when the hidden "website" field (the honeypot) is
//                      filled in, but then nothing is stored
//   400 invalid input, 403 from another site, 429 after 3 reports per IP per hour
// The IP is never stored (only an HMAC in the rate limiter), the description is
// stored with personal data removed, the caller's number only as an HMAC.

import { handleApiError, json } from "@/server/http/errors";
import { getClientIp, readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createReportDeps, submitReport } from "@/server/services/reportService";
import { createAdminClient } from "@/server/supabase/adminClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const body = await readJsonBody(request);
    // Guests have no INSERT right on `reports`: storing needs the admin client
    // (BUILD_PLAN 2.4, use 5), after our own checks in the service.
    const deps = createReportDeps(createAdminClient());
    // 1–5. input, rate limits, honeypot, redaction + hashing, store as "pending"
    const result = await submitReport(deps, body, getClientIp(request));
    return json(result, 201); // 6. respond (the same answer for real and honeypot reports)
  } catch (error) {
    return handleApiError(error);
  }
}
