// GET /api/moderation/reports?status=pending&cursor=<id>: the moderation queue of
// public reports (BUILD_PLAN 3, #28; task W3-04). Moderator or admin only.
//   200 { reports: [{ id, districtCode, scriptType, occurredOn, submittedAt,
//         description, hasCallerNumber, sameNumberReports, status, reviewedAt,
//         reviewedByName, rejectReason }], nextCursor }
//       newest first, 25 per page; status "pending" (default), "approved" or
//       "rejected"; nextCursor = the id to send as `cursor` for the next page
//   400 bad status or cursor, 401 not logged in, 403 another role
// Never cached ("no-store"): the queue is not public.

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import {
  createModerationDeps,
  listQueue,
  MODERATION_ROLES,
} from "@/server/services/moderationService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  // Wait for a real request: never build this answer at `next build` time.
  await connection();
  try {
    const client = await createUserClient();
    await requireRole(MODERATION_ROLES, client); // 1. who? (401/403)
    const url = new URL(request.url);
    // 2–3. Zod, then the page read with the moderator's own client (RLS)
    const page = await listQueue(createModerationDeps(client, createAdminClient), {
      status: url.searchParams.get("status") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return json(page);
  } catch (error) {
    return handleApiError(error);
  }
}
