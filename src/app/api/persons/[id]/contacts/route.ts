// PUT /api/persons/:id/contacts: replace the whole ordered contact list of a person
// (family, OWNER only; BUILD_PLAN 3, #11).
// Body: [{ id?, displayName, phone?, priority }, ...] (1 to 5 contacts, places 1–5
// used once; no id = a new contact; contacts left out are deleted).
// 200 { contacts: [...place 1 first] }. Not the owner, or no such person -> 404.
// 400 when the owner's own row is missing, an id is unknown, or a contact without an
// account has no phone; 409 when the list changed in another tab at the same moment.

import { ContactsSchema } from "@/schemas/contacts";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createContactDeps, replaceContacts } from "@/server/services/contactService";
import { createUserClient } from "@/server/supabase/userClient";

export async function PUT(request: Request, context: RouteContext<"/api/persons/[id]/contacts">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const personId = IdParamSchema.safeParse((await context.params).id); // 2. valid id?
    if (!personId.success) {
      throw notFound();
    }
    const contacts = ContactsSchema.parse(await readJsonBody(request)); // 2. valid list? (400)
    // 3. owner check + rules + one SQL function call, all with the USER client
    const saved = await replaceContacts(createContactDeps(client), actor, personId.data, contacts);
    return json({ contacts: saved }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
