// Unit tests for verdict.ts and analyseCall() (index.ts): every worked example of
// BUILD_PLAN 4.7, the D9 green wording, the money floor, script type choice,
// reasons and determinism.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { analyseCall, redactPersonalData } from "./index";
import { HARD_RULES } from "./hardRules";
import { chooseLevel, chooseScriptType, HARD_RULE_SCRIPT_BONUS } from "./verdict";
import { EMPTY_INPUT, ENGINE_VERSION } from "./types";

const D9_WORDING =
  "Няма типични признаци на измама. Ако се съмнявате, затворете и се обадете сами на близкия си на номера, който знаете.";

describe("worked examples of BUILD_PLAN 4.7", () => {
  it("police + money → HR1, red, police", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, claimedIdentity: "police", asksMoney: "yes" });
    expect(verdict.hardRules).toEqual(["HR1_POLICE_ASKS_MONEY"]);
    expect(verdict.level).toBe("red");
    expect(verdict.scriptType).toBe("police");
  });

  it("relative + money + rushing → 10 + 35 + 15 = 60 and HR6, red, relative_in_trouble", () => {
    const verdict = analyseCall({
      ...EMPTY_INPUT,
      claimedIdentity: "relative",
      asksMoney: "yes",
      rushing: "yes",
    });
    expect(verdict.score).toBe(60);
    expect(verdict.hardRules).toEqual(["HR6_RELATIVE_IN_TROUBLE"]);
    expect(verdict.level).toBe("red");
    expect(verdict.scriptType).toBe("relative_in_trouble");
  });

  it("relative + money, no rush (a real grandson borrowing) → 45, yellow", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, claimedIdentity: "relative", asksMoney: "yes" });
    expect(verdict.score).toBe(45);
    expect(verdict.hardRules).toEqual([]);
    expect(verdict.level).toBe("yellow");
    expect(verdict.headlineBg).toBe(bg.verdict.yellow.title);
    expect(verdict.adviceBg).toContain("обадите сами");
  });

  it("courier + money (cash on delivery) → 45, yellow, not red", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, claimedIdentity: "courier", asksMoney: "yes" });
    expect(verdict.score).toBe(45);
    expect(verdict.level).toBe("yellow");
    expect(verdict.scriptType).toBe("courier");
  });

  it("bank reminder that asks for nothing → 15, green with D9 wording", () => {
    const verdict = analyseCall({
      ...EMPTY_INPUT,
      claimedIdentity: "official",
      asksMoney: "no",
      text: "От банката сме. Картата ви е готова, вземете я от клона.",
    });
    expect(verdict.score).toBe(15);
    expect(verdict.level).toBe("green");
    expect(`${verdict.headlineBg} ${verdict.adviceBg}`).toBe(D9_WORDING);
  });

  it("grandchild calls to chat → 10, green with D9 wording", () => {
    const verdict = analyseCall({
      ...EMPTY_INPUT,
      claimedIdentity: "relative",
      asksMoney: "no",
      text: "Бабо, как си? Ще дойда в неделя.",
    });
    expect(verdict.score).toBe(10);
    expect(verdict.level).toBe("green");
    expect(`${verdict.headlineBg} ${verdict.adviceBg}`).toBe(D9_WORDING);
  });

  it("only 'other', empty text → 5, green with D9 wording, unknown script", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, claimedIdentity: "other" });
    expect(verdict.score).toBe(5);
    expect(verdict.level).toBe("green");
    expect(verdict.scriptType).toBe("unknown");
    expect(`${verdict.headlineBg} ${verdict.adviceBg}`).toBe(D9_WORDING);
  });

  it("text only „politsiyata, dayte parite na kuriera“ → HR1 + HR2, red, police", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, text: "politsiyata, dayte parite na kuriera" });
    expect(verdict.hardRules).toEqual(["HR1_POLICE_ASKS_MONEY", "HR2_HANDOVER_TO_STRANGER"]);
    expect(verdict.level).toBe("red");
    expect(verdict.scriptType).toBe("police");
  });
});

describe("chooseLevel", () => {
  const hr1 = HARD_RULES.slice(0, 1);

  it("is red for any hard rule, even with score 0", () => {
    expect(chooseLevel(0, hr1, EMPTY_INPUT)).toBe("red");
  });

  it("uses the 60 / 30 thresholds exactly", () => {
    expect(chooseLevel(60, [], EMPTY_INPUT)).toBe("red");
    expect(chooseLevel(59, [], EMPTY_INPUT)).toBe("yellow");
    expect(chooseLevel(30, [], EMPTY_INPUT)).toBe("yellow");
    expect(chooseLevel(29, [], EMPTY_INPUT)).toBe("green");
  });

  it("never gives green when the person said money was asked for (money floor)", () => {
    expect(chooseLevel(0, [], { ...EMPTY_INPUT, asksMoney: "yes" })).toBe("yellow");
    expect(chooseLevel(0, [], { ...EMPTY_INPUT, asksMoney: "unsure" })).toBe("green");
  });
});

describe("chooseScriptType", () => {
  it("is unknown without evidence", () => {
    expect(chooseScriptType([], [], null)).toBe("unknown");
    expect(chooseScriptType([{ category: "money", weight: 35 }], [], "other")).toBe("unknown");
  });

  it("picks the script with the most identity + scenario evidence", () => {
    const contributions = [
      { category: "identity_relative" as const, weight: 10 },
      { category: "scenario_relative" as const, weight: 15 },
      { category: "identity_official" as const, weight: 15 },
    ];
    expect(chooseScriptType(contributions, [], null)).toBe("relative_in_trouble");
  });

  it("gives a tie to the identity the person chose", () => {
    const contributions = [
      { category: "identity_official" as const, weight: 15 },
      { category: "scenario_relative" as const, weight: 15 },
    ];
    expect(chooseScriptType(contributions, [], "official")).toBe("fake_official");
    expect(chooseScriptType(contributions, [], "relative")).toBe("relative_in_trouble");
    expect(chooseScriptType(contributions, [], null)).toBe("relative_in_trouble"); // first in list order
  });

  it("counts a linked hard rule as extra evidence", () => {
    const hr5 = HARD_RULES.filter((rule) => rule.id === "HR5_SAFE_ACCOUNT");
    const contributions = [{ category: "identity_courier" as const, weight: 10 }];
    expect(HARD_RULE_SCRIPT_BONUS).toBeGreaterThan(10);
    expect(chooseScriptType(contributions, hr5, "courier")).toBe("fake_official");
  });
});

describe("reasons", () => {
  it("lists hard rules first, then categories strongest first, quoting the caller", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, text: "Хвърлете парите от терасата веднага!" });
    expect(verdict.reasons.map((reason) => reason.code)).toEqual([
      "HR2_HANDOVER_TO_STRANGER",
      "money",
      "urgency",
    ]);
    expect(verdict.reasons[0]).toEqual({
      code: "HR2_HANDOVER_TO_STRANGER",
      textBg: bg.engine.hardRules.HR2_HANDOVER_TO_STRANGER.explanation,
      evidence: ["Хвърлете", "парите", "терасата"],
    });
    expect(verdict.reasons[1]?.textBg).toBe(bg.engine.reasons.money);
  });

  it("leaves out the evidence field for answer-only reasons", () => {
    const verdict = analyseCall({ ...EMPTY_INPUT, asksMoney: "yes" });
    expect(verdict.reasons).toEqual([{ code: "money", textBg: bg.engine.reasons.money }]);
  });

  it("is never empty for red or yellow", () => {
    const inputs = [
      { ...EMPTY_INPUT, asksMoney: "yes" as const },
      { ...EMPTY_INPUT, text: "Кажете паролата." },
      {
        ...EMPTY_INPUT,
        asksMoney: "unsure" as const,
        secrecy: "unsure" as const,
        rushing: "unsure" as const,
      },
    ];
    for (const input of inputs) {
      const verdict = analyseCall(input);
      expect(verdict.level).not.toBe("green");
      expect(verdict.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("wording", () => {
  it("uses the bg.ts headline and advice for every level", () => {
    const red = analyseCall({ ...EMPTY_INPUT, claimedIdentity: "police", asksMoney: "yes" });
    expect(red.headlineBg).toBe("ТОВА Е ИЗМАМА.");
    expect(red.adviceBg).toBe(bg.verdict.red.description);
    const yellow = analyseCall({ ...EMPTY_INPUT, asksMoney: "yes" });
    expect(yellow.headlineBg).toBe("Внимание!");
  });

  it("never calls anything safe (D9)", () => {
    const green = analyseCall(EMPTY_INPUT);
    const allText = [green.headlineBg, green.adviceBg, ...green.reasons.map((r) => r.textBg)].join(
      " ",
    );
    expect(allText.toLowerCase()).not.toMatch(/безопасн|сигурно е/);
    expect(JSON.stringify(bg.verdict).toLowerCase()).not.toContain("безопасн");
  });
});

describe("analyseCall", () => {
  it("is deterministic: the same input gives the same verdict", () => {
    const input = {
      ...EMPTY_INPUT,
      claimedIdentity: "relative" as const,
      text: "sinat vi katastrofira",
    };
    expect(analyseCall(input)).toEqual(analyseCall(input));
  });

  it("does not change its input", () => {
    const input = { ...EMPTY_INPUT, asksMoney: "yes" as const, text: "Пари!" };
    const copy = structuredClone(input);
    analyseCall(input);
    expect(input).toEqual(copy);
  });

  it("stamps the engine version", () => {
    expect(analyseCall(EMPTY_INPUT).engineVersion).toBe(ENGINE_VERSION);
  });

  it("re-exports redactPersonalData", () => {
    expect(redactPersonalData("тел. 0888 123 456")).toBe("тел. [ТЕЛЕФОН]");
  });
});
