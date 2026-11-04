// Verdict builder: score + hard rules → level, script type, reasons and wording
// (BUILD_PLAN 4.7).
//
// 1. Level (the traffic light), checked in this order:
//      any hard rule fired          → red
//      score ≥ 60                   → red
//      score ≥ 30                   → yellow
//      asksMoney answer is "yes"    → yellow   ("money floor": a request for money is never green)
//      otherwise                    → green    (D9 wording, never "safe")
// 2. Script type: the script with the most evidence. Evidence of a script =
//    its identity weight + its scenario weight + HARD_RULE_SCRIPT_BONUS if its
//    linked hard rule fired (HR1 → police, HR5 → fake official, HR6 → relative).
//    A tie goes to the identity the person chose; no evidence → "unknown".
// 3. Reasons: one per fired hard rule (first, they decide the verdict), then one per
//    contributing category, strongest first. Each quotes the caller's words when
//    the text matched. Red and yellow always have at least one reason.
// 4. Headline and advice: bg.verdict[level] (the same texts the Verdict component shows).
//
// Pure TypeScript: imports only ./types, ./hardRules, ./scoring, ./signals and @/i18n/bg.

import { bg } from "@/i18n/bg";
import type { HardRule } from "./hardRules";
import type { Contribution } from "./scoring";
import type { SignalMap } from "./signals";
import {
  ENGINE_VERSION,
  RISK_THRESHOLDS,
  type CallInput,
  type ClaimedIdentity,
  type Reason,
  type RiskLevel,
  type ScriptType,
  type SignalCategory,
  type Verdict,
} from "./types";

// A fired hard rule linked to a script counts like this much extra evidence for it.
export const HARD_RULE_SCRIPT_BONUS = 20;

// The four scam scripts and the categories that point to each.
// `Exclude<ScriptType, "unknown">` = every script type except "unknown".
type KnownScript = Exclude<ScriptType, "unknown">;
const SCRIPTS: { script: KnownScript; identity: SignalCategory; scenario: SignalCategory }[] = [
  { script: "police", identity: "identity_police", scenario: "scenario_police" },
  { script: "relative_in_trouble", identity: "identity_relative", scenario: "scenario_relative" },
  { script: "fake_official", identity: "identity_official", scenario: "scenario_official" },
  { script: "courier", identity: "identity_courier", scenario: "scenario_courier" },
];

// Which script the person's identity answer points to (null for "other" / no answer).
function scriptOfIdentity(identity: ClaimedIdentity | null): KnownScript | null {
  if (identity === "police") return "police";
  if (identity === "relative") return "relative_in_trouble";
  if (identity === "official") return "fake_official";
  if (identity === "courier") return "courier";
  return null;
}

// Step 1.
export function chooseLevel(score: number, hardRules: HardRule[], input: CallInput): RiskLevel {
  if (hardRules.length > 0) return "red";
  if (score >= RISK_THRESHOLDS.red) return "red";
  if (score >= RISK_THRESHOLDS.yellow) return "yellow";
  if (input.asksMoney === "yes") return "yellow"; // money floor
  return "green";
}

// Step 2.
export function chooseScriptType(
  contributions: Contribution[],
  hardRules: HardRule[],
  claimedIdentity: ClaimedIdentity | null,
): ScriptType {
  const weightOf = (category: SignalCategory): number =>
    contributions.find((item) => item.category === category)?.weight ?? 0;

  let bestScript: ScriptType = "unknown";
  let bestEvidence = 0;
  const answered = scriptOfIdentity(claimedIdentity);
  for (const { script, identity, scenario } of SCRIPTS) {
    const ruleBonus = hardRules.some((rule) => rule.script === script) ? HARD_RULE_SCRIPT_BONUS : 0;
    const evidence = weightOf(identity) + weightOf(scenario) + ruleBonus;
    const winsTie = evidence === bestEvidence && script === answered;
    if (evidence > bestEvidence || (evidence > 0 && winsTie)) {
      bestScript = script;
      bestEvidence = evidence;
    }
  }
  return bestScript;
}

// The text evidence of some categories, without repeats, in the given order.
function evidenceOf(signals: SignalMap, categories: SignalCategory[]): string[] {
  const words: string[] = [];
  for (const category of categories) {
    for (const word of signals.get(category)?.textEvidence ?? []) {
      if (!words.includes(word)) words.push(word);
    }
  }
  return words;
}

// A reason, with `evidence` only when there are words to quote.
function makeReason(code: Reason["code"], textBg: string, evidence: string[]): Reason {
  return evidence.length > 0 ? { code, textBg, evidence } : { code, textBg };
}

// Step 3.
export function buildReasons(
  signals: SignalMap,
  contributions: Contribution[],
  hardRules: HardRule[],
): Reason[] {
  const reasons: Reason[] = hardRules.map((rule) =>
    makeReason(rule.id, rule.explanationBg, evidenceOf(signals, rule.categories)),
  );
  for (const { category } of contributions) {
    reasons.push(
      makeReason(category, bg.engine.reasons[category], evidenceOf(signals, [category])),
    );
  }
  return reasons;
}

// Steps 1–4 together.
export function buildVerdict(
  input: CallInput,
  signals: SignalMap,
  score: number,
  contributions: Contribution[],
  hardRules: HardRule[],
): Verdict {
  const level = chooseLevel(score, hardRules, input);
  return {
    score,
    level,
    scriptType: chooseScriptType(contributions, hardRules, input.claimedIdentity),
    hardRules: hardRules.map((rule) => rule.id),
    reasons: buildReasons(signals, contributions, hardRules),
    headlineBg: bg.verdict[level].title,
    adviceBg: bg.verdict[level].description,
    engineVersion: ENGINE_VERSION,
  };
}
