// Unit tests for the scam-script library (scriptService.ts, W3-05) with an in-memory
// fake of the scam_scripts table instead of Supabase. The real RLS rules (guests see
// only published cards, only moderators write) are tested in supabase/tests/06 and 12.

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { bg } from "@/i18n/bg";
import type { Actor } from "@/server/auth/actor";
import { ApiError } from "@/server/http/errors";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import type { ScriptRow, ScriptWrite } from "@/server/repositories/scriptsRepository";
import {
  createScript,
  getScript,
  listAllScripts,
  listPublicScripts,
  updateScript,
  type ScriptDeps,
} from "@/server/services/scriptService";

const MODERATOR: Actor = {
  userId: "mod-1",
  role: "moderator",
  profile: {
    id: "mod-1",
    role: "moderator",
    display_name: "Мод",
    email_alerts: true,
    created_at: "",
  },
  device: null,
};
const NOW = new Date("2026-11-09T10:00:00Z");

function row(overrides: Partial<ScriptRow>): ScriptRow {
  return {
    id: "5c000000-0000-4000-8000-000000000001",
    slug: "politsai",
    script_type: "police",
    title_bg: "Фалшив полицай",
    how_it_starts_bg: "Звъни „полицай“.",
    what_they_say_bg: "Помогнете ни.",
    what_to_do_bg: "Затворете.",
    extra_keywords: [],
    published: true,
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

const NEW_CARD = {
  slug: "kolet-kurier",
  scriptType: "courier",
  titleBg: "Колет",
  howItStartsBg: "SMS за пратка.",
  whatTheySayBg: "Платете митото.",
  whatToDoBg: "Не плащайте.",
  extraKeywords: ["Митниц"],
};

// The fake table: an array of rows, plus the audit lines that were written.
function fakeDeps(rows: ScriptRow[]) {
  const audit: AuditEntry[] = [];
  const updates: { id: string; fields: ScriptWrite }[] = [];
  const deps: ScriptDeps = {
    now: () => NOW,
    listPublished: async () => rows.filter((r) => r.published),
    listAll: async () => rows,
    findById: async (id) => rows.find((r) => r.id === id) ?? null,
    insert: async (fields) => {
      if (rows.some((r) => r.slug === fields.slug)) {
        return { kind: "slug_taken" };
      }
      const created = row({
        id: "5c000000-0000-4000-8000-0000000000ff",
        slug: fields.slug,
        script_type: fields.script_type,
        title_bg: fields.title_bg,
        how_it_starts_bg: fields.how_it_starts_bg,
        what_they_say_bg: fields.what_they_say_bg,
        what_to_do_bg: fields.what_to_do_bg,
        extra_keywords: fields.extra_keywords,
        published: fields.published,
      });
      rows.push(created);
      return { kind: "saved", row: created };
    },
    update: async (id, fields) => {
      updates.push({ id, fields });
      const index = rows.findIndex((r) => r.id === id);
      const current = rows[index];
      if (current === undefined) {
        return null;
      }
      if (fields.slug !== undefined && rows.some((r) => r.slug === fields.slug && r.id !== id)) {
        return { kind: "slug_taken" };
      }
      const changed: ScriptRow = {
        ...current,
        ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
        ...(fields.title_bg !== undefined ? { title_bg: fields.title_bg } : {}),
        ...(fields.extra_keywords !== undefined ? { extra_keywords: fields.extra_keywords } : {}),
        ...(fields.published !== undefined ? { published: fields.published } : {}),
        ...(fields.updated_at !== undefined ? { updated_at: fields.updated_at } : {}),
      };
      rows[index] = changed;
      return { kind: "saved", row: changed };
    },
    writeAudit: async (entry) => {
      audit.push(entry);
    },
  };
  return { deps, audit, updates, rows };
}

// Runs a promise that should fail and returns the error (like pytest.raises).
async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

const DRAFT_ID = "5c000000-0000-4000-8000-000000000002";

describe("reading the library", () => {
  it("everybody gets only the published cards, without id, keywords or draft flag", async () => {
    const { deps } = fakeDeps([
      row({ extra_keywords: ["жетон"] }),
      row({ id: DRAFT_ID, slug: "chernova", published: false }),
    ]);

    const result = await listPublicScripts(deps);

    expect(result.scripts).toEqual([
      {
        slug: "politsai",
        scriptType: "police",
        titleBg: "Фалшив полицай",
        howItStartsBg: "Звъни „полицай“.",
        whatTheySayBg: "Помогнете ни.",
        whatToDoBg: "Затворете.",
      },
    ]);
  });

  it("the editor's list has drafts too, with id, keywords and published", async () => {
    const { deps } = fakeDeps([row({}), row({ id: DRAFT_ID, slug: "chernova", published: false })]);

    const result = await listAllScripts(deps);

    expect(result.scripts.map((s) => [s.slug, s.published])).toEqual([
      ["politsai", true],
      ["chernova", false],
    ]);
    expect(result.scripts[0]).toHaveProperty("extraKeywords", []);
  });

  it("one card by id, or 404", async () => {
    const { deps } = fakeDeps([row({})]);
    expect((await getScript(deps, "5c000000-0000-4000-8000-000000000001")).slug).toBe("politsai");
    const error = await failure(getScript(deps, DRAFT_ID));
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});

describe("createScript (POST /api/scripts)", () => {
  it("stores a new draft with clean keywords and writes script_created", async () => {
    const { deps, audit, rows } = fakeDeps([row({})]);

    const script = await createScript(deps, MODERATOR, NEW_CARD);

    expect(script).toMatchObject({
      slug: "kolet-kurier",
      published: false,
      extraKeywords: ["митниц"],
    });
    expect(rows).toHaveLength(2);
    expect(audit).toEqual([
      {
        actorId: "mod-1",
        action: "script_created",
        targetType: "scam_script",
        targetId: script.id,
        details: { slug: "kolet-kurier", published: false },
      },
    ]);
  });

  it("answers 409 with a Bulgarian message when the slug is taken, and audits nothing", async () => {
    const { deps, audit } = fakeDeps([row({})]);

    const error = await failure(createScript(deps, MODERATOR, { ...NEW_CARD, slug: "politsai" }));

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).messageBg).toBe(bg.scripts.slugTaken);
    expect(audit).toEqual([]);
  });

  it("rejects a bad keyword before anything is stored", async () => {
    const { deps, rows } = fakeDeps([]);

    const error = await failure(
      createScript(deps, MODERATOR, { ...NEW_CARD, extraKeywords: ["abc"] }),
    );

    expect(error).toBeInstanceOf(ZodError);
    expect(rows).toEqual([]);
  });
});

describe("updateScript (PATCH /api/scripts/:id)", () => {
  it("publishing a draft writes script_published and stamps who and when", async () => {
    const { deps, audit, updates } = fakeDeps([row({ id: DRAFT_ID, published: false })]);

    const script = await updateScript(deps, MODERATOR, DRAFT_ID, { published: true });

    expect(script.published).toBe(true);
    expect(updates).toEqual([
      {
        id: DRAFT_ID,
        fields: { published: true, updated_by: "mod-1", updated_at: NOW.toISOString() },
      },
    ]);
    expect(audit).toEqual([
      {
        actorId: "mod-1",
        action: "script_published",
        targetType: "scam_script",
        targetId: DRAFT_ID,
        details: { slug: "politsai", fields: ["published"], published: true },
      },
    ]);
  });

  it("other changes (also unpublishing) write script_updated with the changed fields", async () => {
    const { deps, audit } = fakeDeps([row({})]);
    const id = "5c000000-0000-4000-8000-000000000001";

    await updateScript(deps, MODERATOR, id, { extraKeywords: ["жетон"], titleBg: "Нов" });
    await updateScript(deps, MODERATOR, id, { published: false });

    expect(audit.map((entry) => [entry.action, entry.details])).toEqual([
      [
        "script_updated",
        { slug: "politsai", fields: ["titleBg", "extraKeywords"], published: true },
      ],
      ["script_updated", { slug: "politsai", fields: ["published"], published: false }],
    ]);
  });

  it("sends only the fields that were given", async () => {
    const { deps, updates } = fakeDeps([row({})]);

    await updateScript(deps, MODERATOR, "5c000000-0000-4000-8000-000000000001", {
      titleBg: "Ново",
    });

    expect(Object.keys(updates[0]?.fields ?? {}).sort()).toEqual([
      "title_bg",
      "updated_at",
      "updated_by",
    ]);
  });

  it("404 for a card the caller can't see, 400 for an empty change, 409 for a taken slug", async () => {
    const { deps, audit } = fakeDeps([row({}), row({ id: DRAFT_ID, slug: "chernova" })]);

    const missing = await failure(
      updateScript(deps, MODERATOR, "5c000000-0000-4000-8000-0000000000aa", { published: true }),
    );
    expect((missing as ApiError).status).toBe(404);

    const empty = await failure(updateScript(deps, MODERATOR, DRAFT_ID, {}));
    expect(empty).toBeInstanceOf(ZodError);

    const taken = await failure(updateScript(deps, MODERATOR, DRAFT_ID, { slug: "politsai" }));
    expect((taken as ApiError).status).toBe(409);

    expect(audit).toEqual([]);
  });
});
