// Unit tests for fuzzy.ts: Damerau-Levenshtein distance, stem matching, phrases.

import { describe, expect, it } from "vitest";
import { allowedEdits, damerauLevenshtein, findPhrase, matchesStem } from "./fuzzy";

describe("damerauLevenshtein", () => {
  it("is 0 for equal words and the length for an empty word", () => {
    expect(damerauLevenshtein("пари", "пари")).toBe(0);
    expect(damerauLevenshtein("", "пари")).toBe(4);
    expect(damerauLevenshtein("пари", "")).toBe(4);
    expect(damerauLevenshtein("", "")).toBe(0);
  });

  it("counts one change, one insertion and one deletion as 1 each", () => {
    expect(damerauLevenshtein("хвърл", "хварл")).toBe(1); // change ъ → а
    expect(damerauLevenshtein("полиц", "полиоц")).toBe(1); // insert
    expect(damerauLevenshtein("полиц", "плиц")).toBe(1); // delete
  });

  it("counts a swap of two neighbouring letters as ONE edit (plain Levenshtein says 2)", () => {
    expect(damerauLevenshtein("хвърл", "хвръл")).toBe(1);
    expect(damerauLevenshtein("ab", "ba")).toBe(1);
  });

  it("adds up several edits and is symmetric", () => {
    expect(damerauLevenshtein("kitten", "sitting")).toBe(3);
    expect(damerauLevenshtein("sitting", "kitten")).toBe(3);
    expect(damerauLevenshtein("ca", "abc")).toBe(3); // optimal string alignment: no edit on a swapped pair
  });
});

describe("allowedEdits", () => {
  it("follows the tolerance table of BUILD_PLAN 4.4", () => {
    expect([1, 2, 3, 4].map(allowedEdits)).toEqual([0, 0, 0, 0]);
    expect([5, 6, 7, 8].map(allowedEdits)).toEqual([1, 1, 1, 1]);
    expect([9, 12].map(allowedEdits)).toEqual([2, 2]);
  });
});

describe("matchesStem", () => {
  it("matches word forms by prefix", () => {
    expect(matchesStem("хвърлете", "хвърл")).toBe(true);
    expect(matchesStem("хвърлям", "хвърл")).toBe(true);
    expect(matchesStem("полицията", "полиц")).toBe(true);
  });

  it("allows one typo for a 5–8 letter stem: хварлете ≈ хвърл", () => {
    expect(matchesStem("хварлете", "хвърл")).toBe(true); // changed letter
    expect(matchesStem("хврълете", "хвърл")).toBe(true); // swapped letters
    expect(matchesStem("полецията", "полиц")).toBe(true);
    expect(matchesStem("плицията", "полиц")).toBe(true); // missing letter
    expect(matchesStem("пооличията", "полиц")).toBe(false); // two edits: too many
  });

  it("allows two typos for a stem of 9+ letters", () => {
    expect(matchesStem("катсатрофа", "катастроф")).toBe(true); // one swap
    expect(matchesStem("катстрофа", "катастроф")).toBe(true); // one missing letter
    expect(matchesStem("кетастрова", "катастроф")).toBe(true); // two changes
    expect(matchesStem("кетестрова", "катастроф")).toBe(false); // three changes
  });

  it("never matches short stems (≤ 4 letters) fuzzily", () => {
    expect(matchesStem("пара", "пари")).toBe(false);
    expect(matchesStem("сйф", "сейф")).toBe(false);
    expect(matchesStem("мвп", "мвр")).toBe(false);
  });

  it("matches a short stem as a whole word or with a grammatical ending only", () => {
    expect(matchesStem("пари", "пари")).toBe(true);
    expect(matchesStem("парите", "пари")).toBe(true);
    expect(matchesStem("еврото", "евро")).toBe(true);
    expect(matchesStem("часа", "час")).toBe(true);
    expect(matchesStem("напомняме", "нап")).toBe(false);
    expect(matchesStem("европейски", "евро")).toBe(false);
    expect(matchesStem("левия", "лев")).toBe(false);
  });

  it("matches 1–2 letter stems only as the whole word", () => {
    expect(matchesStem("не", "не")).toBe(true);
    expect(matchesStem("нещо", "не")).toBe(false);
    expect(matchesStem("доставка", "до")).toBe(false);
  });

  it("does not match a token that is too short or an empty stem", () => {
    expect(matchesStem("сме", "сметка")).toBe(false);
    expect(matchesStem("", "полиц")).toBe(false);
    expect(matchesStem("полиция", "")).toBe(false);
  });
});

describe("findPhrase", () => {
  const tokens = ["моля", "не", "казвайте", "на", "никого", "за", "това"];

  it("finds the stems in order and returns their positions", () => {
    expect(findPhrase(tokens, ["не", "казвай", "никого"])).toEqual([1, 2, 4]);
  });

  it("needs the stems in the right order", () => {
    expect(findPhrase(tokens, ["никого", "не"])).toBeNull();
  });

  it("needs every stem inside the window of 6 tokens", () => {
    const far = ["хвърлете", "а", "б", "в", "г", "д", "парите"];
    expect(findPhrase(far, ["хвърл", "пари"])).toBeNull(); // парите is the 7th token
    const near = ["хвърлете", "а", "б", "в", "г", "парите"];
    expect(findPhrase(near, ["хвърл", "пари"])).toEqual([0, 5]); // the 6th token still counts
  });

  it("tries later starts when an earlier one fails, and tolerates typos", () => {
    const text = ["не", "знам", "а", "б", "в", "г", "д", "не", "затваряйте"];
    expect(findPhrase(text, ["не", "затваря"])).toEqual([7, 8]);
    expect(findPhrase(["хварлете", "парите"], ["хвърл", "пари"])).toEqual([0, 1]);
  });

  it("returns null for an empty phrase or no tokens", () => {
    expect(findPhrase(tokens, [])).toBeNull();
    expect(findPhrase([], ["не", "казвай"])).toBeNull();
  });
});
