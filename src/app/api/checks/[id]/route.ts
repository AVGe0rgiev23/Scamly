// GET /api/checks/:id: one check with its answers, verdict and „Обаждам ѝ се сега“
// (BUILD_PLAN 3, #22). Family with access to the person, or the phone that started
// it. 200 { check }. Anything the caller may not see -> 404.
// The phone polls this (or gets a Realtime ping) to show „Иван ще ви се обади веднага.“

import { connection } from "next/server";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { createCheckDeps, getCheck } from "@/server/services/checkService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(_request: Request, context: RouteContext<"/api/checks/[id]">) {
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["family", "protected"], client); // 1. who are you?
    const { id } = await context.params;
    const checkId = IdParamSchema.safeParse(id); // 2. valid id? (else 404)
    if (!checkId.success) {
      throw notFound();
    }
    const deps = createCheckDeps(client, createAdminClient());
    const check = await getCheck(deps, actor, checkId.data); // 3. RLS + own-phone rule
    return json({ check }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
