<!-- Week 1 explanation and practice sheet; human understanding must still be checked. -->
# Week 1 learning note: Python ideas in a TypeScript web app

Updated: 3 November 2026

Status: study and handover material. This note does not record a completed rehearsal or claim that either student has already mastered the topics below. Finish the Week 1 check-in together on Sunday 8 November.

## What exists and what is still planned

The repository has a Next.js app skeleton, Bulgarian text/configuration files, strict TypeScript, Zod environment validation, unit/browser-test setup and CI. The database migrations define tables, helper functions, RLS policies, triggers and the Realtime publication. Shared engine types and constants are present. The reusable light/dark design system and `/dev/ui` preview are implemented.

The engine's normalisation, transliteration, matching, scoring, hard-rule evaluation and runner are still planned. The dictionary and scenario data are separate from that executable logic: writing expected cases does not prove the engine passes them. Authentication, device-pairing services, real call-check screens, seed script and alert delivery must not be described as working until their implementation and checks are complete.

Use [HOW_IT_WORKS](../HOW_IT_WORKS.md) and the [status board](../IMPLEMENTATION_PLAN.md#5-status-board) for current completion evidence rather than treating this learning note as a test report.

## TypeScript: shapes, values and checks

| TypeScript idea | Closest Python comparison | Example in Scamly |
|---|---|---|
| `type CallInput = { ... }` | A `TypedDict` describing expected keys and values | `src/engine/types.ts` |
| `ClaimedIdentity \| null` | `ClaimedIdentity \| None` | An unanswered identity question |
| `field?: T` | An optional `TypedDict` key, which can be absent | `extraKeywords` |
| A string-literal union such as `"yes" \| "no" \| "unsure"` | `Literal["yes", "no", "unsure"]` | `TriAnswer` |
| `string[]` | `list[str]` | Dictionary stems |
| `{ ...EMPTY_INPUT, asksMoney: "yes" }` | `{**EMPTY_INPUT, "asksMoney": "yes"}` | Copy defaults and replace one field |
| `Record<string, string \| undefined>` | `dict[str, str \| None]`, with missing lookups | Environment input |

TypeScript checks our code before it runs; its types are erased from the generated JavaScript. A value arriving over HTTP is not trustworthy just because we wrote a type for it. A `type` is not a validator or a Python class constructor.

`as const` preserves narrow literal types and prevents assignments through that TypeScript type. It does not freeze an object at runtime like `Object.freeze`. For example, the `TRI_ANSWERS` array is a runtime value; `TriAnswer` is the type derived from it. The type tests compare value lists with SQL enums so database values and TypeScript values stay aligned.

`strict` catches missing/null values. With `noUncheckedIndexedAccess`, reading `items[0]` may give `undefined`; check before using it, as with Python's `dict.get()` returning `None`.

## Zod: validation while the program runs

`src/lib/env.ts` uses a Zod schema, similar to a Python Pydantic model. `safeParse()` returns either validated data or validation issues. `getServerEnv()` removes empty entries, validates the input and throws an error naming invalid variables without printing their values.

The function validates **when called**. Importing the file does not validate settings, so a build can run without a configured `.env.local`. It returns secrets and is intended for server code; never import it into a client component or put keys into a screenshot, commit or chat. A TypeScript `ServerEnv` type cannot replace this runtime validation.

Practice: read `src/lib/env.test.ts` and explain why a missing pepper fails, why an empty string counts as missing, and why the test supplies its own environment dictionary instead of changing real secrets.

## React: props describe inputs; state remembers interaction

A React component is a function producing UI. Props are named inputs, like Python keyword arguments. `Button` accepts normal button properties, `Card` displays `children`, and `BigChoice` receives the question, current value and `onChange` callback.

`BigChoice` does not keep a second copy of the answer. Its parent holds the answer with `useState`; the callback requests a state change and React renders again. Think of state as remembered component data, with React scheduling the update. Changing an ordinary local variable alone does not request a new render.

`useRef` holds a reference between renders without requesting a render when it changes. `ThemeToggle` uses one to initialise a native select from browser storage. Its explicit `label`/`htmlFor` association gives the select a short label separate from its option text. The saved theme is a display preference, not authentication.

Pages/layouts are server components by default. Components needing browser storage or event handlers use `"use client"`. That boundary does not mean secrets may be included in client props. `bg.ts` holds visible Bulgarian text so proofreading and later wording changes happen in one place.

Practice: open `/dev/ui`, answer a question using Tab, Space and arrow keys, switch theme, reload, and explain which component owns each value. Explain why a verdict needs words as well as red/yellow/green colour and why green never promises that a call is safe (D9).

## Supabase, SQL and the two locks

Supabase supplies PostgreSQL, authentication and Realtime. Our migrations and database policies are SQL, not browser code. Tables hold the data; foreign keys and constraints enforce relationships and valid values. A migration is a versioned change applied in order. Add a new migration for future changes rather than silently editing one already applied.

RLS means PostgreSQL checks whether the current user may access each row. A user belonging to family A must not read family B's protected people or alerts. `auth.uid()` identifies the session user in the database, and helper functions keep recurring policy rules readable.

The API's validation and role checks are the first lock; RLS is the second. Both are required. A button hidden in the browser is not an access check. The service-role key bypasses RLS and belongs only in the explicitly authorised server operations; it must never reach the browser.

The pgTAP files in `supabase/tests/` test database behaviour with different identities, including forbidden cross-family access. Vitest tests TypeScript; it cannot substitute for database-policy tests. The repository's database test command needs the documented Linux/PostgreSQL/pgTAP environment; Roberta's Windows machine relies on the CI database job for that verification.

Practice: choose a test in `05_checks_alerts.test.sql` and explain whose identity it uses, which row it requests, and why the result must be allowed or refused. Explain why a Realtime publication alone does not make a complete family notification feature.

## Data-driven engine: a contract before an algorithm

`CallInput` is what the engine receives; `Verdict` is what it must return. `DictionaryEntry` describes word stems and ordered phrases. `EngineScenario` pairs an input with an expected result. These are plain data shapes, so Roberta can prepare vocabulary and cases while Alex writes the engine logic.

Stems cover word forms; ordered phrases preserve meaning that single words would lose. Short words require care because matching them too loosely creates false alarms. A legitimate doctor's call containing a hospital word should not automatically count as a relative demanding money.

The planned score counts each signal category once, caps at 100, and maps scores to green/yellow/red. Hard rules are an additional decision: any matching hard rule forces red even if the score alone would be lower. Tests must include legitimate calls and empty inputs as well as scams. A scenario file is not an executable passing test until the runner evaluates it against `analyseCall()`.

Practice: explain an answers-only hard-rule case and a legitimate courier case. Identify which fact comes from an answer and which comes from the text. Explain why a keyword list cannot guarantee that every new scam is detected.

## What each check proves

| Check | Evidence it gives | What it does not prove |
|---|---|---|
| `npm run check` | Lint, generated route types/TypeScript, formatting and executable unit tests pass | Browser behaviour, database policies or delivery to a real phone |
| `npm run build` | The app compiles and production pages can be generated | Every interactive path works |
| `npm run e2e` | Tested interactions work against the production app on the configured desktop/phone profiles | All physical phones or all assistive technologies work |
| `npm run test:db` / CI database job | Tested SQL constraints and access policies behave as expected | Unwritten server checks or complete app flows exist |

First-time browser setup is `npx playwright install chromium`. In Codex on Windows, build/browser commands may need approved execution outside the sandbox because Turbopack workers connect over local TCP. A worker exiting before connection can be an execution restriction rather than invalid CSS; document the evidence before changing the framework configuration.

## Week 1 check-in still to do

On Sunday 8 November, each person should explain the other's code aloud for five minutes. Roberta explains the engine logic once it exists; Alex explains the dictionary and scenario data. Both explain why the API and RLS are separate locks. Run the relevant checks after the remaining Week 1 work and use real results for the status board.

For each explanation, ask: what goes in, what comes out, what can fail, how do we know, and why did we choose this approach? Record misunderstandings to revisit; do not tick a learning task complete just because this document exists.
