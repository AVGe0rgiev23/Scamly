// Unit tests for normalise.ts: text → tokens (original + normalised).

import { describe, expect, it } from "vitest";
import { normaliseText, normaliseWord, replaceDigitLetters } from "./normalise";
import { MAX_TEXT_LENGTH } from "./types";

// Only the normalised words, to keep the expectations short.
function words(text: string): string[] {
  return normaliseText(text).map((token) => token.normalised);
}

describe("normaliseText", () => {
  it("lower-cases, strips punctuation and splits into words", () => {
    expect(words("  ПОЛИЦИЯТА!!!\nДАЙТЕ   ПАРИ.  ")).toEqual(["полицията", "дайте", "пари"]);
    expect(words("Не казвайте на никого, моля!")).toEqual([
      "не",
      "казвайте",
      "на",
      "никого",
      "моля",
    ]);
  });

  it("keeps the original words next to the normalised ones", () => {
    expect(normaliseText("ПОЛИЦИЯТА, politsiyata!")).toEqual([
      { original: "ПОЛИЦИЯТА", normalised: "полицията" },
      { original: "politsiyata", normalised: "полицията" },
    ]);
  });

  it("transliterates Latin words and keeps Cyrillic ones in a mixed text", () => {
    expect(words("От полицията сме, dayte pari.")).toEqual([
      "от",
      "полицията",
      "сме",
      "дайте",
      "пари",
    ]);
  });

  it("returns no tokens for empty or whitespace-only text", () => {
    expect(normaliseText("")).toEqual([]);
    expect(normaliseText(" \n\t ")).toEqual([]);
    expect(normaliseText("?!...")).toEqual([]);
  });

  it("reads only the first MAX_TEXT_LENGTH characters", () => {
    const tokens = words("а".repeat(MAX_TEXT_LENGTH) + " полиция");
    expect(tokens).toEqual(["а".repeat(MAX_TEXT_LENGTH)]);
  });

  it("applies Unicode NFC, so a decomposed й equals the single letter й", () => {
    const decomposed = "й";
    expect(words(`дай${decomposed}те`)).toEqual(words("даййте"));
    expect(words(decomposed)).toEqual(["й"]);
  });

  it("splits on hyphens and apostrophes", () => {
    expect(words("МВР-то, ПИН-а")).toEqual(["мвр", "то", "пин", "а"]);
  });
});

describe("digits used as letters", () => {
  it("turns 4 and 6 into ч and ш inside words", () => {
    expect(replaceDigitLetters("ka6ete")).toBe("kaшete");
    expect(replaceDigitLetters("4ovek")).toBe("чovek");
    expect(words("ne ka6ete na nikogo")).toEqual(["не", "кашете", "на", "никого"]);
  });

  it("leaves numbers alone", () => {
    expect(replaceDigitLetters("6")).toBe("6");
    expect(replaceDigitLetters("46")).toBe("46");
    expect(replaceDigitLetters("1000")).toBe("1000");
    expect(words("6 часа и 400 лева")).toEqual(["6", "часа", "и", "400", "лева"]);
  });
});

describe("normaliseWord", () => {
  it("normalises one dictionary stem the same way as a text word", () => {
    expect(normaliseWord("Politsiya")).toBe("полиция");
    expect(normaliseWord("CVV")).toBe("цвв");
    expect(normaliseWord("хвърл")).toBe("хвърл");
  });
});
