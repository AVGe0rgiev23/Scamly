// Database queries for the contact_invites table (invite links for relatives).
// Browsers may only READ the invites of their own persons (RLS); creating and
// redeeming goes through our API with the admin client (BUILD_PLAN 2.5).
// We only ever store the HMAC of a token (token_hash), never the token.

import type { DbClient } from "@/server/supabase/userClient";

// What we need to know about an invite.
export type InviteRow = {
  id: string;
  protected_person_id: string;
  display_name: string;
  priority: number;
};

// Stores a new invite. Returns its id.
export async function insertInvite(
  admin: DbClient,
  invite: {
    personId: string;
    displayName: string;
    priority: number;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("contact_invites")
    .insert({
      protected_person_id: invite.personId,
      display_name: invite.displayName,
      priority: invite.priority,
      token_hash: invite.tokenHash,
      expires_at: invite.expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`insertInvite failed: ${error.message}`);
  }
  return data.id;
}

// The invite with this token hash, if it is still unused and not expired; else null
// (wrong, expired and used tokens look the same). It is NOT used up here: the service
// first checks that joining will work, then calls consumeInvite().
export async function findOpenInvite(
  admin: DbClient,
  tokenHash: string,
  now: Date,
): Promise<InviteRow | null> {
  const { data, error } = await admin
    .from("contact_invites")
    .select("id, protected_person_id, display_name, priority")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (error) {
    throw new Error(`findOpenInvite failed: ${error.message}`);
  }
  return data;
}

// Uses up an invite in ONE statement, like consumePairingCode():
//   UPDATE contact_invites SET used_at = now
//   WHERE id = $1 AND used_at IS NULL AND expires_at > now RETURNING id
// If two people open the same link at the same moment, PostgreSQL locks the row and
// the second UPDATE finds used_at already set: only ONE of them gets true.
export async function consumeInvite(
  admin: DbClient,
  inviteId: string,
  now: Date,
): Promise<boolean> {
  const nowIso = now.toISOString();
  const { data, error } = await admin
    .from("contact_invites")
    .update({ used_at: nowIso })
    .eq("id", inviteId)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`consumeInvite failed: ${error.message}`);
  }
  return data !== null;
}

// Gives an invite back (used_at = null) when joining failed right after it was used
// up, so the same link still works. Only if it is still marked with OUR time.
export async function releaseInvite(
  admin: DbClient,
  inviteId: string,
  usedAt: Date,
): Promise<void> {
  const { error } = await admin
    .from("contact_invites")
    .update({ used_at: null })
    .eq("id", inviteId)
    .eq("used_at", usedAt.toISOString());
  if (error) {
    throw new Error(`releaseInvite failed: ${error.message}`);
  }
}
