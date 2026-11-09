// Unit tests for the editor's form helpers (scriptForm.ts, W3-05).

import { describe, expect, it } from "vitest";
import { changedFields, draftFromScript, EMPTY_DRAFT } from "./scriptForm";

const SAVED = draftFromScript({
  id: "5c000000-0000-4000-8000-000000000001",
  slug: "politsai",
  scriptType: "police",
  titleBg: "Фалшив полицай",
  howItStartsBg: "Звъни.",
  whatTheySayBg: "„Помогнете.“",
  whatToDoBg: "Затворете.",
  extraKeywords: ["жетон"],
  published: false,
  updatedAt: "2026-11-09T10:00:00Z",
});

describe("changedFields", () => {
  it("is empty when nothing changed (also with extra spaces around a text)", () => {
    expect(changedFields(SAVED, { ...SAVED, titleBg: " Фалшив полицай " })).toEqual({});
  });

  it("lists only the fields that changed", () => {
    expect(changedFields(SAVED, { ...SAVED, published: true })).toEqual({ published: true });
    expect(
      changedFields(SAVED, { ...SAVED, extraKeywords: ["жетон", "ваучер"], whatToDoBg: "Ново." }),
    ).toEqual({ extraKeywords: ["жетон", "ваучер"], whatToDoBg: "Ново." });
  });

  it("a new card starts as an empty draft", () => {
    expect(EMPTY_DRAFT.published).toBe(false);
    expect(EMPTY_DRAFT.extraKeywords).toEqual([]);
  });
});
