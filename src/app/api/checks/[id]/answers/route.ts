// PUT /api/checks/:id/answers: the older person's answers (BUILD_PLAN 3, #18).
// Phone only, only its own check, only once (while the status is "started").
// Body: { claimedIdentity, asksMoney, handover, rushing, secrecy, text } (AnswersSchema)
// The SERVER runs the engine, removes personal data from the text, stores the verdict
// and tells the family. 200 { checkId, verdict, callContact }.
// 404 not my check, 409 already answered, 400 invalid answers.

import { AnswersSchema } from "@/schemas/checks";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createCheckDeps, submitAnswers } from "@/server/services/checkService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function PUT(request: Request, context: RouteContext<"/api/checks/[id]/answers">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["protected"], client); // 1. who are you? (401/403)
    const { id } = await context.params;
    const checkId = IdParamSchema.safeParse(id); // 2a. valid id? (else 404)
    if (!checkId.success) {
      throw notFound();
    }
    const answers = AnswersSchema.parse(await readJsonBody(request)); // 2b. valid answers? (400)
    const deps = createCheckDeps(client, createAdminClient());
    const result = await submitAnswers(deps, actor, checkId.data, answers); // 3. engine + store
    return json(result); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
