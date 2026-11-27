// Juror demo kit (P-12, IDEAS #39): the safety rules and pure decisions, no database.
// The database work is in demo-kit-supabase.ts, the command line in demo-kit.ts.
//
// The kit makes ONE demo family on purpose (owner Иван, protected Мария) and an
// invite link + QR code for a juror. Everything it creates is tagged with the
// reserved e-mail domain below, so the reset can find exactly its own rows.

import { bg } from "@/i18n/bg";

// Reserved ".invalid" domain (RFC 2606): no real mailbox can ever have it, and no
// e-mail is ever sent there. It is the tag of every account the kit creates.
export const DEMO_KIT_DOMAIN = "demo-kit.scamly.invalid";
export const DEMO_OWNER_EMAIL = `ivan@${DEMO_KIT_DOMAIN}`;

// The juror's invite works for 3 hours (a normal invite: 7 days), single use.
export const DEMO_INVITE_LIFETIME_MS = 3 * 60 * 60 * 1000;

// The juror is asked first: place 1 of Мария's list. The owner moves to place 2.
export const JUROR_PRIORITY = 1;
export const OWNER_PRIORITY_DURING_DEMO = 2;

// Where the QR picture is written (git-ignored, see .gitignore).
export const DEMO_KIT_OUTPUT_DIR = "demo-kit";
export const DEMO_KIT_QR_FILE = "juror-invite.png";

// The live site; the kit's link points here unless SCAMLY_DEMO_SITE_URL says otherwise.
export const LIVE_SITE_URL = "https://scamly-ag777.vercel.app";

// The names the kit uses (from bg.ts, like every other text).
export const DEMO_NAMES = {
  owner: bg.seed.familyName,
  person: bg.seed.personName,
  juror: bg.demoKit.jurorName,
} as const;

// Our own errors: their messages are written by us and safe to print. Any other
// error (from Supabase or a service) can contain submitted values and is never
// printed raw. `extends Error` is like `class DemoKitError(Exception)` in Python.
export class DemoKitError extends Error {}

export function safeErrorMessage(error: unknown): string {
  return error instanceof DemoKitError
    ? error.message
    : "The database refused a step; nothing secret is shown. Check the demo family in the dashboard before retrying.";
}

// Environment variables are like Python's os.environ: every value may be missing.
type Env = Record<string, string | undefined>;

// The guard: the kit writes to a real database, so it runs ONLY when Alex asks for
// it explicitly (SCAMLY_DEMO_KIT=1) and never in CI (GitHub Actions sets CI=true).
export function assertDemoKitAllowed(env: Env): void {
  if (env.CI !== undefined && env.CI !== "" && env.CI !== "false") {
    throw new DemoKitError("The demo kit never runs in CI; nothing was written.");
  }
  if (env.SCAMLY_DEMO_KIT !== "1") {
    throw new DemoKitError(
      "The demo kit writes to the database in .env.local. Run it with SCAMLY_DEMO_KIT=1 if you really mean it; nothing was written.",
    );
  }
}

export type DemoCommand = { kind: "kit" } | { kind: "reset"; all: boolean };

export function parseDemoArgs(args: string[]): DemoCommand {
  if (args.length === 1 && args[0] === "kit") return { kind: "kit" };
  if (args.length === 1 && args[0] === "reset") return { kind: "reset", all: false };
  if (args.length === 2 && args[0] === "reset" && args[1] === "--all") {
    return { kind: "reset", all: true };
  }
  throw new DemoKitError(
    "Use npm run demo:kit, npm run demo:reset or npm run demo:reset -- --all.",
  );
}

// The site the juror's link opens: an origin only (no path, no login data in it).
export function demoSiteUrl(value: string | undefined): string {
  if (value === undefined || value.trim() === "") return LIVE_SITE_URL;
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
    throw new DemoKitError(
      "SCAMLY_DEMO_SITE_URL must be a site origin such as https://example.com.",
    );
  }
  return url.origin;
}

// Иван's password: from SCAMLY_DEMO_PASSWORD when Alex wants to log in as Иван on a
// second phone; otherwise null (the kit then picks a random one and never prints it).
export function demoOwnerPassword(value: string | undefined): string | null {
  if (value === undefined || value === "") return null;
  if (value.length < 12 || value.length > 72) {
    throw new DemoKitError("SCAMLY_DEMO_PASSWORD must have 12–72 characters; nothing was written.");
  }
  return value;
}

export function isDemoKitEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${DEMO_KIT_DOMAIN}`);
}

// What the reset knows about one juror account (an account linked to the demo Мария
// that is not Иван). Like a small Python dataclass.
export type JurorFacts = {
  role: string; // profiles.role
  joinedThroughDemoInvite: boolean; // an `invite_redeemed` audit line for the demo Мария
  ownsPersons: number; // protected persons this account created itself
  otherLinks: number; // contact rows of OTHER persons that point to this account
};

// The juror registered the account themselves, so the reset deletes it only when it
// exists for the demo and nothing else: a family account that joined through the
// demo invite, owns nobody and is in nobody else's list. Otherwise only the link to
// the demo Мария is removed and the account stays.
export function canDeleteJurorAccount(facts: JurorFacts): boolean {
  return (
    facts.role === "family" &&
    facts.joinedThroughDemoInvite &&
    facts.ownsPersons === 0 &&
    facts.otherLinks === 0
  );
}
