// Demo-seed safeguards and orchestration; dependencies are like a Python Protocol.
import { bg } from "@/i18n/bg";
import type { Actor } from "@/server/auth/actor";
import type { Database } from "@/types/database";

export type DemoAccount = {
  key: "family" | "contact" | "moderator" | "admin";
  email: string;
  displayName: string;
  role: "family" | "moderator" | "admin";
};

export function demoAccounts(): DemoAccount[] {
  return [
    {
      key: "family",
      email: "family@demo.scamly.invalid",
      displayName: bg.seed.familyName,
      role: "family",
    },
    {
      key: "contact",
      email: "contact@demo.scamly.invalid",
      displayName: bg.seed.contactName,
      role: "family",
    },
    {
      key: "moderator",
      email: "moderator@demo.scamly.invalid",
      displayName: bg.seed.moderatorName,
      role: "moderator",
    },
    {
      key: "admin",
      email: "admin@demo.scamly.invalid",
      displayName: bg.seed.adminName,
      role: "admin",
    },
  ];
}

// The schema's static 28 districts are expected; all user/auth data must be empty.
export const EMPTY_TABLES = [
  "profiles",
  "protected_persons",
  "trusted_contacts",
  "contact_invites",
  "pairing_codes",
  "devices",
  "checks",
  "alerts",
  "push_subscriptions",
  "reports",
  "scam_scripts",
  "audit_log",
  "rate_limits",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

export type SeedOptions = { apply: boolean; target: string | null };

export function parseSeedOptions(args: string[]): SeedOptions {
  if (args.length === 0 || (args.length === 1 && args[0] === "--dry-run")) {
    return { apply: false, target: null };
  }
  if (args.length === 3 && args[0] === "--apply" && args[1] === "--target" && args[2]) {
    return { apply: true, target: normaliseTarget(args[2]) };
  }
  throw new Error(
    "Use npm run seed (offline plan), or npm run seed -- --apply --target <approved-empty-database-url>.",
  );
}

export function normaliseTarget(value: string): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  ) {
    throw new Error("The target must be a Supabase origin URL without credentials or a path.");
  }
  return url.origin;
}

export function validateSeedTarget(
  target: string,
  configuredUrl: string,
  password: string | undefined,
): string {
  if (normaliseTarget(target) !== normaliseTarget(configuredUrl)) {
    throw new Error(
      "The approved target does not match NEXT_PUBLIC_SUPABASE_URL; nothing was written.",
    );
  }
  if (!password || password.length < 12 || password.length > 72) {
    throw new Error(
      "Set SEED_DEMO_PASSWORD to 12–72 characters in the local environment; never commit it.",
    );
  }
  return password;
}

export type SeedDeps = {
  assertEmpty: () => Promise<void>;
  createAccount: (account: DemoAccount, password: string) => Promise<Actor>;
  createPerson: (owner: Actor) => Promise<string>;
  pairDevice: (owner: Actor, personId: string) => Promise<string>;
  addContact: (personId: string, contactId: string) => Promise<void>;
  addSamples: (personId: string, deviceId: string, moderatorId: string) => Promise<void>;
};

export async function executeSeed(deps: SeedDeps, password: string): Promise<void> {
  // The preflight completes before the first write. Failures never trigger a reset/delete.
  await deps.assertEmpty();
  const actors = new Map<DemoAccount["key"], Actor>();
  for (const account of demoAccounts()) {
    const actor = await deps.createAccount(account, password);
    if (actor.role !== account.role) throw new Error("Demo role verification failed.");
    actors.set(account.key, actor);
  }
  const owner = actors.get("family");
  const contact = actors.get("contact");
  const moderator = actors.get("moderator");
  if (!owner || !contact || !moderator) throw new Error("Demo account setup is incomplete.");
  const personId = await deps.createPerson(owner);
  await deps.addContact(personId, contact.userId);
  const deviceId = await deps.pairDevice(owner, personId);
  await deps.addSamples(personId, deviceId, moderator.userId);
}
