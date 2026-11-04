// Public API of the detection engine („Разпознаване“, Layer 1, BUILD_PLAN 4).
//
// analyseCall(input) is the whole algorithm in four steps:
//   1. detectSignals  (signals.ts) : answers + normalised text → evidence per category
//                                     (normalise.ts → transliterate.ts → fuzzy.ts → dictionary.ts)
//   2. scoreSignals   (scoring.ts) : each category once, max(answer, text) weight → score 0–100
//   3. firedHardRules (hardRules.ts): HR1–HR6 on firm evidence → force red (D10)
//   4. buildVerdict   (verdict.ts) : level, script type, reasons, Bulgarian wording
//
// It is a PURE, DETERMINISTIC function: no database, no network, no clock, no
// randomness. The same input always gives the same verdict, so it can be tested
// exhaustively and run both on the server and on the phone (BUILD_PLAN 4.9).
//
// Other files import the engine only from here: `import { analyseCall } from "@/engine"`.

import { firedHardRules } from "./hardRules";
import { scoreSignals } from "./scoring";
import { detectSignals } from "./signals";
import type { CallInput, Verdict } from "./types";
import { buildVerdict } from "./verdict";

export function analyseCall(input: CallInput): Verdict {
  const signals = detectSignals(input);
  const { score, contributions } = scoreSignals(signals);
  const hardRules = firedHardRules(signals);
  return buildVerdict(input, signals, score, contributions, hardRules);
}

// Re-exports: `export { x } from "./file"` makes x importable from "@/engine" too,
// like `from .redact import redact_personal_data` in a Python package's __init__.py.
export { redactPersonalData } from "./redact";
export * from "./types";
