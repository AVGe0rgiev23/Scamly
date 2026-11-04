// Hard rules (decision D10, BUILD_PLAN 4.6): combinations that are ALWAYS a scam.
// If any one of them fires, the verdict is red, whatever the score.
//
// Each rule is a small data object:
//   * id            : HR1 … HR6 (stored with the check)
//   * explanationBg : the Bulgarian sentence shown to the person (from bg.ts)
//   * categories    : where its evidence words come from (quoted in the reason)
//   * script        : the scam script it points to (used to choose the script type)
//   * fires(signals): a one-line condition that reads like the table in 4.6
//
// Only FIRM evidence fires a rule: a definite answer ("yes", a chosen identity or
// handover method) or a match in the text. An "unsure" answer adds to the score
// (scoring.ts) but never fires a hard rule, see isFirm() in signals.ts.
//
// Pure TypeScript: imports only ./types, ./signals and the strings in @/i18n/bg.

import { bg } from "@/i18n/bg";
import { isFirm, type SignalMap } from "./signals";
import type { HardRuleId, ScriptType, SignalCategory } from "./types";

// Like a Python dataclass; `fires` is a function that takes the signals and returns a bool.
export type HardRule = {
  id: HardRuleId;
  explanationBg: string;
  categories: SignalCategory[];
  script: ScriptType | null; // null = not linked to one script
  fires: (signals: SignalMap) => boolean;
};

const texts = bg.engine.hardRules;

export const HARD_RULES: HardRule[] = [
  {
    // „Полиция иска пари“: police (answer or text) and money.
    id: "HR1_POLICE_ASKS_MONEY",
    explanationBg: texts.HR1_POLICE_ASKS_MONEY.explanation,
    categories: ["identity_police", "money"],
    script: "police",
    fires: (s) => isFirm(s, "identity_police") && isFirm(s, "money"),
  },
  {
    // „Предаване на непознат“: throw the money / give it to a courier or stranger.
    id: "HR2_HANDOVER_TO_STRANGER",
    explanationBg: texts.HR2_HANDOVER_TO_STRANGER.explanation,
    categories: ["handover"],
    script: null,
    fires: (s) => isFirm(s, "handover"),
  },
  {
    // „Тайна и пари“: "tell no one" and money.
    id: "HR3_SECRECY_AND_MONEY",
    explanationBg: texts.HR3_SECRECY_AND_MONEY.explanation,
    categories: ["secrecy", "money"],
    script: null,
    fires: (s) => isFirm(s, "secrecy") && isFirm(s, "money"),
  },
  {
    // „Искат кодове“: PIN, password, SMS code, CVV, card number (text only).
    id: "HR4_ASKS_FOR_CODES",
    explanationBg: texts.HR4_ASKS_FOR_CODES.explanation,
    categories: ["credentials"],
    script: null,
    fires: (s) => isFirm(s, "credentials"),
  },
  {
    // „Сигурна сметка“: a "safe account", or "move your money" from police/an official.
    id: "HR5_SAFE_ACCOUNT",
    explanationBg: texts.HR5_SAFE_ACCOUNT.explanation,
    categories: ["safe_account", "move_money", "identity_official", "identity_police"],
    script: "fake_official",
    fires: (s) =>
      isFirm(s, "safe_account") ||
      (isFirm(s, "move_money") && (isFirm(s, "identity_official") || isFirm(s, "identity_police"))),
  },
  {
    // „Роднина в беда“: relative and money and (hurry or a trouble story).
    id: "HR6_RELATIVE_IN_TROUBLE",
    explanationBg: texts.HR6_RELATIVE_IN_TROUBLE.explanation,
    categories: ["identity_relative", "money", "urgency", "scenario_relative"],
    script: "relative_in_trouble",
    fires: (s) =>
      isFirm(s, "identity_relative") &&
      isFirm(s, "money") &&
      (isFirm(s, "urgency") || isFirm(s, "scenario_relative")),
  },
];

// The rules that fire for these signals, in the order HR1 → HR6.
// `.filter(...)` keeps matching items, like [r for r in HARD_RULES if r.fires(signals)].
export function firedHardRules(signals: SignalMap): HardRule[] {
  return HARD_RULES.filter((rule) => rule.fires(signals));
}
