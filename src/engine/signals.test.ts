// Unit tests for signals.ts: answers + text → signals with evidence words.

import { describe, expect, it } from "vitest";
import {
  answerSignals,
  detectSignals,
  isFirm,
  MAX_EVIDENCE_WORDS,
  prepareDictionary,
  textSignals,
} from "./signals";
import { normaliseText } from "./normalise";
import { EMPTY_INPUT } from "./types";

describe("answerSignals", () => {
  it("turns a chosen identity into a firm identity signal", () => {
    const signals = answerSignals({ ...EMPTY_INPUT, claimedIdentity: "police" });
    expect(signals.get("identity_police")).toEqual({
      category: "identity_police",
      answer: "firm",
      textEvidence: [],
    });
    expect(answerSignals({ ...EMPTY_INPUT, claimedIdentity: "other" }).has("identity_other")).toBe(
      true,
    );
  });

  it("makes yes firm, unsure weak and no / unanswered absent", () => {
    const signals = answerSignals({
      ...EMPTY_INPUT,
      asksMoney: "yes",
      rushing: "unsure",
      secrecy: "no",
    });
    expect(signals.get("money")?.answer).toBe("firm");
    expect(signals.get("urgency")?.answer).toBe("weak");
    expect(signals.has("secrecy")).toBe(false);
    expect(answerSignals({ ...EMPTY_INPUT, secrecy: "yes" }).get("secrecy")?.answer).toBe("firm");
    expect(answerSignals({ ...EMPTY_INPUT, secrecy: "unsure" }).get("secrecy")?.answer).toBe(
      "weak",
    );
    expect(answerSignals({ ...EMPTY_INPUT, asksMoney: "unsure" }).get("money")?.answer).toBe(
      "weak",
    );
    expect(answerSignals({ ...EMPTY_INPUT, rushing: "yes" }).get("urgency")?.answer).toBe("firm");
    expect(answerSignals(EMPTY_INPUT).size).toBe(0);
  });

  it("maps the four handover answers", () => {
    const handover = (value: "courier_or_stranger" | "throw" | "bank_transfer" | "other") =>
      answerSignals({ ...EMPTY_INPUT, asksMoney: "yes", handover: value });
    expect(handover("courier_or_stranger").get("handover")?.answer).toBe("firm");
    expect(handover("throw").get("handover")?.answer).toBe("firm");
    expect(handover("bank_transfer").get("bank_transfer")?.answer).toBe("firm");
    expect(handover("other").get("bank_transfer")?.answer).toBe("weak");
    expect(handover("other").has("handover")).toBe(false);
  });
});

describe("textSignals", () => {
  const entries = prepareDictionary([
    { category: "money", stems: ["пари"], example: "x" },
    { category: "secrecy", phrases: [["не", "казвай", "никого"]], example: "x" },
    { category: "identity_police", stems: ["politsiya"], example: "x" },
  ]);

  it("quotes the caller's original words, in the order they were said, once each", () => {
    const found = textSignals(normaliseText("Пари! Не казвайте на никого. ПАРИ, пари."), entries);
    expect(found.get("money")).toEqual(["Пари"]);
    expect(found.get("secrecy")).toEqual(["Не", "казвайте", "никого"]);
  });

  it("normalises Latin dictionary stems too, so they match Latin and Cyrillic text", () => {
    expect(textSignals(normaliseText("politsiyata"), entries).get("identity_police")).toEqual([
      "politsiyata",
    ]);
    expect(textSignals(normaliseText("полицията"), entries).get("identity_police")).toEqual([
      "полицията",
    ]);
  });

  it("keeps at most MAX_EVIDENCE_WORDS words per category", () => {
    const many = prepareDictionary([
      { category: "money", stems: ["едно", "две", "три", "четири", "пет", "шест"], example: "x" },
    ]);
    const found = textSignals(normaliseText("едно две три четири пет шест"), many);
    expect(found.get("money")).toHaveLength(MAX_EVIDENCE_WORDS);
  });

  it("finds nothing in an empty text", () => {
    expect(textSignals([], entries).size).toBe(0);
  });
});

describe("prepareDictionary", () => {
  it("drops empty stems and turns a several-word stem into a phrase", () => {
    const [entry] = prepareDictionary([
      { category: "scenario_police", stems: ["!!!", "фалшиви банкноти", "Акция"], example: "x" },
    ]);
    expect(entry?.stems).toEqual(["акция"]);
    expect(entry?.phrases).toEqual([["фалшиви", "банкноти"]]);
  });

  it("drops phrases that normalise to nothing", () => {
    const [entry] = prepareDictionary([
      { category: "secrecy", phrases: [["?", "!"]], example: "x" },
    ]);
    expect(entry?.phrases).toEqual([]);
  });
});

describe("detectSignals with the real dictionary", () => {
  it("merges an answer and text evidence for the same category", () => {
    const signals = detectSignals({ ...EMPTY_INPUT, asksMoney: "yes", text: "Дайте парите." });
    expect(signals.get("money")).toEqual({
      category: "money",
      answer: "firm",
      textEvidence: ["парите"],
    });
  });

  it("finds every script family in plain Bulgarian", () => {
    const signals = detectSignals({
      ...EMPTY_INPUT,
      text: "Полицията, банката, внукът ви и куриерът: катастрофа, мито, компенсация, акция.",
    });
    for (const category of [
      "identity_police",
      "identity_official",
      "identity_relative",
      "identity_courier",
      "scenario_relative",
      "scenario_courier",
      "scenario_official",
      "scenario_police",
    ] as const) {
      expect(signals.has(category)).toBe(true);
    }
  });

  it("adds a moderator keyword to its existing category", () => {
    const input = { ...EMPTY_INPUT, text: "Купете ваучери." };
    expect(detectSignals(input).has("money")).toBe(false);
    const withKeyword = detectSignals({
      ...input,
      extraKeywords: [{ category: "money", stem: "ваучер" }],
    });
    expect(withKeyword.get("money")?.textEvidence).toEqual(["ваучери"]);
  });

  it("ignores an empty moderator keyword instead of matching everything", () => {
    const signals = detectSignals({
      ...EMPTY_INPUT,
      text: "Здравейте, как сте?",
      extraKeywords: [{ category: "money", stem: "  " }],
    });
    expect(signals.has("money")).toBe(false);
  });
});

describe("isFirm", () => {
  it("is true for a firm answer or a text match, false for unsure or nothing", () => {
    const signals = detectSignals({
      ...EMPTY_INPUT,
      asksMoney: "unsure",
      secrecy: "yes",
      text: "полицията",
    });
    expect(isFirm(signals, "secrecy")).toBe(true);
    expect(isFirm(signals, "identity_police")).toBe(true);
    expect(isFirm(signals, "money")).toBe(false);
    expect(isFirm(signals, "urgency")).toBe(false);
  });
});
