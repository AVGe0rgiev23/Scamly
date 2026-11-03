// Detection engine: shared types and constants (no logic in this file).
//
// This file describes the "shape" of everything the engine reads and returns:
//   * CallInput    : the answers + text of the older person (BUILD_PLAN 4.1)
//   * Verdict      : what the engine returns (BUILD_PLAN 4.2)
//   * SignalCategory, HardRuleId : the ids used by scoring and hard rules (4.5, 4.6)
//   * DictionaryEntry, ExtraKeyword : the shape of Roberta's dictionary.ts
//   * EngineScenario : the shape of Roberta's test cases in __tests__/scenarios.ts
//
// It is pure TypeScript with NO imports (no React, Next.js, Supabase or Node),
// because the same engine runs on the server and on the phone (BUILD_PLAN 4.9).
//
// Python comparisons for the TypeScript ideas used below:
//   * `export`          : other files may import this name (in Python every top-level name can be imported)
//   * `type X = {...}`  : like a Python TypedDict (only describes the shape, creates nothing at runtime)
//   * `X | null`        : like Optional[X] in Python
//   * `field?: X`       : the field may be missing, like NotRequired[X] in a TypedDict
//   * `string[]`        : like list[str]
//
// The value lists below must match the database enums in
// supabase/migrations/20261102000001_schema.sql exactly. types.test.ts checks that.

// -----------------------------------------------------------------------------
// Answer values (the questions in BUILD_PLAN 4.1)
// -----------------------------------------------------------------------------

// "Кой казва, че е?" Same values as the database enum public.claimed_identity.
// `as const` makes the array read-only and keeps the exact strings,
// like a Python tuple of Literal values: ("police", "relative", ...).
export const CLAIMED_IDENTITIES = ["police", "relative", "official", "courier", "other"] as const;

// "Any one item of CLAIMED_IDENTITIES": "police" | "relative" | ...
// Like Python's Literal["police", "relative", "official", "courier", "other"].
export type ClaimedIdentity = (typeof CLAIMED_IDENTITIES)[number];

// Answer to a yes/no question where the person may not be sure (enum public.tri).
export const TRI_ANSWERS = ["yes", "no", "unsure"] as const;
export type TriAnswer = (typeof TRI_ANSWERS)[number]; // like Literal["yes", "no", "unsure"]

// "Как искат да ги дадете?" (enum public.handover_method). Only asked if asksMoney = "yes".
export const HANDOVER_METHODS = ["courier_or_stranger", "throw", "bank_transfer", "other"] as const;
export type HandoverMethod = (typeof HANDOVER_METHODS)[number];

// -----------------------------------------------------------------------------
// Input (BUILD_PLAN 4.1)
// -----------------------------------------------------------------------------

// A stem that a moderator added to a scam card (table scam_scripts, column
// extra_keywords). The service turns each one into an ExtraKeyword and passes it in.
// It always belongs to an EXISTING category, so it can't invent a new weight (4.5).
export type ExtraKeyword = {
  category: SignalCategory;
  stem: string; // Cyrillic, lower case, e.g. "фалшив"
};

// Everything the engine needs to judge one call. Like a Python TypedDict.
// `null` means "not answered" (the person skipped the question or only typed text).
export type CallInput = {
  claimedIdentity: ClaimedIdentity | null; // like Optional[ClaimedIdentity]
  asksMoney: TriAnswer | null;
  handover: HandoverMethod | null; // only asked if asksMoney = "yes"
  rushing: TriAnswer | null;
  secrecy: TriAnswer | null;
  text: string; // what the caller said; may be "" (the engine uses at most MAX_TEXT_LENGTH chars)
  extraKeywords?: ExtraKeyword[]; // may be missing; from the moderator script library
};

// A CallInput with nothing answered and no text. Handy for tests:
// `{ ...EMPTY_INPUT, asksMoney: "yes" }` copies it and changes one field,
// like `{**EMPTY_INPUT, "asksMoney": "yes"}` in Python. Never change it directly.
export const EMPTY_INPUT: CallInput = {
  claimedIdentity: null,
  asksMoney: null,
  handover: null,
  rushing: null,
  secrecy: null,
  text: "",
};

// -----------------------------------------------------------------------------
// Signal categories (BUILD_PLAN 4.5)
// -----------------------------------------------------------------------------

// One id per kind of evidence. Each category adds its weight to the score at
// most once (the stronger of the answer and the text). The weights themselves
// live in scoring.ts, not here.
export const SIGNAL_CATEGORIES = [
  "identity_police", // says they are police, МВР, ДАНС, a prosecutor... (weight 25)
  "identity_official", // bank, ЕВН, НЗОК, НАП, НОИ, pensions, "a clerk" (15)
  "identity_relative", // son, daughter, grandchild, "бабо", "мамо" (10)
  "identity_courier", // courier, parcel, delivery (10)
  "identity_other", // answer "other" only; no text stems (5)
  "money", // money or valuables: пари, спестявания, злато, бижута, сейф (30)
  "urgency", // hurry: веднага, спешно, няма време, до час (15)
  "secrecy", // "don't tell anyone": не казвайте на никого, тайна, не затваряйте (20)
  "scenario_police", // police story: акция, залавяме измамници, фалшиви банкноти (15)
  "scenario_relative", // relative in trouble: катастрофа, болница, арест, гаранция (15)
  "scenario_official", // official story: надвзета сума, компенсация, неплатена сметка (10)
  "scenario_courier", // courier story: мито, доплащане, такса за доставка (10)
  "bank_transfer", // pay by bank: преведете, превод, сметка (10)
  // The four below have no weight row in 4.5. They exist so that hard rules can
  // fire from the text alone (a hard rule makes the verdict red anyway):
  "handover", // HR2: хвърлете парите от терасата / дайте ги на куриера / оставете ги пред вратата
  "credentials", // HR4: ПИН, парола, код от SMS, CVV, номер на карта
  "safe_account", // HR5: сигурна / защитена / безопасна сметка
  "move_money", // HR5, only together with identity police/official: прехвърлете парите
] as const;

// Like Literal["identity_police", "identity_official", ...].
export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// Dictionary entry: the shape of src/engine/dictionary.ts (written by Roberta)
// -----------------------------------------------------------------------------

// One group of words for one category. A category may have several entries
// (for example one per meaning), each with its own example sentence.
//
//   stems   : word BEGINNINGS in Cyrillic, lower case. "хвърл" matches хвърлете,
//             хвърли, хвърлям. Short stems (≤ 4 letters) must match exactly, longer
//             ones allow 1–2 typos (BUILD_PLAN 4.4), so don't make stems too short.
//             The engine turns шльокавица into Cyrillic first, but if a Latin
//             spelling still doesn't match, add it as a separate stem ("politsi").
//   phrases : each phrase is a list of stems that must appear IN THIS ORDER within
//             PHRASE_WINDOW (6) words. ["не", "казв", "никог"] matches
//             „не казвайте на никого“. Like list[list[str]] in Python.
//   example : a real example sentence, so a reader sees what the entry is for.
//
// Example:
//   { category: "handover", phrases: [["хвърл", "пари"], ["хвърл", "терас"]],
//     example: "Хвърлете парите от терасата, колегата ще ги вземе." }
export type DictionaryEntry = {
  category: SignalCategory;
  stems?: string[]; // like list[str]; may be missing if the entry only has phrases
  phrases?: string[][]; // like list[list[str]]; may be missing if it only has stems
  example: string;
};

// -----------------------------------------------------------------------------
// Output (BUILD_PLAN 4.2)
// -----------------------------------------------------------------------------

// Traffic-light result (enum public.risk_level).
export const RISK_LEVELS = ["green", "yellow", "red"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// Which known scam script it looks like (enum public.script_type).
export const SCRIPT_TYPES = [
  "police",
  "relative_in_trouble",
  "fake_official",
  "courier",
  "unknown",
] as const;
export type ScriptType = (typeof SCRIPT_TYPES)[number];

// The six hard rules (D10, BUILD_PLAN 4.6). Any one of them forces a red verdict.
// Stored as text in checks.hard_rules.
export const HARD_RULE_IDS = [
  "HR1_POLICE_ASKS_MONEY", // police (answer or text) + money
  "HR2_HANDOVER_TO_STRANGER", // throw the money / give it to a courier or stranger
  "HR3_SECRECY_AND_MONEY", // "tell no one" + money
  "HR4_ASKS_FOR_CODES", // asks for PIN, passwords, SMS codes, card number
  "HR5_SAFE_ACCOUNT", // "move your money to a safe account"
  "HR6_RELATIVE_IN_TROUBLE", // relative + money + (hurry or trouble story)
] as const;
export type HardRuleId = (typeof HARD_RULE_IDS)[number];

// A reason is about either a hard rule or a signal category, so its code is one
// of those ids. Stored as text in checks.reason_codes.
export type ReasonCode = HardRuleId | SignalCategory; // like Union[HardRuleId, SignalCategory]

// One line of "why" shown to the person and the family. Like a TypedDict.
export type Reason = {
  code: ReasonCode;
  textBg: string; // Bulgarian explanation, taken from src/i18n/bg.ts
  evidence?: string[]; // may be missing; the ORIGINAL words that matched, e.g. ["хвърлете", "терасата"]
};

// What analyseCall() returns. Like a TypedDict.
export type Verdict = {
  score: number; // 0–100, whole number
  level: RiskLevel;
  scriptType: ScriptType;
  hardRules: HardRuleId[]; // e.g. ["HR1_POLICE_ASKS_MONEY"]; [] if none fired
  reasons: Reason[]; // never empty for red or yellow
  headlineBg: string; // „ТОВА Е ИЗМАМА.“ / „Внимание!“ / D9 wording for green (never "safe")
  adviceBg: string; // „Затворете телефона. Полицията никога не иска пари.“
  engineVersion: string; // ENGINE_VERSION, stored with each check
};

// -----------------------------------------------------------------------------
// Test scenario: the shape of src/engine/__tests__/scenarios.ts (written by Roberta)
// -----------------------------------------------------------------------------

// What a scenario expects. Alex's runner (Session H step 8) turns each scenario
// into one Vitest test and checks every field that is present:
export type ScenarioExpectation = {
  level: RiskLevel; // must be exactly this level
  scriptType?: ScriptType; // if given: must be exactly this script type
  hardRules?: HardRuleId[]; // if given: exactly these rules fired (order doesn't matter); [] = none may fire
  minScore?: number; // if given: score >= minScore
  maxScore?: number; // if given: score <= maxScore
  mustNotBeRed?: boolean; // true for legitimate calls (grandchild, bank reminder, doctor, courier): level must not be red
};

// One test case as plain data. The input is a full CallInput; start from
// EMPTY_INPUT to keep it short: `input: { ...EMPTY_INPUT, text: "..." }`.
export type EngineScenario = {
  name: string; // short, unique; becomes the test name, e.g. "police + money, answers only"
  input: CallInput;
  expect: ScenarioExpectation;
  note?: string; // may be missing; why we expect this (shown nowhere, for the reader)
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Version of the rules, stored with each check so old verdicts can be explained.
// Change it whenever weights, rules or the dictionary change.
export const ENGINE_VERSION = "1.0.0";

// Score limits (BUILD_PLAN 4.7): score >= 60 is red, score >= 30 is yellow.
export const RISK_THRESHOLDS = { red: 60, yellow: 30 } as const;

// The engine only reads the first 2000 characters (same limit as the database
// column checks.text_redacted).
export const MAX_TEXT_LENGTH = 2000;

// The stems of a phrase must appear within this many words (BUILD_PLAN 4.4).
export const PHRASE_WINDOW = 6;
