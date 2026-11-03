// Validate the safety-critical data contract; these are not verdict-engine tests.
import { describe, expect, it } from "vitest";
import { DICTIONARY } from "./dictionary";
import { SCENARIOS } from "./__tests__/scenarios";
import { HARD_RULE_IDS, PHRASE_WINDOW, SIGNAL_CATEGORIES } from "./types";

describe("engine data contracts", () => {
  it("covers every text category without inventing evidence for the other answer", () => {
    const categories = new Set(DICTIONARY.map((entry) => entry.category));
    expect([...categories].sort()).toEqual(
      SIGNAL_CATEGORIES.filter((category) => category !== "identity_other").sort(),
    );
    for (const entry of DICTIONARY) {
      expect(entry.example.trim().length).toBeGreaterThan(0);
      expect((entry.stems?.length ?? 0) + (entry.phrases?.length ?? 0)).toBeGreaterThan(0);
      for (const phrase of entry.phrases ?? []) {
        expect(phrase.length).toBeGreaterThanOrEqual(2);
        expect(phrase.length).toBeLessThanOrEqual(PHRASE_WINDOW);
      }
      for (const stem of [...(entry.stems ?? []), ...(entry.phrases ?? []).flat()]) {
        expect(stem).toMatch(/^[a-zа-яѝ]+$/u);
      }
    }
  });

  it("keeps high-risk combinations contextual rather than matching common lone words", () => {
    for (const category of ["handover", "safe_account", "move_money"]) {
      for (const entry of DICTIONARY.filter((item) => item.category === category)) {
        expect(entry.stems ?? []).toHaveLength(0);
        expect(entry.phrases?.length).toBeGreaterThan(0);
      }
    }
  });

  it("provides at least 25 uniquely named cases and red expectations for all hard rules", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(SCENARIOS.map((scenario) => scenario.name)).size).toBe(SCENARIOS.length);
    for (const rule of HARD_RULE_IDS) {
      expect(
        SCENARIOS.some(
          (scenario) =>
            scenario.expect.level === "red" && scenario.expect.hardRules?.includes(rule),
        ),
      ).toBe(true);
    }
    for (const scenario of SCENARIOS) {
      if (scenario.expect.mustNotBeRed) expect(scenario.expect.level).not.toBe("red");
      if (scenario.expect.minScore !== undefined && scenario.expect.maxScore !== undefined) {
        expect(scenario.expect.minScore).toBeLessThanOrEqual(scenario.expect.maxScore);
      }
    }
  });
});
