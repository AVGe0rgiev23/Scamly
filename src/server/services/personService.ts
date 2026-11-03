// Protected persons: the minimal part needed for pairing (create + list).
// Details, renaming, deleting and contacts come in Week 2 (W2-08).
//
// Both functions use the USER client only: RLS checks that the caller is a family
// member and owns what they create. No service role here.

import "server-only";
import type { Actor } from "@/server/auth/actor";
import { insertPerson, listPersons, type PersonRow } from "@/server/repositories/personsRepository";
import type { CreatePersonInput } from "@/schemas/persons";
import type { DbClient } from "@/server/supabase/userClient";

// What the API sends back for one person (camelCase for JavaScript).
export type PersonDto = {
  id: string;
  displayName: string;
  districtCode: string;
  createdAt: string;
  isOwner: boolean; // true = I created this person; false = I am one of their contacts
};

function toDto(row: PersonRow, actor: Actor): PersonDto {
  return {
    id: row.id,
    displayName: row.display_name,
    districtCode: row.district_code,
    createdAt: row.created_at,
    isOwner: row.owner_id === actor.userId,
  };
}

// Creates a person owned by the caller. The DB trigger adds the caller as contact #1.
export async function createPerson(
  client: DbClient,
  actor: Actor,
  input: CreatePersonInput,
): Promise<PersonDto> {
  const row = await insertPerson(client, {
    ownerId: actor.userId,
    displayName: input.displayName,
    districtCode: input.districtCode,
  });
  return toDto(row, actor);
}

// Every person the caller has access to (owner or trusted contact): RLS filters.
export async function listPersonsForActor(client: DbClient, actor: Actor): Promise<PersonDto[]> {
  const rows = await listPersons(client);
  return rows.map((row) => toDto(row, actor));
}
