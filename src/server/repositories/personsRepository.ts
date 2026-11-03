// Database queries for the protected_persons table (the older people we protect).

import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

export type PersonRow = Database["public"]["Tables"]["protected_persons"]["Row"];

const PERSON_COLUMNS = "id, owner_id, display_name, district_code, created_at";

// One person by id, or null when it doesn't exist OR the caller may not see it.
// With the user client, RLS answers "may this caller see it?" (owner, trusted
// contact, the paired device, or an admin).
export async function findPersonById(
  client: DbClient,
  personId: string,
): Promise<PersonRow | null> {
  const { data, error } = await client
    .from("protected_persons")
    .select(PERSON_COLUMNS)
    .eq("id", personId)
    .maybeSingle();
  if (error) {
    throw new Error(`findPersonById failed: ${error.message}`);
  }
  return data;
}

// Every person the caller may see (user client: RLS filters the rows), oldest first.
export async function listPersons(client: DbClient): Promise<PersonRow[]> {
  const { data, error } = await client
    .from("protected_persons")
    .select(PERSON_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`listPersons failed: ${error.message}`);
  }
  return data;
}

// Creates a person owned by `ownerId` (user client: the RLS INSERT policy checks
// owner_id = auth.uid() and role = family). A database trigger then adds the owner
// as trusted contact number 1.
export async function insertPerson(
  client: DbClient,
  person: { ownerId: string; displayName: string; districtCode: string },
): Promise<PersonRow> {
  const { data, error } = await client
    .from("protected_persons")
    .insert({
      owner_id: person.ownerId,
      display_name: person.displayName,
      district_code: person.districtCode,
    })
    .select(PERSON_COLUMNS)
    .single();
  if (error) {
    throw new Error(`insertPerson failed: ${error.message}`);
  }
  return data;
}
