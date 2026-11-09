// The scam-script library: the education cards „Как работи измамата“ and their extra
// keywords for the detection engine (task W3-05, BUILD_PLAN 3 #26, #30, #31).
//
//   listPublicScripts()   GET   /api/scripts            anyone: published cards only
//   listAllScripts()      GET   /api/scripts?all=1      moderator/admin: also drafts
//   getScript()           GET   /api/scripts/:id        moderator/admin: one card
//   createScript()        POST  /api/scripts            moderator/admin, audited
//   updateScript()        PATCH /api/scripts/:id        moderator/admin, audited
//
// The two locks (BUILD_PLAN section 0): the route checks the role (requireRole), and
// the writes use the moderator's own USER client, so the RLS policies "Moderators can
// create / update scripts" check the role again in the database. Only the audit line
// needs the admin client (nobody else may write audit_log).
//
// Like the other services, the outside world comes in `deps`, so the unit tests use
// fakes and no database (dependency injection).

import "server-only";
import { bg } from "@/i18n/bg";
import {
  ScriptPatchSchema,
  ScriptSchema,
  type PublicScriptDto,
  type ScriptDto,
} from "@/schemas/scripts";
import type { Actor } from "@/server/auth/actor";
import { conflict, notFound } from "@/server/http/errors";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import {
  findScriptById,
  insertScript,
  listPublishedScripts,
  listScripts,
  updateScript as updateScriptRow,
  type SaveResult,
  type ScriptRow,
  type ScriptWrite,
} from "@/server/repositories/scriptsRepository";
import type { DbClient } from "@/server/supabase/userClient";

// Everything the service needs from the outside world (tests pass fakes).
export type ScriptDeps = {
  now: () => Date;
  listPublished: () => Promise<ScriptRow[]>;
  listAll: () => Promise<ScriptRow[]>;
  findById: (id: string) => Promise<ScriptRow | null>;
  insert: (fields: Required<Omit<ScriptWrite, "updated_at">>) => Promise<SaveResult>;
  update: (id: string, fields: ScriptWrite) => Promise<SaveResult | null>;
  writeAudit: (entry: AuditEntry) => Promise<void>;
};

// A row -> what everybody may see (no id, no keywords, no draft flag).
export function toPublicScriptDto(row: ScriptRow): PublicScriptDto {
  return {
    slug: row.slug,
    scriptType: row.script_type,
    titleBg: row.title_bg,
    howItStartsBg: row.how_it_starts_bg,
    whatTheySayBg: row.what_they_say_bg,
    whatToDoBg: row.what_to_do_bg,
  };
}

// A row -> what the moderator's editor gets.
export function toScriptDto(row: ScriptRow): ScriptDto {
  return {
    ...toPublicScriptDto(row),
    id: row.id,
    extraKeywords: row.extra_keywords,
    published: row.published,
    updatedAt: row.updated_at,
  };
}

// The saved row, or 409 when another card already has this address.
function savedRow(result: SaveResult): ScriptRow {
  if (result.kind === "slug_taken") {
    throw conflict("slug_taken", bg.scripts.slugTaken);
  }
  return result.row;
}

// ---------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------
export async function listPublicScripts(deps: ScriptDeps): Promise<{ scripts: PublicScriptDto[] }> {
  const rows = await deps.listPublished();
  return { scripts: rows.map(toPublicScriptDto) };
}

export async function listAllScripts(deps: ScriptDeps): Promise<{ scripts: ScriptDto[] }> {
  const rows = await deps.listAll();
  return { scripts: rows.map(toScriptDto) };
}

export async function getScript(deps: ScriptDeps, id: string): Promise<ScriptDto> {
  const row = await deps.findById(id);
  if (row === null) {
    throw notFound();
  }
  return toScriptDto(row);
}

// ---------------------------------------------------------------------------------
// POST /api/scripts: a new card
// ---------------------------------------------------------------------------------
export async function createScript(
  deps: ScriptDeps,
  actor: Actor,
  body: unknown,
): Promise<ScriptDto> {
  const input = ScriptSchema.parse(body); // 400 with a Bulgarian message
  const row = savedRow(
    await deps.insert({
      slug: input.slug,
      script_type: input.scriptType,
      title_bg: input.titleBg,
      how_it_starts_bg: input.howItStartsBg,
      what_they_say_bg: input.whatTheySayBg,
      what_to_do_bg: input.whatToDoBg,
      extra_keywords: input.extraKeywords,
      published: input.published,
      updated_by: actor.userId,
    }),
  );
  await deps.writeAudit({
    actorId: actor.userId,
    action: "script_created",
    targetType: "scam_script",
    targetId: row.id,
    details: { slug: row.slug, published: row.published },
  });
  return toScriptDto(row);
}

// ---------------------------------------------------------------------------------
// PATCH /api/scripts/:id: change some fields (also publish / unpublish, keywords)
// ---------------------------------------------------------------------------------
export async function updateScript(
  deps: ScriptDeps,
  actor: Actor,
  id: string,
  body: unknown,
): Promise<ScriptDto> {
  const patch = ScriptPatchSchema.parse(body); // 400 with a Bulgarian message

  // Read first: 404 for a card the caller can't see, and we need the old "published"
  // to know whether this change publishes the card.
  const before = await deps.findById(id);
  if (before === null) {
    throw notFound();
  }

  // Only the fields that were sent (undefined = "leave as it is").
  const fields: ScriptWrite = {
    updated_by: actor.userId,
    updated_at: deps.now().toISOString(),
  };
  if (patch.slug !== undefined) fields.slug = patch.slug;
  if (patch.scriptType !== undefined) fields.script_type = patch.scriptType;
  if (patch.titleBg !== undefined) fields.title_bg = patch.titleBg;
  if (patch.howItStartsBg !== undefined) fields.how_it_starts_bg = patch.howItStartsBg;
  if (patch.whatTheySayBg !== undefined) fields.what_they_say_bg = patch.whatTheySayBg;
  if (patch.whatToDoBg !== undefined) fields.what_to_do_bg = patch.whatToDoBg;
  if (patch.extraKeywords !== undefined) fields.extra_keywords = patch.extraKeywords;
  if (patch.published !== undefined) fields.published = patch.published;

  const result = await deps.update(id, fields);
  if (result === null) {
    throw notFound(); // deleted by an admin in the meantime
  }
  const row = savedRow(result);

  // One audit line per change. Publishing a draft gets its own action, so the admin's
  // log shows at a glance when a card (and its keywords) went live.
  const published = !before.published && row.published;
  await deps.writeAudit({
    actorId: actor.userId,
    action: published ? "script_published" : "script_updated",
    targetType: "scam_script",
    targetId: row.id,
    details: { slug: row.slug, fields: Object.keys(patch), published: row.published },
  });
  return toScriptDto(row);
}

// ---------------------------------------------------------------------------------
// The real deps. `client` is the public client (GET for everybody) or the caller's
// user client; `admin` (only for the audit line) is created only when needed.
// ---------------------------------------------------------------------------------
export function createScriptDeps(client: DbClient, admin: () => DbClient): ScriptDeps {
  return {
    now: () => new Date(),
    listPublished: () => listPublishedScripts(client),
    listAll: () => listScripts(client),
    findById: (id) => findScriptById(client, id),
    insert: (fields) => insertScript(client, fields),
    update: (id, fields) => updateScriptRow(client, id, fields),
    writeAudit: (entry) => writeAudit(admin(), entry),
  };
}
