// Unit tests for scoring.ts: the weights table and "each category counts once".

import { describe, expect, it } from "vitest";
import { scoreSignals, signalWeight, WEIGHTS } from "./scoring";
import { detectSignals, type Signal, type SignalMap } from "./signals";
import { EMPTY_INPUT, SIGNAL_CATEGORIES, type SignalCategory } from "./types";

// Builds a SignalMap by hand, like a small dict literal in Python.
function signalsOf(list: Signal[]): SignalMap {
  return new Map(list.map((signal) => [signal.category, signal] as [SignalCategory, Signal]));
}

describe("WEIGHTS", () => {
  it("has exactly the weights of BUILD_PLAN 4.5", () => {
    expect(WEIGHTS.identity_police).toEqual({ firmAnswer: 25, weakAnswer: 0, text: 25 });
    expect(WEIGHTS.identity_official.text).toBe(15);
    expect(WEIGHTS.identity_relative.text).toBe(10);
    expect(WEIGHTS.identity_courier.text).toBe(10);
    expect(WEIGHTS.identity_other).toEqual({ firmAnswer: 5, weakAnswer: 0, text: 0 });
    expect(WEIGHTS.money).toEqual({ firmAnswer: 35, weakAnswer: 15, text: 30 });
    expect(WEIGHTS.urgency).toEqual({ firmAnswer: 15, weakAnswer: 5, text: 15 });
    expect(WEIGHTS.secrecy).toEqual({ firmAnswer: 20, weakAnswer: 10, text: 20 });
    expect(WEIGHTS.scenario_police.text).toBe(15);
    expect(WEIGHTS.scenario_relative.text).toBe(15);
    expect(WEIGHTS.scenario_official.text).toBe(10);
    expect(WEIGHTS.scenario_courier.text).toBe(10);
    expect(WEIGHTS.bank_transfer).toEqual({ firmAnswer: 10, weakAnswer: 5, text: 10 });
  });

  it("gives no weight to the four hard-rule-only categories", () => {
    for (const category of ["handover", "credentials", "safe_account", "move_money"] as const) {
      expect(WEIGHTS[category]).toEqual({ firmAnswer: 0, weakAnswer: 0, text: 0 });
    }
  });

  it("never gives a weight above 35 to one category", () => {
    for (const category of SIGNAL_CATEGORIES) {
      const { firmAnswer, weakAnswer, text } = WEIGHTS[category];
      expect(Math.max(firmAnswer, weakAnswer, text)).toBeLessThanOrEqual(35);
    }
  });
});

describe("signalWeight", () => {
  it("takes the stronger of answer and text, never the sum", () => {
    const both: Signal = { category: "money", answer: "firm", textEvidence: ["пари"] };
    expect(signalWeight(both)).toBe(35);
    const weakAndText: Signal = { category: "money", answer: "weak", textEvidence: ["пари"] };
    expect(signalWeight(weakAndText)).toBe(30);
    const weakOnly: Signal = { category: "money", answer: "weak", textEvidence: [] };
    expect(signalWeight(weakOnly)).toBe(15);
    const textOnly: Signal = { category: "secrecy", answer: null, textEvidence: ["тайна"] };
    expect(signalWeight(textOnly)).toBe(20);
  });
});

describe("scoreSignals", () => {
  it("adds one contribution per category and sorts them strongest first", () => {
    const { score, contributions } = scoreSignals(
      signalsOf([
        { category: "identity_relative", answer: "firm", textEvidence: [] },
        { category: "money", answer: "firm", textEvidence: [] },
        { category: "urgency", answer: "firm", textEvidence: [] },
      ]),
    );
    expect(score).toBe(60);
    expect(contributions).toEqual([
      { category: "money", weight: 35 },
      { category: "urgency", weight: 15 },
      { category: "identity_relative", weight: 10 },
    ]);
  });

  it("keeps weightless categories out of the contributions", () => {
    const { score, contributions } = scoreSignals(
      signalsOf([{ category: "handover", answer: "firm", textEvidence: [] }]),
    );
    expect(score).toBe(0);
    expect(contributions).toEqual([]);
  });

  it("caps the score at 100", () => {
    const signals = detectSignals({
      ...EMPTY_INPUT,
      claimedIdentity: "police",
      asksMoney: "yes",
      rushing: "yes",
      secrecy: "yes",
      handover: "bank_transfer",
      text: "Полицейска акция.",
    });
    expect(scoreSignals(signals).score).toBe(100);
  });

  it("is 0 for no signals", () => {
    expect(scoreSignals(new Map())).toEqual({ score: 0, contributions: [] });
  });
});
