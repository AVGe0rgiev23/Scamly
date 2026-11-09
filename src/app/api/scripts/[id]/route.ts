// /api/scripts/:id: one card of the scam-script library, for the moderator's editor
// (BUILD_PLAN 3, #31; task W3-05). Moderator or admin only.
//
// GET   /api/scripts/:id   200 { script }  (also a draft)
// PATCH /api/scripts/:id   change any fields, at least one: slug, scriptType, titleBg,
//                          howItStartsBg, whatTheySayBg, whatToDoBg, extraKeywords,
//                          published. Audited: "script_published" when a draft goes
//                          live, otherwise "script_updated".
//   200 { script }, 400 invalid input, 401 / 403, 404 no such card, 409 slug taken

import { connection } from "next/server";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createScriptDeps, getScript, updateScript } from "@/server/services/scriptService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

// The id from the address; anything that is not an id answers 404, like a wrong id.
async function scriptIdOf(context: RouteContext<"/api/scripts/[id]">): Promise<string> {
  const { id } = await context.params;
  const parsed = IdParamSchema.safeParse(id);
  if (!parsed.success) {
    throw notFound();
  }
  return parsed.data;
}

export async function GET(_request: Request, context: RouteContext<"/api/scripts/[id]">) {
  await connection();
  try {
    const client = await createUserClient();
    await requireRole(["moderator", "admin"], client); // 401 / 403
    const id = await scriptIdOf(context);
    const script = await getScript(createScriptDeps(client, createAdminClient), id);
    return json({ script });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/scripts/[id]">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["moderator", "admin"], client); // 1. who? (401/403)
    const id = await scriptIdOf(context); // 2. a valid id? (else 404)
    const body = await readJsonBody(request);
    // 3–5. Zod, update with the moderator's client (RLS), audit line
    const script = await updateScript(createScriptDeps(client, createAdminClient), actor, id, body);
    return json({ script });
  } catch (error) {
    return handleApiError(error);
  }
}
