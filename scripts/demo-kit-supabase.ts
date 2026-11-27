// Juror demo kit (P-12): the database work. Computer-only, like seed-supabase.ts:
// it uses the service-role key from .env.local and is never imported by the app.
//
//   runDemoKit()    finds or creates the demo family (owner Иван, protected Мария),
//                   clears the last juror, puts place 1 free for the juror, makes ONE
//                   invite link (3 h, single use) and its QR picture, and, while no
//                   phone is paired yet, a 6-digit pairing code for the demo phone
//   runDemoReset()  removes the juror again (the link, and the account when it exists
//                   only for the demo), the demo checks and questions, open invites;
//                   with --all also Иван's account and with it Мария and her phone
//
// It only touches the demo family: Иван is found by the reserved e-mail address
// ivan@demo-kit.scamly.invalid, Мария by owner = Иван, the juror by being linked to
// that Мария. Raw provider errors are never printed (they can contain submitted values).

import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { toFile } from "qrcode";
import type { ServerEnv } from "@/lib/env";
import { loadActor, supabaseActorReader, type Actor } from "@/server/auth/actor";
import { createInvite, createInviteDeps } from "@/server/services/inviteService";
import { createPairingCode, createPairingDeps } from "@/server/services/pairingService";
import { createPerson } from "@/server/services/personService";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database } from "@/types/database";
import {
  canDeleteJurorAccount,
  DemoKitError,
  DEMO_INVITE_LIFETIME_MS,
  DEMO_KIT_OUTPUT_DIR,
  DEMO_KIT_QR_FILE,
  DEMO_NAMES,
  DEMO_OWNER_EMAIL,
  isDemoKitEmail,
  JUROR_PRIORITY,
  OWNER_PRIORITY_DURING_DEMO,
} from "./demo-kit-core";

const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

// The district of the demo Мария (София-град), the same as the seed.
const DEMO_DISTRICT = "BG-22";

// What the kit prints at the end (no keys, no passwords).
export type DemoKitResult = {
  inviteUrl: string;
  qrFile: string;
  expiresAt: string;
  pairingCode: string | null; // only while no demo phone is paired
  createdFamily: boolean;
};

export type DemoResetResult = {
  jurorsUnlinked: number;
  jurorAccountsDeleted: number;
  jurorAccountsKept: number;
  familyDeleted: boolean;
};

function adminClient(env: ServerEnv): DbClient {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    CLIENT_OPTIONS,
  );
}

function userClient(env: ServerEnv): DbClient {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    CLIENT_OPTIONS,
  );
}

// Иван's account id, or null. Auth has no "find by e-mail" call, so we read the
// pages of accounts (1000 each, at most 10 pages, like listAuthEmails).
async function findOwnerId(admin: DbClient): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new DemoKitError("Cannot read the accounts.");
    const found = data.users.find((user) => user.email?.toLowerCase() === DEMO_OWNER_EMAIL);
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

// Иван's protected people (the kit makes exactly one: Мария).
async function findDemoPersonIds(admin: DbClient, ownerId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("protected_persons")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at");
  if (error) throw new DemoKitError("Cannot read the demo family.");
  return data.map((row) => row.id);
}

// Creates Иван (or gives him a new password) and logs him in with a normal user
// client, so the real services run with RLS as if Иван pressed the buttons.
async function signInOwner(
  env: ServerEnv,
  admin: DbClient,
  password: string | null,
): Promise<{ actor: Actor; client: DbClient; created: boolean }> {
  // Without SCAMLY_DEMO_PASSWORD: a fresh random password that is never printed.
  const secret = password ?? randomBytes(24).toString("base64url");
  let ownerId = await findOwnerId(admin);
  const created = ownerId === null;
  if (ownerId === null) {
    const result = await admin.auth.admin.createUser({
      email: DEMO_OWNER_EMAIL,
      password: secret,
      email_confirm: true,
      user_metadata: { display_name: DEMO_NAMES.owner },
    });
    if (result.error) throw new DemoKitError("Cannot create the demo owner account.");
    ownerId = result.data.user.id;
  } else {
    const result = await admin.auth.admin.updateUserById(ownerId, { password: secret });
    if (result.error) throw new DemoKitError("Cannot update the demo owner account.");
  }
  const client = userClient(env);
  const login = await client.auth.signInWithPassword({ email: DEMO_OWNER_EMAIL, password: secret });
  if (login.error) throw new DemoKitError("Cannot log in as the demo owner.");
  const actor = await loadActor(supabaseActorReader(client));
  if (actor === null || actor.userId !== ownerId || actor.role !== "family") {
    throw new DemoKitError(
      "The demo owner account is not a family account; nothing more was changed.",
    );
  }
  return { actor, client, created };
}

// Removes the juror(s) from one demo person and the demo traces of the last run.
async function clearDemoPerson(
  admin: DbClient,
  ownerId: string,
  personId: string,
): Promise<Omit<DemoResetResult, "familyDeleted">> {
  const result = { jurorsUnlinked: 0, jurorAccountsDeleted: 0, jurorAccountsKept: 0 };

  const contacts = await admin
    .from("trusted_contacts")
    .select("id, user_id")
    .eq("protected_person_id", personId);
  if (contacts.error) throw new DemoKitError("Cannot read the demo contact list.");

  for (const contact of contacts.data) {
    if (contact.user_id === ownerId) continue; // Иван stays
    // Every other row of the demo Мария came from the kit's invite (or a test).
    const removed = await admin.from("trusted_contacts").delete().eq("id", contact.id);
    if (removed.error) throw new DemoKitError("Cannot remove the juror from the demo list.");
    if (contact.user_id === null) continue;
    result.jurorsUnlinked += 1;
    if (await jurorAccountIsDemoOnly(admin, contact.user_id, personId)) {
      const deleted = await admin.auth.admin.deleteUser(contact.user_id);
      if (deleted.error) throw new DemoKitError("Cannot delete the juror account.");
      result.jurorAccountsDeleted += 1;
    } else {
      result.jurorAccountsKept += 1;
    }
  }

  // The demo's questions and checks (alerts go with the checks), and open invites.
  for (const table of ["identity_checks", "checks", "contact_invites"] as const) {
    const removed = await admin.from(table).delete().eq("protected_person_id", personId);
    if (removed.error) throw new DemoKitError(`Cannot clear the demo ${table}.`);
  }

  // Иван back to place 1 (the juror's place is free again).
  const back = await admin
    .from("trusted_contacts")
    .update({ priority: 1 })
    .eq("protected_person_id", personId)
    .eq("user_id", ownerId);
  if (back.error) throw new DemoKitError("Cannot put the demo owner back to place 1.");
  return result;
}

// The facts canDeleteJurorAccount() needs, read with the service role.
async function jurorAccountIsDemoOnly(
  admin: DbClient,
  userId: string,
  personId: string,
): Promise<boolean> {
  const [profile, audit, owned, links, account] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "invite_redeemed")
      .eq("actor_id", userId)
      .eq("details->>protected_person_id", personId),
    admin
      .from("protected_persons")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
    admin
      .from("trusted_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.auth.admin.getUserById(userId),
  ]);
  if (profile.error || audit.error || owned.error || links.error || account.error) {
    throw new DemoKitError("Cannot read the juror account.");
  }
  // Never an account of the kit itself (Иван) or a phone.
  if (isDemoKitEmail(account.data.user.email)) return false;
  return canDeleteJurorAccount({
    role: profile.data?.role ?? "",
    joinedThroughDemoInvite: (audit.count ?? 0) > 0,
    ownsPersons: owned.count ?? 0,
    // The demo row was deleted just before, so every remaining row is someone else's.
    otherLinks: links.count ?? 0,
  });
}

export async function runDemoKit(
  env: ServerEnv,
  options: { siteUrl: string; ownerPassword: string | null; outputRoot: string },
): Promise<DemoKitResult> {
  const admin = adminClient(env);
  const owner = await signInOwner(env, admin, options.ownerPassword);

  // Мария: reuse the demo person, or create her through the real service (the
  // database adds Иван as contact 1 by itself).
  let personId = (await findDemoPersonIds(admin, owner.actor.userId))[0];
  const createdFamily = personId === undefined;
  if (personId === undefined) {
    const person = await createPerson(owner.client, owner.actor, {
      displayName: DEMO_NAMES.person,
      districtCode: DEMO_DISTRICT,
    });
    personId = person.id;
  }

  // A clean start: the last juror and the last demo's traces are gone.
  await clearDemoPerson(admin, owner.actor.userId, personId);

  // Place 1 becomes free for the juror; Иван is asked second.
  const moved = await admin
    .from("trusted_contacts")
    .update({ priority: OWNER_PRIORITY_DURING_DEMO })
    .eq("protected_person_id", personId)
    .eq("user_id", owner.actor.userId);
  if (moved.error) throw new DemoKitError("Cannot move the demo owner to place 2.");

  // The juror's invite through the REAL service (token shown once, only its HMAC
  // stored, audit line), then its life is cut from 7 days to 3 hours.
  const invite = await createInvite(createInviteDeps(owner.client, admin), owner.actor, personId, {
    displayName: DEMO_NAMES.juror,
    priority: JUROR_PRIORITY,
  });
  const expiresAt = new Date(Date.now() + DEMO_INVITE_LIFETIME_MS).toISOString();
  const shortened = await admin
    .from("contact_invites")
    .update({ expires_at: expiresAt })
    .eq("id", invite.inviteId);
  if (shortened.error) throw new DemoKitError("Cannot shorten the juror invite.");

  // The QR picture of the link, for the slide (folder demo-kit/, git-ignored).
  const inviteUrl = `${options.siteUrl}${invite.invitePath}`;
  const folder = path.join(options.outputRoot, DEMO_KIT_OUTPUT_DIR);
  await mkdir(folder, { recursive: true });
  const qrFile = path.join(folder, DEMO_KIT_QR_FILE);
  await toFile(qrFile, inviteUrl, { width: 768, margin: 2, errorCorrectionLevel: "M" });

  // The demo phone: a pairing code only while no phone is paired. Once paired, the
  // phone stays paired between demos (the reset does not unpair it).
  const devices = await admin
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("protected_person_id", personId)
    .is("revoked_at", null);
  if (devices.error) throw new DemoKitError("Cannot read the demo phones.");
  let pairingCode: string | null = null;
  if ((devices.count ?? 0) === 0) {
    const code = await createPairingCode(
      createPairingDeps(owner.client, admin),
      owner.actor,
      personId,
    );
    pairingCode = code.code;
  }

  await owner.client.auth.signOut({ scope: "local" });
  return { inviteUrl, qrFile, expiresAt, pairingCode, createdFamily };
}

export async function runDemoReset(env: ServerEnv, all: boolean): Promise<DemoResetResult> {
  const admin = adminClient(env);
  const result: DemoResetResult = {
    jurorsUnlinked: 0,
    jurorAccountsDeleted: 0,
    jurorAccountsKept: 0,
    familyDeleted: false,
  };
  const ownerId = await findOwnerId(admin);
  if (ownerId === null) return result; // no demo family: nothing to do

  for (const personId of await findDemoPersonIds(admin, ownerId)) {
    const cleared = await clearDemoPerson(admin, ownerId, personId);
    result.jurorsUnlinked += cleared.jurorsUnlinked;
    result.jurorAccountsDeleted += cleared.jurorAccountsDeleted;
    result.jurorAccountsKept += cleared.jurorAccountsKept;
  }

  if (all) {
    // Deleting Иван deletes Мария, her paired phone's account (database trigger,
    // migration 20261124000001) and everything else of the demo family.
    const deleted = await admin.auth.admin.deleteUser(ownerId);
    if (deleted.error) throw new DemoKitError("Cannot delete the demo owner account.");
    result.familyDeleted = true;
  }
  return result;
}
