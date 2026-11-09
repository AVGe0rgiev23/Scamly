// Database queries for the scam-script library (table `scam_scripts`, task W3-05).
//
// Which client each caller passes (BUILD_PLAN 2.4):
//   * the PUBLIC client (no login) for the published cards: the education pages,
//     GET /api/scripts and the engine's moderator keywords. RLS shows a guest only
//     the rows with published = true.
//   * the USER client of a moderator or admin for the editor: RLS lets them read
//     every card (also drafts) and insert / update. No admin client is needed, so
//     the database itself checks the role a second time.

import type { ScriptType } from "@/engine";
import type { DbClient } from "@/server/supabase/userClient";

// One row of scam_scripts, as we read it (all columns we use).
export type ScriptRow = {
  id: string;
  slug: string;
  script_type: ScriptType;
  title_bg: string;
  how_it_starts_bg: string;
  what_they_say_bg: string;
  what_to_do_bg: string;
  extra_keywords: string[];
  published: boolean;
  updated_at: string;
};

// The columns we ask for (a fixed list instead of "*", so a new column never leaks).
const COLUMNS =
  "id, slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg, extra_keywords, published, updated_at";

// The columns a new or changed card may set. updated_by and updated_at are filled in
// by the service (the table has no trigger for them).
export type ScriptWrite = {
  slug?: string;
  script_type?: ScriptType;
  title_bg?: string;
  how_it_starts_bg?: string;
  what_they_say_bg?: string;
  what_to_do_bg?: string;
  extra_keywords?: string[];
  published?: boolean;
  updated_by?: string;
  updated_at?: string;
};

// PostgreSQL's error code for "this unique value already exists" (here: the slug).
const UNIQUE_VIOLATION = "23505";

export type SaveResult = { kind: "saved"; row: ScriptRow } | { kind: "slug_taken" };

// All cards the client may read, in a fixed order: by script type (the enum's order:
// police, relative_in_trouble, fake_official, courier, unknown), then by title.
// With the public client these are only the published ones (RLS).
export async function listScripts(client: DbClient): Promise<ScriptRow[]> {
  const { data, error } = await client
    .from("scam_scripts")
    .select(COLUMNS)
    .order("script_type")
    .order("title_bg");
  if (error) {
    throw new Error(`listScripts failed: ${error.message}`);
  }
  return data;
}

// Only the published cards, also for a moderator's client (the same order).
export async function listPublishedScripts(client: DbClient): Promise<ScriptRow[]> {
  const { data, error } = await client
    .from("scam_scripts")
    .select(COLUMNS)
    .eq("published", true)
    .order("script_type")
    .order("title_bg");
  if (error) {
    throw new Error(`listPublishedScripts failed: ${error.message}`);
  }
  return data;
}

// One published card by its address (the education page /kak-raboti/<slug>).
export async function findPublishedScriptBySlug(
  client: DbClient,
  slug: string,
): Promise<ScriptRow | null> {
  const { data, error } = await client
    .from("scam_scripts")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    throw new Error(`findPublishedScriptBySlug failed: ${error.message}`);
  }
  return data;
}

// One card by id, if the client may see it (null otherwise).
export async function findScriptById(client: DbClient, id: string): Promise<ScriptRow | null> {
  const { data, error } = await client
    .from("scam_scripts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`findScriptById failed: ${error.message}`);
  }
  return data;
}

// Just the engine's part of the published cards: the type and the extra keywords.
export async function listPublishedKeywords(
  client: DbClient,
): Promise<{ script_type: ScriptType; extra_keywords: string[] }[]> {
  const { data, error } = await client
    .from("scam_scripts")
    .select("script_type, extra_keywords")
    .eq("published", true);
  if (error) {
    throw new Error(`listPublishedKeywords failed: ${error.message}`);
  }
  return data;
}

// A new card (user client of a moderator: RLS "Moderators can create scripts").
export async function insertScript(
  client: DbClient,
  fields: Required<Omit<ScriptWrite, "updated_at">>,
): Promise<SaveResult> {
  const { data, error } = await client.from("scam_scripts").insert(fields).select(COLUMNS).single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { kind: "slug_taken" };
    }
    throw new Error(`insertScript failed: ${error.message}`);
  }
  return { kind: "saved", row: data };
}

// Changes some fields of a card (user client of a moderator). null = no such card, or
// RLS hides it from this caller (0 rows changed).
export async function updateScript(
  client: DbClient,
  id: string,
  fields: ScriptWrite,
): Promise<SaveResult | null> {
  const { data, error } = await client
    .from("scam_scripts")
    .update(fields)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { kind: "slug_taken" };
    }
    throw new Error(`updateScript failed: ${error.message}`);
  }
  return data === null ? null : { kind: "saved", row: data };
}
