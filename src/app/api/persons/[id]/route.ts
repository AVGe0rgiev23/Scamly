// /api/persons/:id: one protected person (BUILD_PLAN 3, #8, #9 and #10).
//   GET    family with access (owner or trusted contact)
//          -> 200 { person, contacts: [...place 1 first], devices: [...] }
//   PATCH  owner only, body { displayName?, districtCode? } -> 200 { person }
//   DELETE owner only -> 200 { ok: true, devicesRevoked }: the person and ALL their
//          data are deleted, and every paired phone is signed out (its account deleted)
// Anyone else, or an unknown id -> 404 (we don't reveal that the person exists).

import { connection } from "next/server";
import { IdParamSchema, UpdatePersonSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  createPersonAdminDeps,
  createPersonDeps,
  deletePerson,
  getPersonDetails,
  updatePerson,
} from "@/server/services/personService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

// The id from the URL, checked. Not a uuid -> 404, exactly like an unknown id.
function parsePersonId(id: string): string {
  const result = IdParamSchema.safeParse(id);
  if (!result.success) {
    throw notFound();
  }
  return result.data;
}

export async function GET(_request: Request, context: RouteContext<"/api/persons/[id]">) {
  // A personal answer: never build it in advance at `next build` time.
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const personId = parsePersonId((await context.params).id); // 2. valid id? (else 404)
    const details = await getPersonDetails(createPersonDeps(client), actor, personId); // 3. RLS
    return json(details); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/persons/[id]">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const personId = parsePersonId((await context.params).id); // 2. valid id and input?
    const input = UpdatePersonSchema.parse(await readJsonBody(request));
    const person = await updatePerson(createPersonDeps(client), actor, personId, input); // 3.
    return json({ person }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/persons/[id]">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const personId = parsePersonId((await context.params).id); // 2. valid id? (else 404)
    // 3. owner check (user client), sign out the phones (service role), delete (RLS)
    const result = await deletePerson(
      createPersonDeps(client),
      createPersonAdminDeps(createAdminClient()),
      actor,
      personId,
    );
    return json({ ok: true, devicesRevoked: result.devicesRevoked }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
