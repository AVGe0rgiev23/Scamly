// Supabase Auth admin calls: creating and deleting login accounts (auth.users).
// Only for device pairing and revoking (BUILD_PLAN 2.4 uses 1 and 2), admin client.

import type { DbClient } from "@/server/supabase/userClient";

// Creates an account that is already confirmed (no e-mail is ever sent: device
// accounts use an address on the reserved .invalid domain). Returns the new user id.
// The database trigger handle_new_user() creates its profile (role 'family' at
// first; pairing then changes it to 'protected').
export async function createConfirmedUser(
  admin: DbClient,
  account: { email: string; password: string; displayName: string },
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { display_name: account.displayName },
  });
  if (error) {
    throw new Error(`createConfirmedUser failed: ${error.message}`);
  }
  return data.user.id;
}

// Deletes an account. Its refresh token dies with it, and the database deletes its
// profile and device row too (on delete cascade).
export async function deleteAuthUser(admin: DbClient, userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`deleteAuthUser failed: ${error.message}`);
  }
}
