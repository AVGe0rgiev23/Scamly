// Unit tests for hardRules.ts: every hard rule (D10) fires on firm evidence from
// answers and from text, and never on "unsure" answers alone.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { firedHardRules, HARD_RULES } from "./hardRules";
import { detectSignals } from "./signals";
import { EMPTY_INPUT, HARD_RULE_IDS, type CallInput, type HardRuleId } from "./types";

// The ids of the rules that fire for one input.
function rulesFor(input: CallInput): HardRuleId[] {
  return firedHardRules(detectSignals(input)).map((rule) => rule.id);
}

describe("HARD_RULES", () => {
  it("has the six rules HR1–HR6 in order, each with its bg.ts explanation", () => {
    expect(HARD_RULES.map((rule) => rule.id)).toEqual([...HARD_RULE_IDS]);
    for (const rule of HARD_RULES) {
      expect(rule.explanationBg).toBe(bg.engine.hardRules[rule.id].explanation);
      expect(rule.explanationBg.length).toBeGreaterThan(10);
    }
  });
});

describe("HR1 police asks for money", () => {
  it("fires from answers, from text and from a mix", () => {
    expect(rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police", asksMoney: "yes" })).toEqual([
      "HR1_POLICE_ASKS_MONEY",
    ]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "От полицията сме, трябват пари." })).toEqual([
      "HR1_POLICE_ASKS_MONEY",
    ]);
    expect(
      rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police", text: "Пригответе парите." }),
    ).toEqual(["HR1_POLICE_ASKS_MONEY"]);
  });

  it("does not fire on police alone or on an unsure money answer", () => {
    expect(rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police" })).toEqual([]);
    expect(rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police", asksMoney: "unsure" })).toEqual(
      [],
    );
    expect(rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police", asksMoney: "no" })).toEqual([]);
  });
});

describe("HR2 handover to a stranger", () => {
  it("fires on the courier/stranger and throw answers", () => {
    expect(rulesFor({ ...EMPTY_INPUT, handover: "courier_or_stranger" })).toEqual([
      "HR2_HANDOVER_TO_STRANGER",
    ]);
    expect(rulesFor({ ...EMPTY_INPUT, handover: "throw" })).toEqual(["HR2_HANDOVER_TO_STRANGER"]);
  });

  it("fires on throw / give / leave phrases in the text", () => {
    expect(rulesFor({ ...EMPTY_INPUT, text: "Хвърлете торбата от балкона." })).toEqual([
      "HR2_HANDOVER_TO_STRANGER",
    ]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Предайте плика на нашия колега." })).toEqual([
      "HR2_HANDOVER_TO_STRANGER",
    ]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Оставете го в пощенската кутия." })).toEqual([
      "HR2_HANDOVER_TO_STRANGER",
    ]);
  });

  it("does not fire on a bank transfer, a courier alone or a balcony alone", () => {
    expect(rulesFor({ ...EMPTY_INPUT, handover: "bank_transfer" })).toEqual([]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Куриерът ще дойде утре." })).toEqual([]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Излезте на балкона." })).toEqual([]);
  });
});

describe("HR3 secrecy and money", () => {
  it("fires from answers and from text", () => {
    expect(rulesFor({ ...EMPTY_INPUT, asksMoney: "yes", secrecy: "yes" })).toEqual([
      "HR3_SECRECY_AND_MONEY",
    ]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Не казвайте на никого за парите." })).toEqual([
      "HR3_SECRECY_AND_MONEY",
    ]);
  });

  it("does not fire on unsure answers or on secrecy without money", () => {
    expect(rulesFor({ ...EMPTY_INPUT, asksMoney: "yes", secrecy: "unsure" })).toEqual([]);
    expect(rulesFor({ ...EMPTY_INPUT, asksMoney: "unsure", secrecy: "yes" })).toEqual([]);
    expect(rulesFor({ ...EMPTY_INPUT, secrecy: "yes" })).toEqual([]);
  });
});

describe("HR4 asks for codes", () => {
  it("fires on PIN, password, SMS code, CVV and card number requests", () => {
    for (const text of [
      "Кажете ми ПИН кода.",
      "Дайте паролата си.",
      "Продиктувайте кода от SMS.",
      "Кажете CVV.",
      "Продиктувайте номера на картата.",
      "Kazhete parolata.",
    ]) {
      expect(rulesFor({ ...EMPTY_INPUT, text })).toEqual(["HR4_ASKS_FOR_CODES"]);
    }
  });

  it("does not fire on a safety reminder that only mentions a PIN", () => {
    expect(rulesFor({ ...EMPTY_INPUT, text: "Никога не казвайте ПИН на никого." })).toEqual([]);
  });
});

describe("HR5 safe account", () => {
  it("fires on a safe / protected account phrase", () => {
    expect(rulesFor({ ...EMPTY_INPUT, text: "Ще ги преместим в защитена сметка." })).toEqual([
      "HR5_SAFE_ACCOUNT",
    ]);
  });

  it("fires on moving the money only together with police or an official", () => {
    expect(rulesFor({ ...EMPTY_INPUT, text: "Прехвърлете парите." })).toEqual([]);
    expect(
      rulesFor({ ...EMPTY_INPUT, claimedIdentity: "official", text: "Прехвърлете парите." }),
    ).toEqual(["HR5_SAFE_ACCOUNT"]);
    expect(
      rulesFor({ ...EMPTY_INPUT, claimedIdentity: "police", text: "Прехвърлете парите." }).sort(),
    ).toEqual(["HR1_POLICE_ASKS_MONEY", "HR5_SAFE_ACCOUNT"]);
  });

  it("does not fire on an ordinary account", () => {
    expect(rulesFor({ ...EMPTY_INPUT, text: "Сметката за тока е готова." })).toEqual([]);
  });
});

describe("HR6 relative in trouble", () => {
  it("fires on relative + money + hurry, and on relative + money + trouble story", () => {
    expect(
      rulesFor({ ...EMPTY_INPUT, claimedIdentity: "relative", asksMoney: "yes", rushing: "yes" }),
    ).toEqual(["HR6_RELATIVE_IN_TROUBLE"]);
    expect(rulesFor({ ...EMPTY_INPUT, text: "Синът ви е в болница, трябват пари." })).toEqual([
      "HR6_RELATIVE_IN_TROUBLE",
    ]);
  });

  it("does not fire on a relative borrowing money calmly, or with an unsure hurry", () => {
    expect(rulesFor({ ...EMPTY_INPUT, claimedIdentity: "relative", asksMoney: "yes" })).toEqual([]);
    expect(
      rulesFor({
        ...EMPTY_INPUT,
        claimedIdentity: "relative",
        asksMoney: "yes",
        rushing: "unsure",
      }),
    ).toEqual([]);
    expect(
      rulesFor({
        ...EMPTY_INPUT,
        claimedIdentity: "relative",
        asksMoney: "unsure",
        rushing: "yes",
      }),
    ).toEqual([]);
  });
});

describe("unsure answers", () => {
  it("never fire any hard rule, even all together", () => {
    expect(
      rulesFor({
        ...EMPTY_INPUT,
        claimedIdentity: "relative",
        asksMoney: "unsure",
        rushing: "unsure",
        secrecy: "unsure",
      }),
    ).toEqual([]);
  });
});
