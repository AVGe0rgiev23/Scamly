// Unit tests for the scam-script library's input rules (src/schemas/scripts.ts, W3-05).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { checkKeyword, ScriptPatchSchema, ScriptSchema } from "@/schemas/scripts";

const VALID = {
  slug: "rodnina-v-beda",
  scriptType: "relative_in_trouble",
  titleBg: "Роднина в беда",
  howItStartsBg: "Звъни непознат и плаче.",
  whatTheySayBg: "„Мамо, катастрофирах.“",
  whatToDoBg: "Затворете и се обадете сами.",
};

// The first Bulgarian message of a failed parse (what the API would answer).
function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("ScriptSchema (POST /api/scripts)", () => {
  it("accepts a valid card and fills the defaults: no keywords, not published", () => {
    expect(ScriptSchema.parse(VALID)).toEqual({ ...VALID, extraKeywords: [], published: false });
  });

  it("accepts all five script types", () => {
    for (const scriptType of [
      "police",
      "relative_in_trouble",
      "fake_official",
      "courier",
      "unknown",
    ]) {
      expect(ScriptSchema.safeParse({ ...VALID, scriptType }).success).toBe(true);
    }
    expect(firstMessage(ScriptSchema.safeParse({ ...VALID, scriptType: "pirate" }))).toBe(
      bg.scripts.scriptTypeInvalid,
    );
  });

  it("accepts only Latin lower-case slugs with single hyphens", () => {
    for (const slug of ["politsai", "kolet-kurier", "a1"]) {
      expect(ScriptSchema.safeParse({ ...VALID, slug }).success).toBe(true);
    }
    for (const slug of ["", "Politsai", "полицай", "a--b", "-a", "a-", "a b", "x".repeat(61)]) {
      expect(firstMessage(ScriptSchema.safeParse({ ...VALID, slug }))).toBe(bg.scripts.slugInvalid);
    }
  });

  it("limits the title to 1–80 characters and each text to 1–1500", () => {
    expect(ScriptSchema.safeParse({ ...VALID, titleBg: "т".repeat(80) }).success).toBe(true);
    expect(firstMessage(ScriptSchema.safeParse({ ...VALID, titleBg: "т".repeat(81) }))).toBe(
      bg.scripts.titleInvalid,
    );
    expect(firstMessage(ScriptSchema.safeParse({ ...VALID, titleBg: "   " }))).toBe(
      bg.scripts.titleInvalid,
    );
    for (const field of ["howItStartsBg", "whatTheySayBg", "whatToDoBg"]) {
      expect(ScriptSchema.safeParse({ ...VALID, [field]: "т".repeat(1500) }).success).toBe(true);
      expect(firstMessage(ScriptSchema.safeParse({ ...VALID, [field]: "т".repeat(1501) }))).toBe(
        bg.scripts.textInvalid,
      );
      expect(firstMessage(ScriptSchema.safeParse({ ...VALID, [field]: "" }))).toBe(
        bg.scripts.textInvalid,
      );
    }
  });

  it("cleans keywords: trimmed, lower case, each stem once", () => {
    const input = ScriptSchema.parse({ ...VALID, extraKeywords: [" Жетон ", "жетон", "ваучер"] });
    expect(input.extraKeywords).toEqual(["жетон", "ваучер"]);
  });

  it("rejects Latin, digits, spaces, too short and too long keywords", () => {
    for (const stem of ["zheton", "жетон1", "два думи", "ab", "аб", "ж".repeat(31)]) {
      expect(ScriptSchema.safeParse({ ...VALID, extraKeywords: [stem] }).success).toBe(false);
    }
  });

  it("allows at most 30 keywords", () => {
    const stems = Array.from(
      { length: 31 },
      (_, index) => "дума" + String.fromCharCode(0x430 + index),
    );
    expect(ScriptSchema.safeParse({ ...VALID, extraKeywords: stems.slice(0, 30) }).success).toBe(
      true,
    );
    expect(firstMessage(ScriptSchema.safeParse({ ...VALID, extraKeywords: stems }))).toBe(
      bg.scripts.keywordsTooMany,
    );
  });

  it("rejects unknown fields such as an id", () => {
    expect(ScriptSchema.safeParse({ ...VALID, id: "x" }).success).toBe(false);
  });
});

describe("ScriptPatchSchema (PATCH /api/scripts/:id)", () => {
  it("accepts a single field, e.g. publishing", () => {
    expect(ScriptPatchSchema.parse({ published: true })).toEqual({ published: true });
  });

  it("rejects an empty change with a Bulgarian message", () => {
    expect(firstMessage(ScriptPatchSchema.safeParse({}))).toBe(bg.scripts.nothingToChange);
  });

  it("checks the fields that are sent with the same rules", () => {
    expect(ScriptPatchSchema.safeParse({ extraKeywords: ["abc"] }).success).toBe(false);
    expect(ScriptPatchSchema.safeParse({ published: "yes" }).success).toBe(false);
  });
});

describe("checkKeyword (the editor's chips)", () => {
  it("returns the cleaned stem or the reason", () => {
    expect(checkKeyword("  Жетон ")).toEqual({ ok: true, stem: "жетон" });
    expect(checkKeyword("ѝзвест")).toEqual({ ok: true, stem: "ѝзвест" });
    expect(checkKeyword("ab")).toEqual({ ok: false, messageBg: bg.scripts.keywordLength });
    expect(checkKeyword("token")).toEqual({ ok: false, messageBg: bg.scripts.keywordLetters });
  });
});
