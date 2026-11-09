// The editor's form data (W3-05) and small pure helpers, without React, so they can
// be unit-tested: an empty draft, a draft from the API's card, and the list of fields
// that really changed (PATCH sends only those).

import type { ScriptType } from "@/engine";
import type { ScriptDto } from "@/schemas/scripts";

// What the form holds while the moderator types. Like a Python dataclass.
export type ScriptDraft = {
  slug: string;
  scriptType: ScriptType;
  titleBg: string;
  howItStartsBg: string;
  whatTheySayBg: string;
  whatToDoBg: string;
  extraKeywords: string[];
  published: boolean;
};

// A new card: empty texts, the first script type, no keywords, a draft.
export const EMPTY_DRAFT: ScriptDraft = {
  slug: "",
  scriptType: "police",
  titleBg: "",
  howItStartsBg: "",
  whatTheySayBg: "",
  whatToDoBg: "",
  extraKeywords: [],
  published: false,
};

// The card from GET /api/scripts/:id -> the form's fields.
export function draftFromScript(script: ScriptDto): ScriptDraft {
  return {
    slug: script.slug,
    scriptType: script.scriptType,
    titleBg: script.titleBg,
    howItStartsBg: script.howItStartsBg,
    whatTheySayBg: script.whatTheySayBg,
    whatToDoBg: script.whatToDoBg,
    extraKeywords: [...script.extraKeywords],
    published: script.published,
  };
}

// Only the fields that differ from the saved card (texts compared after trimming,
// keywords in their order). `Partial<ScriptDraft>` = the same keys, all optional.
export function changedFields(saved: ScriptDraft, draft: ScriptDraft): Partial<ScriptDraft> {
  const changes: Partial<ScriptDraft> = {};
  if (draft.slug.trim() !== saved.slug) changes.slug = draft.slug;
  if (draft.scriptType !== saved.scriptType) changes.scriptType = draft.scriptType;
  if (draft.titleBg.trim() !== saved.titleBg) changes.titleBg = draft.titleBg;
  if (draft.howItStartsBg.trim() !== saved.howItStartsBg)
    changes.howItStartsBg = draft.howItStartsBg;
  if (draft.whatTheySayBg.trim() !== saved.whatTheySayBg)
    changes.whatTheySayBg = draft.whatTheySayBg;
  if (draft.whatToDoBg.trim() !== saved.whatToDoBg) changes.whatToDoBg = draft.whatToDoBg;
  if (draft.extraKeywords.join(" ") !== saved.extraKeywords.join(" ")) {
    changes.extraKeywords = draft.extraKeywords;
  }
  if (draft.published !== saved.published) changes.published = draft.published;
  return changes;
}
