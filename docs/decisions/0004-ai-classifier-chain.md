<!-- Records D6 and BUILD_PLAN 4.10; nothing of the AI layer is implemented yet, and it is the first feature to cut (D12). -->
# ADR 0004: optional AI second opinion through a classifier chain ending in the rules

Date: 4 November 2026

Status: accepted (D6); implementation planned for Week 3 (W3-07). First feature to cut if we run late (D12).

## Context

Scamly's verdict comes from a rule-based detection engine (`src/engine/`): a pure TypeScript function with weighted signals, hard rules that force red (D10) and stem/typo matching. It works offline, is explainable in the defense and is fully testable. Its weakness is new wording that our dictionary does not know yet.

A language model could recognise such wording. But free AI tiers have rate limits, outages and terms that can change (risk R6); a model can hallucinate; its Bulgarian may contain mistakes that the jury scores; and free tiers may use inputs for training. The worst possible bug in Scamly is a false "safe" ([D9](../PROJECT_BRIEF.md#0-decision-log-decided-on-2-november-2026)). The budget is about €0 (D11).

## Options

| Option | Benefit | Limitation for this project |
|---|---|---|
| **Rules always, plus an optional AI chain that can only raise the level** | Rules always answer, even offline; AI may catch new wording; one wrong AI answer has limited effect | Two systems to build and test; AI can't correct a false red from the rules |
| Rules only | Simplest; fully explainable | Misses new scam scripts until someone adds keywords |
| AI only | Handles any wording | No answer without internet or a free API; can't be tested or explained like rules; a hallucination could calm someone during a real scam |
| Paid APIs (OpenAI, Claude) or our own hosted open model | Better limits or more control | Costs money (D11) or needs a server with a GPU |
| Averaging rules and AI, or trusting AI when confident | Uses AI more fully | Lets AI lower a red verdict, which breaks D9 |

## Decision

Keep the rule engine as the authoritative first layer, and add an **optional AI layer behind a `ScamClassifier` interface** (like a Python Protocol), turned on with `FEATURE_AI` (default off).

- Providers: `GeminiClassifier` (Google Gemini free tier), `GroqClassifier` (Groq free tier) and `RuleBasedClassifier`, which wraps the engine and never throws. A future multi-model router is just another `ScamClassifier`.
- `ClassifierChain` tries providers in order **Gemini → Groq → rules**, with a **timeout per provider** (planned 3 s, 7 s in total). A timeout, an error, a rate limit or JSON that fails the `AiOpinionSchema` Zod check moves on to the next provider. The chain **always ends with the rule engine**, so it always returns an answer.
- `combineVerdicts(rule, ai)`: the AI opinion is ignored below 0.6 confidence; it may **raise the level by at most one step** (green → yellow, yellow → red); it can **never lower** the level, and a red from the rules stays red. Each of these has its own test.
- Only **redacted text** (`redactPersonalData()`) and the structured answers are sent. The caller's text goes in a clearly marked data block, and the output is limited to enums plus a short text that React escapes, so prompt injection cannot cause harm.
- The protected person sees only our **curated Bulgarian wording from `bg.ts`**. The AI explanation appears only in the family's history, labelled „Допълнителен анализ (ИИ)“.
- The result screen shows the rule verdict at once; the AI review (`POST /api/checks/:id/ai-review`) runs afterwards and may only raise it.

## Consequences

Good: the red "hang up" message never depends on an AI provider or the network. AI can add value on unfamiliar wording while the rules and hard rules keep their guarantees. A provider that is slow, down or returns nonsense simply drops out of the chain. The app is complete without this layer, so cutting it costs nothing else.

Bad: two systems to build, test and explain. Free tiers can change or disappear at any time; then we turn `FEATURE_AI` off. Even redacted text leaves our system and may be used for training. If the rules are too strict (a false red), AI cannot correct it. The AI review adds a short delay before a raised level appears, and AI text may contain Bulgarian mistakes, which is why the older person never sees it. API keys for Gemini and Groq are two more secrets. No paid service is approved by this ADR.

## Current implementation and completion evidence

Present now: only configuration. `src/lib/env.ts` accepts optional `GEMINI_API_KEY` and `GROQ_API_KEY`, `.env.example` documents them, and `src/config/features.ts` has the `ai` switch (default off). **No classifier, chain, `combineVerdicts` or `/ai-review` route exists yet.** The parts the AI layer will build on are done (4 Nov 2026): the rule engine `analyseCall()` (W1-08 to W1-10, all 51 scenario tests passing) and `redactPersonalData()` in `src/engine/redact.ts`, with tests.

W3-07 (Alex) is the implementation task. It is done when tests with fake providers show: a timeout moves to the next provider; invalid JSON moves to the next provider; all providers down → the rules answer; AI never lowers a red; and AI raises by at most one step.

Sources within the repository: [brief D6, D9, D12](../PROJECT_BRIEF.md), [Layer 2 design](../BUILD_PLAN.md#410-layer-2-ai-how-it-plugs-in-week-3), [AI layer choices](../WHY_WE_CHOSE.md#6-ai-layer-planned-week-3).
