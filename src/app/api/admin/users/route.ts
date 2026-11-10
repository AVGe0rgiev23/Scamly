// GET /api/admin/users?q&role&cursor: the accounts of Scamly for the admin (task W3-06,
// BUILD_PLAN 3 #32). Admin only.
//   q       part of the display name, or part of the e-mail when it contains „@“
//   role    family | moderator | admin
//   cursor  the nextCursor of the previous page
//   200 { users: [{ id, displayName, role, email, createdAt, isSelf }], nextCursor }
//   400 invalid query, 401 / 403 not logged in / not an admin
// Phones of protected persons (role "protected") are never in the list.

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { createAdminDeps, listUsers } from "@/server/services/adminService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  await connection(); // a real request, never built at `next build` time
  try {
    const client = await createUserClient();
    const actor = await requireRole(["admin"], client); // 401 / 403
    const params = new URL(request.url).searchParams;
    const result = await listUsers(createAdminDeps(client, createAdminClient), actor, {
      q: params.get("q") ?? undefined,
      role: params.get("role") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
    });
    return json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
