// Scenario runner (Session H step 8): turns each of Roberta's scenarios in
// __tests__/scenarios.ts into one Vitest test and checks every expectation that is
// present, as types.ts documents it:
//   level exactly · scriptType exactly (if given) · hardRules as an exact set,
//   order ignored (if given; [] = none may fire) · minScore ≤ score ≤ maxScore
//   (if given) · mustNotBeRed → level is not red.
// It also checks the output shape the brief asks for (section 9) on every scenario.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { SCENARIOS } from "./__tests__/scenarios";
import { analyseCall } from "./index";

describe("Roberta's engine scenarios", () => {
  // `it.each(list)("... $name", fn)` makes one test per item, like
  // @pytest.mark.parametrize; `$name` puts the scenario's name in the test title.
  it.each(SCENARIOS)("$name", ({ input, expect: wanted }) => {
    const verdict = analyseCall(input);

    expect(verdict.level).toBe(wanted.level);
    if (wanted.scriptType !== undefined) expect(verdict.scriptType).toBe(wanted.scriptType);
    if (wanted.hardRules !== undefined) {
      expect([...verdict.hardRules].sort()).toEqual([...wanted.hardRules].sort());
    }
    if (wanted.minScore !== undefined)
      expect(verdict.score).toBeGreaterThanOrEqual(wanted.minScore);
    if (wanted.maxScore !== undefined) expect(verdict.score).toBeLessThanOrEqual(wanted.maxScore);
    if (wanted.mustNotBeRed === true) expect(verdict.level).not.toBe("red");

    // Output shape (brief section 9), for every scenario.
    expect(Number.isInteger(verdict.score)).toBe(true);
    expect(verdict.score).toBeGreaterThanOrEqual(0);
    expect(verdict.score).toBeLessThanOrEqual(100);
    if (verdict.level !== "green") expect(verdict.reasons.length).toBeGreaterThan(0);
    expect(verdict.headlineBg).toBe(bg.verdict[verdict.level].title);
  });
});
