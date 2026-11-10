// PATCH /api/moderation/reports/:id: a moderator approves or rejects one public
// report (BUILD_PLAN 3, #29; task W3-04). Moderator or admin only.
//   body { "decision": "approve" } or { "decision": "reject", "rejectReason": "…" }
//   200 { report: { id, status, reviewedAt, rejectReason } }
//   400 invalid input (a rejection needs a reason of 3–200 characters)
//   401 / 403 not logged in / another role, 403 also from another site (CSRF)
//   404 no such report, 409 already reviewed (only a PENDING report can change)
// Audited: "report_approved" / "report_rejected".

import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  createModerationDeps,
  MODERATION_ROLES,
  reviewReport,
} from "@/server/services/moderationService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/moderation/reports/[id]">,
) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(MODERATION_ROLES, client); // 1. who? (401/403)
    // 2. a valid id? Anything else answers 404, like an unknown id.
    const { id } = await context.params;
    const parsed = IdParamSchema.safeParse(id);
    if (!parsed.success) {
      throw notFound();
    }
    const body = await readJsonBody(request);
    // 3–5. Zod, compare-and-set with the moderator's client (RLS), audit line
    const report = await reviewReport(
      createModerationDeps(client, createAdminClient),
      actor,
      parsed.data,
      body,
    );
    return json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}
