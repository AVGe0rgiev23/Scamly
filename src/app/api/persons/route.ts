// /api/persons (family only; BUILD_PLAN 3, #6 and #7)
//   GET  -> 200 { persons: [...] }: the people I own or am a trusted contact of
//   POST -> 201 { person }: body { displayName, districtCode }; I become the owner
//           and, through a database trigger, trusted contact number 1.
// Both use the USER client only, so RLS checks every row.

import { connection } from "next/server";
import { CreatePersonSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createPerson, listPersonsForActor } from "@/server/services/personService";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET() {
  // This answer is different for every person: never build it in advance at
  // `next build` time (Cache Components would otherwise try to prerender a GET).
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const persons = await listPersonsForActor(client, actor); // 3. RLS filters the rows
    return json({ persons }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const input = CreatePersonSchema.parse(await readJsonBody(request)); // 2. valid input? (400)
    const person = await createPerson(client, actor, input); // 3. insert (RLS checks the owner)
    return json({ person }, 201); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
