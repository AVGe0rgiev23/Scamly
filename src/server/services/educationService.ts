// Data for the public education pages /kak-raboti and /kak-raboti/<slug> (W3-05).
//
// The pages are Server Components: they read the PUBLISHED cards straight from the
// database with the cookie-less public client (RLS: a guest sees only published rows),
// at request time, so a moderator's change shows on the next page load.
//
// A page must never break because the database is slow or down: every failure becomes
// "unavailable" (null), and the page shows a Bulgarian message and the three rules.

import "server-only";
import { unstable_rethrow } from "next/navigation";
import { readPublicEnv } from "@/lib/publicEnv";
import type { PublicScriptDto } from "@/schemas/scripts";
import {
  findPublishedScriptBySlug,
  listPublishedScripts,
  type ScriptRow,
} from "@/server/repositories/scriptsRepository";
import { toPublicScriptDto } from "@/server/services/scriptService";
import { createPublicClient } from "@/server/supabase/publicClient";

export type EducationDeps = {
  listPublished: () => Promise<ScriptRow[]>;
  findPublishedBySlug: (slug: string) => Promise<ScriptRow | null>;
};

// The same rule as ScriptSchema's slug: anything else can't be a card's address, so we
// answer "not found" without asking the database.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Logs a database problem for us, without the page failing.
function logFailure(what: string, error: unknown): void {
  unstable_rethrow(error); // Next.js's own signals must pass through
  const description = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[education] ${what} failed:`, description);
}

// All published cards in their fixed order, or null when they can't be loaded.
export async function loadEducationList(
  deps: EducationDeps | null,
): Promise<PublicScriptDto[] | null> {
  if (deps === null) {
    return null;
  }
  try {
    const rows = await deps.listPublished();
    return rows.map(toPublicScriptDto);
  } catch (error) {
    logFailure("list", error);
    return null;
  }
}

// One published card; "not_found" for a wrong address or a draft; null when the
// database can't be reached.
export async function loadEducationCard(
  deps: EducationDeps | null,
  slug: string,
): Promise<PublicScriptDto | "not_found" | null> {
  if (slug.length > 60 || !SLUG_PATTERN.test(slug)) {
    return "not_found";
  }
  if (deps === null) {
    return null;
  }
  try {
    const row = await deps.findPublishedBySlug(slug);
    return row === null ? "not_found" : toPublicScriptDto(row);
  } catch (error) {
    logFailure("card", error);
    return null;
  }
}

// The real deps, or null without Supabase settings (e.g. a build in CI).
export function createEducationDeps(): EducationDeps | null {
  if (readPublicEnv() === null) {
    return null;
  }
  const client = createPublicClient();
  return {
    listPublished: () => listPublishedScripts(client),
    findPublishedBySlug: (slug) => findPublishedScriptBySlug(client, slug),
  };
}
