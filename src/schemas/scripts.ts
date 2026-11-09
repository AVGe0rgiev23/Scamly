// Input rules (Zod schemas) and answer shapes for the scam-script library, the education
// cards „Как работи измамата“ (BUILD_PLAN 3, #26, #30, #31; task W3-05):
//
//   ScriptSchema         POST  /api/scripts       a new card (moderator or admin)
//   ScriptPatchSchema    PATCH /api/scripts/:id   change some fields of a card
//   PublicScriptDto      what GET /api/scripts sends to everybody (published cards only)
//   ScriptDto            what the moderator's editor gets (also drafts and keywords)
//
// No server-only code here, so the editor in the browser checks a form with exactly the
// same rules the server uses. A Zod schema is like a Pydantic model.

import { z } from "zod";
import { SCRIPT_TYPES, type ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";

// Limits of a card. The database allows a little more (120 / 2000 characters); the API
// keeps the cards short, because they are for older people and grandchildren.
export const MAX_TITLE_LENGTH = 80;
export const MAX_SCRIPT_TEXT_LENGTH = 1500;
export const MAX_SLUG_LENGTH = 60;
// Extra keywords: word beginnings ("stems") that a moderator teaches the engine.
export const MAX_KEYWORDS = 30;
export const MIN_KEYWORD_LENGTH = 3;
export const MAX_KEYWORD_LENGTH = 30;

// A slug is the card's address: /kak-raboti/<slug>. Latin lower-case letters, digits and
// single hyphens, e.g. "rodnina-v-beda" (Bulgarian words in Latin letters, Q12).
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// One stem: only Bulgarian lower-case letters (а–я and ѝ), no spaces, no digits.
// Shorter stems than 3 letters would match far too many words („па“ → пари, парк, па…).
const KEYWORD_PATTERN = /^[а-яѝ]+$/u;

// The same rule for one keyword, also used by the editor's chips before it adds one.
// Returns the cleaned stem (trimmed, lower case) or null with the reason in Bulgarian.
export function checkKeyword(
  typed: string,
): { ok: true; stem: string } | { ok: false; messageBg: string } {
  const stem = typed.trim().toLowerCase();
  if (stem.length < MIN_KEYWORD_LENGTH || stem.length > MAX_KEYWORD_LENGTH) {
    return { ok: false, messageBg: bg.scripts.keywordLength };
  }
  if (!KEYWORD_PATTERN.test(stem)) {
    return { ok: false, messageBg: bg.scripts.keywordLetters };
  }
  return { ok: true, stem };
}

// A list of keywords: each one checked, duplicates removed (in their first order).
const KeywordsSchema = z
  .array(
    z.string({ error: bg.scripts.keywordLetters }).superRefine((typed, context) => {
      const result = checkKeyword(typed);
      if (!result.ok) {
        context.addIssue({ code: "custom", message: result.messageBg });
      }
    }),
    { error: bg.scripts.keywordsInvalid },
  )
  .max(MAX_KEYWORDS, { error: bg.scripts.keywordsTooMany })
  // like list(dict.fromkeys(...)) in Python: lower case, trimmed, each stem once
  .transform((typed) => [...new Set(typed.map((stem) => stem.trim().toLowerCase()))]);

// A required Bulgarian text field of a card, trimmed, 1..max characters.
function cardText(max: number, messageBg: string) {
  return z
    .string({ error: messageBg })
    .trim()
    .min(1, { error: messageBg })
    .max(max, { error: messageBg });
}

// The fields of a card, as one object (POST needs all of them). In the same order as
// the editor's form, so the first error Zod reports is the first wrong field on screen.
const scriptFields = {
  titleBg: cardText(MAX_TITLE_LENGTH, bg.scripts.titleInvalid),
  scriptType: z.enum(SCRIPT_TYPES, { error: bg.scripts.scriptTypeInvalid }),
  slug: z
    .string({ error: bg.scripts.slugInvalid })
    .trim()
    .min(1, { error: bg.scripts.slugInvalid })
    .max(MAX_SLUG_LENGTH, { error: bg.scripts.slugInvalid })
    .regex(SLUG_PATTERN, { error: bg.scripts.slugInvalid }),
  howItStartsBg: cardText(MAX_SCRIPT_TEXT_LENGTH, bg.scripts.textInvalid),
  whatTheySayBg: cardText(MAX_SCRIPT_TEXT_LENGTH, bg.scripts.textInvalid),
  whatToDoBg: cardText(MAX_SCRIPT_TEXT_LENGTH, bg.scripts.textInvalid),
  extraKeywords: KeywordsSchema,
  published: z.boolean({ error: bg.scripts.publishedInvalid }),
};

// POST /api/scripts: a whole new card. `.strict()` rejects unknown fields (e.g. "id").
export const ScriptSchema = z
  .object(
    {
      ...scriptFields,
      extraKeywords: scriptFields.extraKeywords.default([]),
      published: scriptFields.published.default(false),
    },
    { error: bg.errors.validation },
  )
  .strict();

// PATCH /api/scripts/:id: any of the fields, but at least one.
export const ScriptPatchSchema = z
  .object(scriptFields, { error: bg.errors.validation })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, { error: bg.scripts.nothingToChange });

// The checked input (like the Python object a Pydantic model gives you).
export type ScriptInput = z.infer<typeof ScriptSchema>;
export type ScriptPatch = z.infer<typeof ScriptPatchSchema>;

// One education card as everybody sees it (GET /api/scripts, the /kak-raboti pages).
export type PublicScriptDto = {
  slug: string;
  scriptType: ScriptType;
  titleBg: string;
  howItStartsBg: string;
  whatTheySayBg: string;
  whatToDoBg: string;
};

// One card as the moderator's editor sees it: also drafts, the keywords and the id.
export type ScriptDto = PublicScriptDto & {
  id: string;
  extraKeywords: string[];
  published: boolean;
  updatedAt: string;
};
