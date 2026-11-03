# Scamly: implementation plan (living document)

> **This plan is meant to change.** Alex and Roberta can add, remove or change any idea, feature or function at any time. Section 2 explains how, and section 3 explains how the code is built so that changes stay cheap.
>
> - *What* we build and *why*: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) (decision log in section 0)
> - Architecture, database, API, engine design, task list: [`BUILD_PLAN.md`](./BUILD_PLAN.md)
> - Creative ideas and recommendations: [`IDEAS.md`](./IDEAS.md)
> - History of changes to the plan: [`CHANGES.md`](./CHANGES.md)
> - What each part does, how and why: [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) (D19)
> - Why we chose each technology over the alternatives: [`WHY_WE_CHOSE.md`](./WHY_WE_CHOSE.md) (D19)
> - Rules every Claude Code session reads first: [`CLAUDE.md`](../CLAUDE.md)
> - *How* we work, *what's next*, *what's done*: **this file**

Last updated: 3 November 2026 (new work split, D17–D19).

---

## 1. How we work (every session)

```
 1. Start a Claude Code session  →  say who you are ("I'm Alex" / "I'm Roberta")
 2. Claude sets git author to you and pulls the latest main
 3. Pick the next task from the status board (section 5), or say what you want to change
 4. Claude explains the plan for this task in a few lines → you say OK (or change it)
 5. Claude builds it, in small commits, in YOUR name only
 6. In the same commits, Claude updates docs/HOW_IT_WORKS.md and docs/WHY_WE_CHOSE.md (D19)
 7. Claude runs the checks: npm run check (+ npm run test:db if supabase/ changed)
 8. Claude updates the status board in this file
 9. Claude explains what was built and what you must understand for the defense
10. Claude asks "push?" → you say "push" → it goes to main
```

**Rules that keep two people safe on one `main` branch:**
- **Pull before work, push after work.** Never leave a session with unpushed commits. They'd be lost when the cloud session ends.
- **Who leads what (D17, D18).** Alex leads the backend, Roberta leads the frontend, but it's mixed. The owner is the person who mainly builds a part and must explain it in the defense. It is **not** a lock: either of you may change anything.
  - **Alex (backend lead):** `supabase/`, `src/server/` (services, repositories, auth, notifications, AI, security), `src/app/api/`, `src/proxy.ts`, the engine logic in `src/engine/` (everything except `dictionary.ts` and the test-case data), seed script, CI, deploy, keep-alive, security hardening, push/email sending (`EmailProvider`), AI layer, escalation, rate limiting, GDPR delete/export API, demo video and USB build.
  - **Roberta (frontend lead):** `src/components/`, all pages in `src/app/` (protected, family, moderator, admin, public, auth), `src/i18n/bg.ts`, design system, accessibility, light/dark, PWA (manifest, install prompt, offline card), voice input, map UI, education and help pages, fridge card, Lighthouse, Bulgarian proofreading, email text, privacy-notice text, leaflet, slide design; plus the engine dictionary (`src/engine/dictionary.ts`) and the engine test cases (D18).
  - **Shared:** e2e tests, ADRs, `docs/`, usability test, the 5-page documentation, slide content, rehearsals, registration.
- **Changing something on the other person's side:** (1) tell them first, with what and why; (2) pull; (3) make the change in your own session, under your own name; (4) they read the commit afterwards and say if something is wrong.
- **Files you'll both touch** (`package.json`, `src/i18n/bg.ts`, `docs/HOW_IT_WORKS.md`, `docs/WHY_WE_CHOSE.md`, this status board): pull right before you edit and push soon after, so you rarely change the same lines at the same time.
- **Never push red.** If checks fail, Claude fixes them first or tells you why it can't.
- **Read each other's commits** on GitHub (click the commit → see the changes). There are no pull requests, so this is our review.
- **Roberta's GitHub email:** Roberta tells Claude at the start of her first session, so commits link to her profile.

---

## 2. How to change the plan (any time)

Just say it in any session, in normal words, for example:
- "Change: drop the AI layer, we don't have time."
- "Add: a Turkish version of the protected-person screen."
- "Remove the map's week filter."
- "Idea: what if grandma could send a voice message to the family?"

Then Claude:
1. **Explains the impact** before touching anything: extra hours, which tasks move, what might need cutting, any risk to security, tests or the deadline.
2. After you say OK, **updates the documents**: a new line in the brief's decision log (`D13`, `D14`…), the task list in `BUILD_PLAN.md`, the status board below, one line in `CHANGES.md`, and `HOW_IT_WORKS.md` / `WHY_WE_CHOSE.md` if something is added, changed or removed (D19).
3. **Changes the code** (usually small, thanks to section 3).

### What is flexible vs. what Claude will warn you about

| Flexible (change freely) | Protected (Claude will push back and explain the risk before changing) |
|---|---|
| Features, screens, questions, wording, colours, layout | **D9**: green never says "safe" |
| Which week something happens | **Hard rules** (D10) can be added freely; removing one needs a test that shows why |
| Who owns a task | **Security baseline**: RLS, server checks, rate limits, no secrets in git |
| Adding or removing optional features (AI, voice, escalation, push, email…) | **Tests**: a feature isn't "done" without tests |
| Names (including the app name) | **Bulgarian UI** and the 29.11 registration deadline |
| The engine's weights and keywords (with updated tests) | **No paid services** without asking (D11) |

These aren't "forbidden". They're the things the jury scores hardest, so Claude makes sure you change them on purpose, not by accident.

---

## 3. How the code is built so that changes stay cheap

| Mechanism | What it means | A change it makes easy |
|---|---|---|
| **Feature switches** (`src/config/features.ts`) | Every optional feature has an on/off switch read from environment variables. The UI and API check it. | "Turn the AI off for the demo": change one variable on Vercel, no code. Cutting per D12 = flipping switches |
| **One file for all Bulgarian text** (`src/i18n/bg.ts`) | Screens never contain text directly | Rewording, proofreading, or adding `tr.ts` for Turkish later |
| **Engine as data + small rules** | Weights in one table, keywords in one dictionary file, each hard rule is one object in a list | "Add a new scam script" = add keywords + 1 hard rule + its tests |
| **Interfaces for outside services** | `EmailProvider`, `ScamClassifier`, `PushSender`: like Python abstract base classes | Swap Brevo ↔ Resend ↔ nothing, or add a new AI provider, without touching business logic |
| **Layers** (UI → API → services → repositories → DB) | Each layer only talks to the one below | Redesign a screen without touching logic; change a query without touching screens |
| **Additive database migrations** | Never edit an old migration; add a new numbered one | Add a column or table at any time without breaking the live database |
| **Tests as a safety net** | Engine, security and main flows are tested | Change boldly: if something breaks, a test goes red before the jury sees it |
| **Seed script** | `npm run seed` rebuilds all demo data | After a big change, the demo accounts are back in 1 minute |
| **Two explanation files** (D19) | `HOW_IT_WORKS.md` and `WHY_WE_CHOSE.md` are updated in the same commit as every change | Writing the 5-page documentation, and answering "why X and not Y?" in the defense, even about a part the other person built |

---

## 4. Things only you can do (accounts and keys)

Claude can't create accounts or click in web dashboards. These are all **free**. **Never paste keys or passwords into the chat.** Put them in the right settings page (below), and Claude reads them from environment variables.

| When | What | Who | Where the keys go |
|---|---|---|---|
| Week 1, day 1–2 | **Supabase** account → new project, region **Frankfurt (eu-central-1)** | Alex | Vercel env vars + this cloud environment's settings (environment menu in the session title bar → Edit → secrets/environment variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Week 1 | Generate two random secrets for `PAIRING_PEPPER` and `HASH_PEPPER` (Claude gives you the command) | Alex | Same places |
| Week 1, end | **Vercel** account (Hobby, sign in with GitHub) → import the repo, region **fra1** | Alex | Vercel dashboard |
| Week 1, end | GitHub repo → Settings → Secrets → `HEALTH_URL` for the keep-alive job | Alex | GitHub |
| Week 2 | **Brevo** account → verify one sender email → API key | Alex | `BREVO_API_KEY`, `EMAIL_FROM` |
| Week 2 | VAPID keys for web push (Claude gives you the command) | Alex | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Week 3 | **Google AI Studio** (Gemini) + **Groq** free API keys | Alex | `GEMINI_API_KEY`, `GROQ_API_KEY` |
| Week 4 | **UptimeRobot** (free) monitor on `/api/health` | Alex | UptimeRobot |

A new cloud session picks up environment changes, so after adding a key, start a new session.

---

## 5. Status board

Statuses: ⬜ to do · 🔄 in progress · ✅ done · ✂️ cut · 🔁 changed (see `CHANGES.md`).
Task details (dependencies, "done when", hours per person) are in `BUILD_PLAN.md` section 6. Owners follow D17/D18 (updated 3 Nov).

### Week 1 (2–8 Nov): foundations

| ID | Task | Owner | Status |
|---|---|---|---|
| W1-01 | Scaffold (Next.js, TS strict, Tailwind, lint, tests, licence, README) | Alex | ✅ |
| W1-02 | GitHub Actions CI | Alex | ✅ |
| W1-03 | ADRs D4–D7 | Alex (0001–0004) + Roberta (0005) | ⬜ |
| W1-04 | Supabase schema migration | Alex | ✅ |
| W1-05 | RLS policies + pgTAP tests | Alex | ✅ |
| W1-06 | Auth for family / moderator / admin | Alex (login/register UI: Roberta) | ⬜ |
| W1-07 | Device pairing | Alex (`/svarzhi` UI: Roberta) | ⬜ |
| W1-08 | Engine part 1: types, normalise, transliterate, fuzzy | Alex | ⬜ |
| W1-09 | Engine part 2: signals, scoring, hard rules, verdict | Alex | ⬜ |
| W1-09b | Engine dictionary (`dictionary.ts`, шльокавица, typos) | Roberta | ⬜ |
| W1-10 | Engine tests ≥ 25 + `redactPersonalData()` | Roberta (test cases) + Alex (runner, redact) | ⬜ |
| W1-11 | Design system basics | Roberta | ⬜ |
| W1-12 | Seed script | Alex | ⬜ |
| W1-13 | Vercel deploy + health + keep-alive | Alex | ⬜ |
| W1-14 | `docs/learning/week-1.md` | Alex + Roberta | ⬜ |

### Weeks 2–5

| ID range | Theme | Status |
|---|---|---|
| W2-01 … W2-12 | Call check, family alert, push, email, family dashboard | ⬜ |
| W3-01 … W3-11 | Reports, map, moderation, education, admin, AI ✂, escalation ✂ | ⬜ |
| W4-01 … W4-09 | Security, e2e, Lighthouse, usability test, proofreading, **registration** | ⬜ |
| W5-01 … W5-05 | Documentation, leaflet, slides, video, rehearsals | ⬜ |

Owners per week (hours from `BUILD_PLAN.md` section 6; shared tasks count half each):
- **Week 2 (A ≈ 27 h, R ≈ 30 h).** Alex: W2-02 checks API, W2-03 alert fan-out + Realtime, W2-04 acknowledge, W2-05 web push, W2-06 `EmailProvider` + Brevo, W2-08 contacts + invites API. Roberta: W2-01 protected UI, W2-07 family dashboard, W2-09 PWA, W2-10 ✂ voice, and the UI parts of W2-03 (live alert page), W2-04 (button), W2-05 (opt-in) plus the W2-06 email wording. Both: W2-11 e2e, W2-12 learning note.
- **Week 3 (A ≈ 25 h, R ≈ 24 h).** Alex: W3-01 reports API, W3-07 ✂ AI, W3-09 ✂ escalation, and the APIs of W3-04 (moderation), W3-05 (scripts) and W3-06 (admin). Roberta: W3-02 report form, W3-03 map, W3-08 help pages, W3-10 ✂ fridge card, W3-05 education pages + script editor, and the UIs of W3-04 and W3-06 (incl. charts). Both: W3-11 learning note.
- **Week 4 (A ≈ 20 h, R ≈ 16 h).** Alex: W4-01 and W4-02 security, W4-07 delete/export API. Roberta: W4-04 Lighthouse, W4-06 proofreading, W4-07 privacy-notice text. Both: W4-03 e2e, W4-05 usability test, W4-08 release, W4-09 registration.
- **Week 5 (A ≈ 11.5 h, R ≈ 12.5 h).** Alex: W5-04 video + USB. Roberta: W5-02 leaflet. Both: W5-01 documentation (Alex 4.4–4.6, Roberta 4.1–4.3 and 4.7), W5-03 slides (design: Roberta), W5-05 rehearsals.

### Ideas accepted from `IDEAS.md`

| Idea | Week | Owner | Status |
|---|---|---|---|
| *(none yet; tell Claude which ideas you want)* | | | |

---

## 6. Week 1 step by step

**Planning style:** only the *current* week is planned in detail. Next week is planned on its first day, using what we learned. This "rolling" style is why changes are cheap: we never plan far ahead in detail and then throw it away.

**Every commit below** also updates `docs/HOW_IT_WORKS.md` and `docs/WHY_WE_CHOSE.md` for what it adds or changes (D19), so those are not listed as separate steps.

### Order for the rest of the week (updated 3 Nov)

| | Alex | Roberta |
|---|---|---|
| Done | ✅ Session A (scaffold + CI), ✅ Session C (database + RLS) | |
| 1 | **Session H step 1 first** (engine types, about 30 min), push it right away so Roberta is not blocked | **Session B**: design system. No dependency, start now |
| 2 | **Session E**: auth + pairing backend | **Session D**: engine dictionary + test cases (needs H step 1 on `main`) |
| 3 | **Session H** steps 2–10: rest of the engine logic | **Session F**: login, register and `/svarzhi` pages (needs Session E's API on `main`) |
| 4 | **Session I**: seed + deploy + keep-alive | Spare time: start W2-01 (protected UI) early |
| End | **Session G** (both): ADRs, learning note, Sunday check-in | **Session G** |

### ✅ Session A (Alex): W1-01 scaffold + W1-02 CI, done 2 Nov

| Step | What Claude does | Commit (in Alex's name) |
|---|---|---|
| 1 | Create the Next.js app (current stable version, pinned): TypeScript, App Router, `src/` folder, Tailwind, ESLint. Node 22 (`.nvmrc`) | `Scaffold Next.js app with TypeScript and Tailwind` |
| 2 | TypeScript extra-strict (`strict`, `noUncheckedIndexedAccess`), Prettier, `.editorconfig`, scripts: `dev, build, lint, typecheck, test, test:coverage, e2e, format, check` | `Configure strict TypeScript, Prettier and npm scripts` |
| 3 | Vitest + coverage, Playwright (Chromium + a cheap Android phone profile), 1 example test each | `Add Vitest and Playwright with example tests` |
| 4 | `LICENSE` (full GPL-3.0 text), `README.md` (setup in ≤ 5 commands), `.env.example`, `THIRD_PARTY_LICENSES.md`, `.gitignore` | `Add GPL-3.0 licence, README and env example` |
| 5 | `src/config/features.ts` (switches), `src/i18n/bg.ts` (first strings), `src/lib/env.ts` (checks env vars at startup with Zod) | `Add feature switches, Bulgarian strings file and env check` |
| 6 | `.github/workflows/ci.yml`: install → lint → typecheck → test with coverage → build, on every push to `main` | `Add CI workflow` |
| ✔ | `npm run check` passes → **"push?"** | |

### ✅ Session C (Alex): W1-04 database + W1-05 RLS, done 2 Nov

| Step | What Claude does | Commit |
|---|---|---|
| 1 | Supabase CLI setup, local database in Docker | `Set up Supabase CLI and local config` |
| 2 | Migration 1: enums, tables, indexes, 28 districts | `Add database schema migration` |
| 3 | Migration 2: helper functions (`is_admin()`, `has_family_access()`…) | `Add RLS helper functions` |
| 4 | Migration 3: all RLS policies + column privileges | `Add row level security policies` |
| 5 | pgTAP tests: every policy + IDOR tests | `Add RLS tests` |
| 6 | Generated TypeScript types for the database (not done yet: moved to Session E step 1) | `Generate database types` |
| 7 | CI: add a job that starts Supabase and runs the RLS tests | `Run RLS tests in CI` |
| ✔ | `supabase test db` green → **"push?"** | |

### Session E (Alex): W1-06 auth + W1-07 pairing backend, about 11 h, over 2 sessions

The pages themselves (login, register, `/svarzhi`) are Roberta's Session F. Alex builds the logic, the API and the tests.

| Step | What Claude does | Commit (in Alex's name) |
|---|---|---|
| 1 | Generated TypeScript types for the database (`src/types/database.ts`), left over from Session C | `Generate database types` |
| 2 | Supabase clients (browser, server-user, server-admin), session refresh in `src/proxy.ts` (Next.js 16 renamed middleware to proxy) | `Add Supabase clients and session middleware` |
| 3 | `getActor()` / `requireRole()` + tests | `Add role checks for the API layer` |
| 4 | Register / login / logout logic (server side), route guards per role in `src/proxy.ts`, a plain 403 page | `Add family auth and role-based route guards` |
| 5 | Rate limiter TS wrapper around the existing `hit_rate_limit` SQL function + tests | `Add rate limiter wrapper` |
| 6 | Pairing code endpoint + redeem endpoint + device session | `Add device pairing API` |
| 7 | Revoke device + integration tests (valid, wrong, expired, reused, 6th try → 429, revoked → 401) | `Add device revocation and pairing tests` |
| ✔ | `npm run check` + `npm run test:db` green → tell Roberta the API is ready → **"push?"** | |

### Session H (Alex): W1-08 + W1-09 + W1-10 engine logic, about 12 h, over 2 sessions

Step 1 comes **before Session E**: it's short and it unblocks Roberta's Session D.

| Step | What Claude does | Commit (in Alex's name) |
|---|---|---|
| 1 | `src/engine/types.ts`: input/output types, signal category ids, the shape of a dictionary entry and of a test scenario (for Roberta), with Python comparisons in comments. **Push right away** | `Add detection engine types` |
| 2 | `normalise.ts`: lower-case, clean punctuation, split into words + tests | `Add text normalisation` |
| 3 | `transliterate.ts`: шльокавица → Cyrillic (`politsiya` → `полиция`) + tests | `Add Latin to Cyrillic transliteration` |
| 4 | `fuzzy.ts`: typo-tolerant matching (Damerau-Levenshtein) + tests | `Add typo-tolerant stem matching` |
| 5 | `signals.ts` + `scoring.ts`: text + answers → signals → score, using Roberta's `dictionary.ts` (pull first; if it isn't there yet, test with a tiny dictionary inside the test file) | `Add signal detection and scoring` |
| 6 | `hardRules.ts`: HR1–HR6, each with a Bulgarian explanation key in `bg.ts` (Roberta checks the wording) | `Add hard rules` |
| 7 | `verdict.ts` + `index.ts` (`analyseCall`) + the worked examples in `BUILD_PLAN.md` 4.7 as tests | `Add verdict builder and public engine API` |
| 8 | Test runner: turns each of Roberta's scenarios into one Vitest test | `Add engine scenario test runner` |
| 9 | `redact.ts` (`redactPersonalData`) + tests | `Add personal data redaction` |
| 10 | Coverage report → `docs/evidence/` | `Add engine coverage evidence` |
| ✔ | ≥ 25 engine tests green, coverage ≥ 90 % → **"push?"** | |

### Session I (Alex): W1-12 seed + W1-13 deploy, about 5 h

| Step | What Claude does | Commit (in Alex's name) |
|---|---|---|
| 1 | `scripts/seed.ts`: demo accounts for all roles + paired demo device + contacts + sample checks/reports | `Add seed script with demo accounts` |
| 2 | Demo-accounts table in README | `Document demo accounts` |
| 3 | `/api/health`: returns `{ok: true, db: true}` after a real database query | `Add health endpoint` |
| 4 | Alex creates the Vercel project (fra1) and adds the env vars (section 4); Claude checks the production URL | (no commit) |
| 5 | `.github/workflows/keep-alive.yml`: calls `/api/health` every 12 h | `Add keep-alive workflow` |
| ✔ | Production URL live, health OK, `npm run seed` works on an empty database → **"push?"** | |

### Session B (Roberta): W1-11 design system, about 6 h, start now

| Step | What Claude does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Colour tokens light/dark (contrast checked, ratios in a comment), font scale | `Add design tokens for light and dark mode` |
| 2 | `Button` and `Card`; short explanation of React props in Python terms | `Add Button and Card components` |
| 3 | `Verdict` (red/yellow/green, D9 wording from `bg.ts`) and `BigChoice` (big yes/no answers) | `Add Verdict and BigChoice components` |
| 4 | `ThemeToggle` (light/dark, remembers the choice) | `Add theme toggle` |
| 5 | `/dev/ui` preview page: every component in light + dark | `Add UI preview page` |
| ✔ | `npm run check` passes → **"push?"** | |

### Session D (Roberta): W1-09b dictionary + W1-10 test cases, about 6 h

Starts after Alex pushes `src/engine/types.ts` (Session H step 1).

| Step | What Claude does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Pull; Claude walks through `types.ts` with Python comparisons | (no commit) |
| 2 | `dictionary.ts`: Bulgarian stems and phrases for every signal category in `BUILD_PLAN.md` 4.5, each with a comment showing an example sentence | `Add scam signal dictionary` |
| 3 | шльокавица spellings (`politsiya`, `pari`, `kurier`…) and common typos for the main stems | `Add Latin-script and typo spellings to the dictionary` |
| 4 | Test cases as plain data in `src/engine/__tests__/scenarios.ts`: every scam script, every hard rule, legitimate calls that must **not** be red (grandchild, bank reminder, doctor, courier), шльокавица, typos, edge cases (empty text, answers only). ≥ 25 in total (brief section 9) | `Add engine test scenarios` |
| 5 | When Alex's runner exists (Session H step 8): run the tests together. A failing case means the case or the logic is wrong, so talk to Alex | (fixes, if any) |
| ✔ | `npm run check` passes → **"push?"** | |

The scenarios file is data, not a test file (`*.test.ts`), so it doesn't run (and can't go red) until Alex's runner uses it.

### Session F (Roberta): W1-06 + W1-07 page UIs, about 2 h

Starts after Session E's API is on `main`. Uses the design system from Session B.

| Step | What Claude does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Login and register pages (Bulgarian, all text in `bg.ts`), error messages, logout button; replaces Alex's plain 403 page with a styled one | `Add login and register pages` |
| 2 | `/svarzhi` page: big 6-digit code input, clear errors (wrong code, expired code, too many tries) | `Add device pairing page` |
| ✔ | Logging in as each demo role works by hand; `npm run check` passes → **"push?"** | |

### Session G (both, short): W1-03, W1-14, Sunday check-in

| Step | What Claude does | Commit |
|---|---|---|
| 1 | ADRs in `docs/decisions/`: 0001 stack, 0002 device pairing, 0003 email provider, 0004 AI chain | `Add ADRs for stack, pairing, email and AI` (Alex) |
| 2 | ADR 0005 alert channels (D7) | `Add ADR for alert channels` (Roberta) |
| 3 | `docs/learning/week-1.md` | `Add Week 1 learning note` (either) |
| 4 | **Sunday 8 Nov check-in:** each of you explains the other's code out loud for 5 minutes. For the engine (D18): Roberta explains the logic, Alex explains the dictionary and the test cases. Then Claude helps plan Week 2 in detail | (no commit) |

### If Week 1 runs late

1. W1-07 (pairing) and W1-12 (seed) may slip to Monday 9 Nov. Nothing else may.
2. **Suggestion (3 Nov, not yet decided):** Alex's share is now much bigger than Roberta's (BUILD_PLAN section 6). If Alex runs late, Session I (seed + deploy) slips first, to Mon–Tue 9–10 Nov, and Roberta uses her spare hours to start W2-01 early. Say "OK" to make this the rule.
3. The design-system preview page can be skipped; the components themselves can't.
4. Tell Claude "we're behind". It will propose what to move, never silently cut tests.
