// Unit tests for the education card text helpers (text.ts, W3-05).

import { describe, expect, it } from "vitest";
import { splitPhrases, splitSentences } from "./text";

describe("splitPhrases", () => {
  it("puts each quote on its own line", () => {
    expect(splitPhrases("„Помогнете ни.“ „Не казвайте на никого.“  „Не затваряйте.“")).toEqual([
      "„Помогнете ни.“",
      "„Не казвайте на никого.“",
      "„Не затваряйте.“",
    ]);
  });

  it("keeps a text without quotes as one line, and ignores empty text", () => {
    expect(splitPhrases("Искат пари за мито.")).toEqual(["Искат пари за мито."]);
    expect(splitPhrases("  ")).toEqual([]);
  });
});

describe("splitSentences", () => {
  it("makes one step per sentence", () => {
    expect(splitSentences("Затворете телефона. Обадете се на близък! Обадете се на 112.")).toEqual([
      "Затворете телефона.",
      "Обадете се на близък!",
      "Обадете се на 112.",
    ]);
  });

  it("does not split after an abbreviation followed by a small letter", () => {
    expect(splitSentences("Звъни служител, напр. от банката. Затворете.")).toEqual([
      "Звъни служител, напр. от банката.",
      "Затворете.",
    ]);
  });
});
