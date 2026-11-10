// Database queries for the profiles table (one row per account: role + display name).
// Repositories hold ALL Supabase queries, one file per table group (BUILD_PLAN 1).
// Each function receives the client to use, so the caller decides whether RLS
// applies (user client) or not (admin client, only for the BUILD_PLAN 2.4 list).

import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";

// One row of profiles, e.g. { id, role: "family", display_name: "Иван", ... }.
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// The profile of `userId`, or null. With the user client, RLS lets a person read
// only their own profile (admins: all).
export async function findProfileById(
  client: DbClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, role, display_name, email_alerts, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`findProfileById failed: ${error.message}`);
  }
  return data;
}

// Makes a new device account a 'protected' account (pairing only, admin client).
// Nobody can do this through the user client: the column privilege on profiles
// allows updating only display_name and email_alerts.
export async function setRoleProtected(admin: DbClient, userId: string): Promise<void> {
  const { error } = await admin.from("profiles").update({ role: "protected" }).eq("id", userId);
  if (error) {
    throw new Error(`setRoleProtected failed: ${error.message}`);
  }
}

// Changes an account's role (admin area, W3-06, BUILD_PLAN 2.4 use 6, admin client:
// nobody may change `role` through the user client). Only if the role is still
// `fromRole`, so two admins clicking at the same moment can't overwrite each other
// unnoticed (like a compare-and-set). Never touches a phone ("protected").
// Returns false when nothing was changed (the role was different, or no such account).
export async function changeProfileRole(
  admin: DbClient,
  userId: string,
  fromRole: ProfileRow["role"],
  toRole: ProfileRow["role"],
): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .update({ role: toRole })
    .eq("id", userId)
    .eq("role", fromRole)
    .neq("role", "protected")
    .select("id");
  if (error) {
    throw new Error(`changeProfileRole failed: ${error.message}`);
  }
  return data.length === 1;
}
