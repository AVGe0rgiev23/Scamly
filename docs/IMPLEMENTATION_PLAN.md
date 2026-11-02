# Scamly: implementation plan (living document)

> **This plan is meant to change.** Alex and Roberta can add, remove or change any idea, feature or function at any time. Section 2 explains how, and section 3 explains how the code is built so that changes stay cheap.
>
> - *What* we build and *why*: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) (decision log in section 0)
> - Architecture, database, API, engine design, task list: [`BUILD_PLAN.md`](./BUILD_PLAN.md)
> - Creative ideas and recommendations: [`IDEAS.md`](./IDEAS.md)
> - History of changes to the plan: [`CHANGES.md`](./CHANGES.md)
> - *How* we work, *what's next*, *what's done*: **this file**

Last updated: 2 November 2026.

---

## 1. How we work (every session)

```
 1. Start a Claude Code session  →  say who you are ("I'm Alex" / "I'm Roberta")
 2. Claude sets git author to you and pulls the latest main
 3. Pick the next task from the status board (section 5), or say what you want to change
 4. Claude explains the plan for this task in a few lines → you say OK (or change it)
 5. Claude builds it, in small commits, in YOUR name only
 6. Claude runs the checks: lint + type-check + tests (+ build)
 7. Claude explains what was built and what you must understand for the defense
 8. Claude asks "push?" → you say "push" → it goes to main
 9. Claude updates the status board in this file
```

**Rules that keep two people safe on one `main` branch:**
- **Pull before work, push after work.** Never leave a session with unpushed commits. They'd be lost when the cloud session ends.
- **Each person owns different folders**, so you rarely edit the same file at the same time:
  - Alex: `supabase/`, `src/server/`, `src/app/api/`, `src/middleware.ts`, `.github/`
  - Roberta: `src/engine/`, `src/components/ui/`, `src/i18n/bg.ts`, `public/`
  - Shared, so tell each other before editing: `package.json`, `src/app/` pages, `docs/`
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
2. After you say OK, **updates the documents**: a new line in the brief's decision log (`D13`, `D14`…), the task list in `BUILD_PLAN.md`, the status board below, and one line in `CHANGES.md`.
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

---

## 4. Things only you can do (accounts and keys)

Claude can't create accounts or click in web dashboards. These are all **free**. **Never paste keys or passwords into the chat.** Put them in the right settings page (below), and Claude reads them from environment variables.

| When | What | Who | Where the keys go |
|---|---|---|---|
| Week 1, day 1–2 | **Supabase** account → new project, region **Frankfurt (eu-central-1)** | Alex | Vercel env vars + this cloud environment's settings (environment menu in the session title bar → Edit → secrets/environment variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Week 1 | Generate two random secrets for `PAIRING_PEPPER` and `HASH_PEPPER` (Claude gives you the command) | Alex | Same places |
| Week 1, end | **Vercel** account (Hobby, sign in with GitHub) → import the repo, region **fra1** | Alex | Vercel dashboard |
| Week 1, end | GitHub repo → Settings → Secrets → `HEALTH_URL` for the keep-alive job | Alex | GitHub |
| Week 2 | **Brevo** account → verify one sender email → API key | Roberta | `BREVO_API_KEY`, `EMAIL_FROM` |
| Week 2 | VAPID keys for web push (Claude gives you the command) | Alex | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Week 3 | **Google AI Studio** (Gemini) + **Groq** free API keys | Alex | `GEMINI_API_KEY`, `GROQ_API_KEY` |
| Week 4 | **UptimeRobot** (free) monitor on `/api/health` | Alex | UptimeRobot |

A new cloud session picks up environment changes, so after adding a key, start a new session.

---

## 5. Status board

Statuses: ⬜ to do · 🔄 in progress · ✅ done · ✂️ cut · 🔁 changed (see `CHANGES.md`).
Task details (dependencies, "done when") are in `BUILD_PLAN.md` section 6.

### Week 1 (2–8 Nov): foundations

| ID | Task | Owner | Status |
|---|---|---|---|
| W1-01 | Scaffold (Next.js, TS strict, Tailwind, lint, tests, licence, README) | Alex | ⬜ |
| W1-02 | GitHub Actions CI | Alex | ⬜ |
| W1-03 | ADRs D4–D7 | Alex + Roberta | ⬜ |
| W1-04 | Supabase schema migration | Alex | ⬜ |
| W1-05 | RLS policies + pgTAP tests | Alex | ⬜ |
| W1-06 | Auth for family / moderator / admin | Alex | ⬜ |
| W1-07 | Device pairing | Alex | ⬜ |
| W1-08 | Engine part 1: normalise, transliterate, fuzzy | Roberta | ⬜ |
| W1-09 | Engine part 2: dictionary, scoring, hard rules, verdict | Roberta | ⬜ |
| W1-10 | Engine tests ≥ 25 + `redactPersonalData()` | Roberta | ⬜ |
| W1-11 | Design system basics | Roberta | ⬜ |
| W1-12 | Seed script | Roberta | ⬜ |
| W1-13 | Vercel deploy + health + keep-alive | Alex | ⬜ |
| W1-14 | `docs/learning/week-1.md` | Alex + Roberta | ⬜ |

### Weeks 2–5

| ID range | Theme | Status |
|---|---|---|
| W2-01 … W2-12 | Call check, family alert, push, email, family dashboard | ⬜ |
| W3-01 … W3-11 | Reports, map, moderation, education, admin, AI ✂, escalation ✂ | ⬜ |
| W4-01 … W4-09 | Security, e2e, Lighthouse, usability test, proofreading, **registration** | ⬜ |
| W5-01 … W5-05 | Documentation, leaflet, slides, video, rehearsals | ⬜ |

### Ideas accepted from `IDEAS.md`

| Idea | Week | Owner | Status |
|---|---|---|---|
| *(none yet; tell Claude which ideas you want)* | | | |

---

## 6. Week 1 step by step

**Planning style:** only the *current* week is planned in detail. Next week is planned on its first day, using what we learned. This "rolling" style is why changes are cheap: we never plan far ahead in detail and then throw it away.

Order matters because of dependencies. The scaffold must be on `main` **before** Roberta starts, so both of you build on the same base.

### Session A (Alex): W1-01 scaffold + W1-02 CI, about 3 h

| Step | What Claude does | Commit (in Alex's name) |
|---|---|---|
| 1 | Create the Next.js app (current stable version, pinned): TypeScript, App Router, `src/` folder, Tailwind, ESLint. Node 22 (`.nvmrc`) | `Scaffold Next.js app with TypeScript and Tailwind` |
| 2 | TypeScript extra-strict (`strict`, `noUncheckedIndexedAccess`), Prettier, `.editorconfig`, scripts: `dev, build, lint, typecheck, test, test:coverage, e2e, format, check` | `Configure strict TypeScript, Prettier and npm scripts` |
| 3 | Vitest + coverage, Playwright (Chromium + a cheap Android phone profile), 1 example test each | `Add Vitest and Playwright with example tests` |
| 4 | `LICENSE` (full GPL-3.0 text), `README.md` (setup in ≤ 5 commands), `.env.example`, `THIRD_PARTY_LICENSES.md`, `.gitignore` | `Add GPL-3.0 licence, README and env example` |
| 5 | `src/config/features.ts` (switches), `src/i18n/bg.ts` (first strings), `src/lib/env.ts` (checks env vars at startup with Zod) | `Add feature switches, Bulgarian strings file and env check` |
| 6 | `.github/workflows/ci.yml`: install → lint → typecheck → test with coverage → build, on every push to `main` | `Add CI workflow` |
| ✔ | `npm run check` passes → **"push?"** | |

### Session B (Roberta): W1-08 engine part 1, about 6 h, can run at the same time as C

| Step | What Claude does | Commit (in Roberta's name) |
|---|---|---|
| 1 | `src/engine/types.ts`: input/output types, with Python comparisons in comments | `Add detection engine types` |
| 2 | `normalise.ts`: lower-case, clean punctuation, split into words + tests | `Add text normalisation` |
| 3 | `transliterate.ts`: шльокавица → Cyrillic (`politsiya` → `полиция`) + tests | `Add Latin to Cyrillic transliteration` |
| 4 | `fuzzy.ts`: typo-tolerant matching (Damerau-Levenshtein) + tests | `Add typo-tolerant stem matching` |
| 5 | Short explanation for Roberta: how each function works, in Python terms | (part of the learning note) |
| ✔ | Checks pass → **"push?"** | |

### Session C (Alex): W1-04 database + W1-05 RLS, about 11 h, over 2 sessions

| Step | What Claude does | Commit |
|---|---|---|
| 1 | Supabase CLI setup, local database in Docker | `Set up Supabase CLI and local config` |
| 2 | Migration 1: enums, tables, indexes, 28 districts | `Add database schema migration` |
| 3 | Migration 2: helper functions (`is_admin()`, `has_family_access()`…) | `Add RLS helper functions` |
| 4 | Migration 3: all RLS policies + column privileges | `Add row level security policies` |
| 5 | pgTAP tests: every policy + IDOR tests | `Add RLS tests` |
| 6 | Generated TypeScript types for the database | `Generate database types` |
| 7 | CI: add a job that starts Supabase and runs the RLS tests | `Run RLS tests in CI` |
| ✔ | `supabase test db` green → **"push?"** | |

### Session D (Roberta): W1-09 + W1-10 engine part 2 + tests, about 12 h, over 2 sessions

| Step | What Claude does | Commit |
|---|---|---|
| 1 | `dictionary.ts`: stems and phrases per signal category | `Add scam signal dictionary` |
| 2 | `signals.ts` + `scoring.ts`: text + answers → signals → score | `Add signal detection and scoring` |
| 3 | `hardRules.ts`: HR1–HR6, each with a Bulgarian explanation | `Add hard rules` |
| 4 | `verdict.ts` + `index.ts` (`analyseCall`) | `Add verdict builder and public engine API` |
| 5 | ≥ 25 tests: every script, every hard rule, шльокавица, typos, legitimate calls, edge cases | `Add detection engine test suite` |
| 6 | `redact.ts` (`redactPersonalData`) + tests | `Add personal data redaction` |
| 7 | Coverage report → `docs/evidence/` | `Add engine coverage evidence` |
| ✔ | ≥ 25 engine tests green, coverage ≥ 90 % → **"push?"** | |

### Session E (Alex): W1-06 auth + W1-07 pairing, about 13 h, over 2 sessions

| Step | What Claude does | Commit |
|---|---|---|
| 1 | Supabase clients (browser, server-user, server-admin), middleware session refresh | `Add Supabase clients and session middleware` |
| 2 | `getActor()` / `requireRole()` + tests | `Add role checks for the API layer` |
| 3 | Register / login / logout pages (Bulgarian), route guards per role | `Add family login and role-based routes` |
| 4 | Rate limiter (SQL function + TS wrapper) + tests | `Add database-backed rate limiter` |
| 5 | Pairing code endpoint + redeem endpoint + `/svarzhi` page | `Add device pairing` |
| 6 | Revoke device + integration tests (valid, wrong, expired, reused, 6th try → 429, revoked → 401) | `Add device revocation and pairing tests` |
| ✔ | All tests green → **"push?"** | |

### Session F (Roberta): W1-11 design system + W1-12 seed, about 9 h

| Step | What Claude does | Commit |
|---|---|---|
| 1 | Colour tokens light/dark (contrast checked), font scale | `Add design tokens for light and dark mode` |
| 2 | `Button`, `Card`, `Verdict`, `BigChoice`, `ThemeToggle` + `/dev/ui` preview page | `Add core UI components` |
| 3 | `scripts/seed.ts`: demo accounts for all roles + paired demo device + sample data | `Add seed script with demo accounts` |
| 4 | Demo-accounts table in README | `Document demo accounts` |
| ✔ | **"push?"** | |

### Session G (both, short): W1-03, W1-13, W1-14

- ADRs in `docs/decisions/` (Alex: 0001, 0002, 0005 · Roberta: 0003, 0004)
- Vercel deploy + `/api/health` + keep-alive workflow (after Alex creates the Vercel project)
- `docs/learning/week-1.md`
- **Sunday 8 Nov check-in:** each of you explains the other's code out loud for 5 minutes. Then Claude helps plan Week 2 in detail.

### If Week 1 runs late

1. W1-07 (pairing) and W1-12 (seed) may slip to Monday 9 Nov. Nothing else may.
2. The design-system preview page can be skipped; the components themselves can't.
3. Tell Claude "we're behind". It will propose what to move, never silently cut tests.
