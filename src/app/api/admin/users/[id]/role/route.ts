// PATCH /api/admin/users/:id/role { role: family | moderator | admin } (task W3-06,
// BUILD_PLAN 3 #33). Admin only, audited ("role_changed" with the old and new role).
//   200 { user }
//   400 invalid body, 401 / 403 not logged in / not an admin / from another site,
//   404 no such account, 409 own account, a phone, or changed meanwhile

import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { changeRole, createAdminDeps } from "@/server/services/adminService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[id]/role">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["admin"], client); // 1. an admin? (401/403)
    const { id } = await context.params;
    const parsed = IdParamSchema.safeParse(id); // 2. a valid id? (else 404)
    if (!parsed.success) {
      throw notFound();
    }
    const body = await readJsonBody(request);
    // 3–7. Zod, the rules, the change (service role), the audit line
    const user = await changeRole(
      createAdminDeps(client, createAdminClient),
      actor,
      parsed.data,
      body,
    );
    return json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
