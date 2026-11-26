// /api/identity-checks/:id („Провери истинския“, D34, task P-05)
//   GET   -> 200 { identityCheck }: one question. The phone that asked (its Realtime
//            safety poll) or the family of the person. Anything else -> 404.
//   PATCH { answer: "not_me" | "its_me" } -> 200 { identityCheck }: the answer of the
//            family member who is asked (askedUserId). Only them (else 403), only once,
//            while pending and younger than 15 minutes (else 409 already_answered).
//            „Не съм аз“ also warns the rest of the family (push + live) and is audited.

import { connection } from "next/server";
import { AnswerIdentityCheckSchema } from "@/schemas/identityChecks";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  answerIdentityCheck,
  createIdentityCheckDeps,
  getIdentityCheck,
} from "@/server/services/identityCheckService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(_request: Request, context: RouteContext<"/api/identity-checks/[id]">) {
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["family", "protected"], client); // 1. who are you?
    const checkId = IdParamSchema.safeParse((await context.params).id); // 2. valid id? (else 404)
    if (!checkId.success) {
      throw notFound();
    }
    const deps = createIdentityCheckDeps(client, createAdminClient());
    const identityCheck = await getIdentityCheck(deps, actor, checkId.data); // 3. RLS + own-phone rule
    return json({ identityCheck }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/identity-checks/[id]">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const checkId = IdParamSchema.safeParse((await context.params).id); // 2. valid id? (else 404)
    if (!checkId.success) {
      throw notFound();
    }
    const input = AnswerIdentityCheckSchema.parse(await readJsonBody(request)); // 2. valid answer? (400)
    const deps = createIdentityCheckDeps(client, createAdminClient());
    // 3. only the asked member, compare-and-set, then the circle warning
    const identityCheck = await answerIdentityCheck(deps, actor, checkId.data, input.answer);
    return json({ identityCheck }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
