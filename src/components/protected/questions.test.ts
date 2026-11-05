// Unit tests for the question rules of the call check (questions.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { EMPTY_ANSWERS, optionsFor, questionOrder, withAnswer } from "./questions";

describe("questionOrder", () => {
  it("asks 4 questions when the caller doesn't want money", () => {
    expect(questionOrder(EMPTY_ANSWERS)).toEqual([
      "claimedIdentity",
      "asksMoney",
      "rushing",
      "secrecy",
    ]);
    expect(questionOrder({ ...EMPTY_ANSWERS, asksMoney: "unsure" })).toHaveLength(4);
  });

  it("asks „Как искат да ги дадете?“ only after „Да“ to money", () => {
    expect(questionOrder({ ...EMPTY_ANSWERS, asksMoney: "yes" })).toEqual([
      "claimedIdentity",
      "asksMoney",
      "handover",
      "rushing",
      "secrecy",
    ]);
  });
});

describe("withAnswer", () => {
  it("stores a valid answer without changing the original", () => {
    const next = withAnswer(EMPTY_ANSWERS, "claimedIdentity", "police");
    expect(next.claimedIdentity).toBe("police");
    expect(EMPTY_ANSWERS.claimedIdentity).toBeNull();
  });

  it("ignores a value that doesn't belong to the question", () => {
    expect(withAnswer(EMPTY_ANSWERS, "rushing", "police")).toBe(EMPTY_ANSWERS);
    expect(withAnswer(EMPTY_ANSWERS, "handover", "yes")).toBe(EMPTY_ANSWERS);
  });

  it("removes the handover answer when money is no longer „Да“", () => {
    let answers = withAnswer(EMPTY_ANSWERS, "asksMoney", "yes");
    answers = withAnswer(answers, "handover", "throw");
    expect(withAnswer(answers, "asksMoney", "yes").handover).toBe("throw");
    expect(withAnswer(answers, "asksMoney", "no").handover).toBeNull();
  });
});

describe("optionsFor", () => {
  it("has the 5 identities, 3 tri answers and 4 handover methods in Bulgarian", () => {
    expect(optionsFor("claimedIdentity").map((option) => option.label)).toEqual([
      "Полиция",
      "Роднина",
      "Банка/ток/НЗОК",
      "Куриер",
      "Друг",
    ]);
    expect(optionsFor("secrecy").map((option) => option.label)).toEqual(["Да", "Не", "Не знам"]);
    expect(optionsFor("handover")).toHaveLength(4);
    expect(optionsFor("handover")[1]?.label).toBe(bg.protectedCheck.handoverMethods.throw);
  });
});
