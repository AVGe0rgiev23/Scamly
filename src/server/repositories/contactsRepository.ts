// Database queries for the trusted_contacts table: the ordered list of people to
// call / alert for one protected person (priority 1 = called first).
//
// Two kinds of functions:
//   * user client (RLS + column privileges apply): reading the list, and the owner
//     replacing it through the SQL function replace_trusted_contacts()
//   * admin client, ONLY for redeeming an invite: the new relative can't see the
//     person's list yet, and user_id (which account a contact is) may be written
//     only by the server (BUILD_PLAN 2.5)

import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

export type ContactRow = Pick<
  Database["public"]["Tables"]["trusted_contacts"]["Row"],
  "id" | "protected_person_id" | "user_id" | "display_name" | "phone" | "priority"
>;

const CONTACT_COLUMNS = "id, protected_person_id, user_id, display_name, phone, priority";

// The contact list of one person, place 1 first. With the user client RLS returns
// the list only to family with access and the person's own phone (else: empty list).
export async function listContacts(client: DbClient, personId: string): Promise<ContactRow[]> {
  const { data, error } = await client
    .from("trusted_contacts")
    .select(CONTACT_COLUMNS)
    .eq("protected_person_id", personId)
    .order("priority", { ascending: true });
  if (error) {
    throw new Error(`listContacts failed: ${error.message}`);
  }
  return data;
}

// One contact of the new list. id = null means "a new contact".
// There is deliberately no userId field: the browser can never choose an account.
export type ContactWrite = {
  id: string | null;
  displayName: string;
  phone: string | null;
  priority: number;
};

// Replaces the whole list in ONE transaction with the SQL function
// replace_trusted_contacts() (migration 20261104000002). User client: the function
// is SECURITY INVOKER, so RLS and the column privileges still apply inside it.
// Answers "changed" when the database refused the list because it no longer
// matches (another tab removed a contact, took a place at the same moment...).
export async function replaceContacts(
  client: DbClient,
  personId: string,
  contacts: ContactWrite[],
): Promise<"ok" | "changed"> {
  const { error } = await client.rpc("replace_trusted_contacts", {
    p_person_id: personId,
    // The SQL function reads snake_case keys from the JSON.
    p_contacts: contacts.map((contact) => ({
      id: contact.id,
      display_name: contact.displayName,
      phone: contact.phone,
      priority: contact.priority,
    })),
  });
  if (error) {
    // 23505 = a place is taken twice, 22023 = an unknown contact id,
    // 23514 = the owner's own row is missing.
    if (error.code === "23505" || error.code === "22023" || error.code === "23514") {
      return "changed";
    }
    throw new Error(`replaceContacts failed: ${error.message}`);
  }
  return "ok";
}

// Invite redeemed: adds the caller's account as a new contact (admin client).
// Returns the new contact's id, or null when the place or the account is already
// taken in this list (23505 = PostgreSQL "unique_violation"), e.g. by a second
// redeem at the same moment.
export async function insertLinkedContact(
  admin: DbClient,
  contact: { personId: string; userId: string; displayName: string; priority: number },
): Promise<string | null> {
  const { data, error } = await admin
    .from("trusted_contacts")
    .insert({
      protected_person_id: contact.personId,
      user_id: contact.userId,
      display_name: contact.displayName,
      priority: contact.priority,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return null;
    }
    throw new Error(`insertLinkedContact failed: ${error.message}`);
  }
  return data.id;
}

// Invite redeemed for a relative the owner had already added by phone: attaches
// the caller's account to that existing row (admin client). Only a row WITHOUT an
// account can be linked ("user_id IS NULL" in the same UPDATE, so two redeems at
// once can't both win). Returns false when nothing was changed.
export async function linkContact(
  admin: DbClient,
  contactId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("trusted_contacts")
    .update({ user_id: userId })
    .eq("id", contactId)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return false;
    }
    throw new Error(`linkContact failed: ${error.message}`);
  }
  return data !== null;
}
