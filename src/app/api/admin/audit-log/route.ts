// GET /api/admin/audit-log?cursor: the audit log for the admin (task W3-06,
// BUILD_PLAN 3 #35). Admin only. Newest first, 50 lines per page.
//   200 { entries: [{ id, createdAt, actorName, action, targetType, summary }], nextCursor }
//   400 invalid cursor, 401 / 403 not logged in / not an admin

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { createAdminDeps, listAuditLog } from "@/server/services/adminService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  await connection();
  try {
    const client = await createUserClient();
    await requireRole(["admin"], client); // 401 / 403
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    const page = await listAuditLog(createAdminDeps(client, createAdminClient), { cursor });
    return json(page);
  } catch (error) {
    return handleApiError(error);
  }
}
