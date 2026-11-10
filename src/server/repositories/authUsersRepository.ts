// Supabase Auth admin calls: creating and deleting login accounts (auth.users), and
// reading a family member's e-mail address for alert e-mails.
// Only for device pairing and revoking (BUILD_PLAN 2.4 uses 1 and 2) and alert e-mails
// (use 4), admin client.

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

// The login e-mail address of an account, or null when it has none. Only for alert
// e-mails to family members (BUILD_PLAN 2.4 use 4, admin client): the address lives in
// auth.users, which no browser and no RLS policy can read.
export async function findAuthUserEmail(admin: DbClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(`findAuthUserEmail failed: ${error.message}`);
  }
  return data.user.email ?? null;
}

// The login e-mail of every account, as a map id -> e-mail, for the admin's users list
// (W3-06, admin client, BUILD_PLAN 2.4 use 6). Read page by page, 1000 at a time, at
// most MAX_AUTH_PAGES pages (enough for a school project; a bigger site would keep a
// copy of the address in its own table).
export const MAX_AUTH_PAGES = 10;
const AUTH_PAGE_SIZE = 1000;

export async function listAuthEmails(admin: DbClient): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error) {
      throw new Error(`listAuthEmails failed: ${error.message}`);
    }
    for (const user of data.users) {
      if (user.email) {
        emails.set(user.id, user.email);
      }
    }
    if (data.users.length < AUTH_PAGE_SIZE) {
      break;
    }
  }
  return emails;
}
