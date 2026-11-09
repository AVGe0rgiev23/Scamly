// The moderators' extra keywords for the detection engine (W3-05, BUILD_PLAN 4.1/4.5).
//
// A moderator adds a stem (e.g. „томбол“) to a published scam card. The check service
// loads the stems of all PUBLISHED cards and passes them to analyseCall() as
// `extraKeywords`. Each stem joins the scenario category of its card's script type:
//
//   police -> scenario_police            relative_in_trouble -> scenario_relative
//   fake_official -> scenario_official   courier -> scenario_courier
//   unknown -> skipped (it has no scenario category)
//
// So a keyword can only add evidence to an EXISTING category with its EXISTING weight
// (scoring.ts); a moderator can never invent a weight or a hard rule.
//
// Cache: the stems are read at most once per 60 seconds per server instance (one tiny
// query with the cookie-less public client). A failure NEVER blocks a check: the
// engine then runs with the last stems we had, or with none.

import "server-only";
import type { ExtraKeyword, ScriptType, SignalCategory } from "@/engine";
import { readPublicEnv } from "@/lib/publicEnv";
import { checkKeyword } from "@/schemas/scripts";
import { listPublishedKeywords } from "@/server/repositories/scriptsRepository";
import { createPublicClient } from "@/server/supabase/publicClient";

export const KEYWORD_CACHE_MS = 60_000;

// The scenario category of each script type (null = no category, the stems are skipped).
// `Record<ScriptType, …>` = one entry per type, like a dict that must have all keys.
export const CATEGORY_OF_SCRIPT: Record<ScriptType, SignalCategory | null> = {
  police: "scenario_police",
  relative_in_trouble: "scenario_relative",
  fake_official: "scenario_official",
  courier: "scenario_courier",
  unknown: null,
};

// One published card's part for the engine (from listPublishedKeywords).
export type KeywordRow = { script_type: ScriptType; extra_keywords: string[] };

// Rows -> the engine's ExtraKeyword list. Stems are checked again with the API's rule
// (a row could have been changed by hand in the SQL Editor), and each (category, stem)
// pair appears once.
export function toExtraKeywords(rows: KeywordRow[]): ExtraKeyword[] {
  const result: ExtraKeyword[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const category = CATEGORY_OF_SCRIPT[row.script_type];
    if (category === null) continue;
    for (const typed of row.extra_keywords) {
      const checked = checkKeyword(typed);
      if (!checked.ok) continue;
      const key = `${category}:${checked.stem}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ category, stem: checked.stem });
    }
  }
  return result;
}

// A small time-based cache around `load` (like functools.lru_cache with an expiry).
// Returns a function the check service calls before every verdict. It never throws.
export function createKeywordCache(
  load: () => Promise<KeywordRow[]>,
  now: () => number,
  ttlMs: number = KEYWORD_CACHE_MS,
): () => Promise<ExtraKeyword[]> {
  let keywords: ExtraKeyword[] = []; // the last good answer (none at the start)
  let expiresAt = 0; // when to ask the database again (0 = ask now)

  return async () => {
    if (now() < expiresAt) {
      return keywords;
    }
    try {
      keywords = toExtraKeywords(await load());
    } catch (error) {
      // Keep the last good stems (or none). The check must go on.
      const description =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.error("[checks] loading moderator keywords failed:", description);
    }
    // Also after a failure: wait a minute, so a database outage doesn't add a slow
    // failing query to every check.
    expiresAt = now() + ttlMs;
    return keywords;
  };
}

// The real loader: the published cards' stems, read as a guest (RLS: published only).
// Without Supabase settings (CI) there are none.
async function loadPublishedKeywordRows(): Promise<KeywordRow[]> {
  if (readPublicEnv() === null) {
    return [];
  }
  return listPublishedKeywords(createPublicClient());
}

// One cache per server instance (module-level, like a Python module global).
export const loadModeratorKeywords = createKeywordCache(loadPublishedKeywordRows, () => Date.now());
