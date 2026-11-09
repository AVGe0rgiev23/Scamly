# Scamly: implementation plan (living document)

> **This plan is meant to change.** Alex and Roberta can add, remove or change any idea, feature or function at any time. Section 2 explains how, and section 3 explains how the code is built so that changes stay cheap.
>
> - *What* we build and *why*: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) (decision log in section 0)
> - Architecture, database, API, engine design, task list: [`BUILD_PLAN.md`](./BUILD_PLAN.md)
> - Creative ideas and recommendations: [`IDEAS.md`](./IDEAS.md)
> - History of changes to the plan: [`CHANGES.md`](./CHANGES.md)
> - What each part does, how and why: [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) (D19)
> - Why we chose each technology over the alternatives: [`WHY_WE_CHOSE.md`](./WHY_WE_CHOSE.md) (D19)
> - Rules every AI agent session reads first (Claude Code and Codex): [`AGENTS.md`](../AGENTS.md) (D21); `CLAUDE.md` only points to it
> - *How* we work, *what's next*, *what's done*: **this file**

Last updated: 4 November 2026 (mixed split for all remaining work and commit style, D23; earlier: work split D17–D19, Week 1 rebalance D20, Codex for Roberta D21).

---

## 1. How we work (every session)

```
 1. Start a session: Alex in Claude Code (cloud), Roberta in Codex (her computer)
    →  say who you are ("I'm Alex" / "I'm Roberta")
 2. The agent checks the git author (D21) and pulls the latest main (git pull origin main)
      Alex: it sets the author to Alex Georgiev
      Roberta: it only checks that her own git config says "Roberta Hristova"
 3. Pick the next task from the status board (section 5), or say what you want to change
 4. The agent explains the plan for this task in a few lines → you say OK (or change it)
 5. The agent builds it, in YOUR name only (no AI attribution lines):
      Roberta: one commit per step · Alex: one commit per task (D23)
 6. In the same commits, the agent updates docs/HOW_IT_WORKS.md and docs/WHY_WE_CHOSE.md (D19)
 7. The agent runs the checks: npm run check (+ npm run test:db if supabase/ changed)
 8. The agent updates the status board in this file
 9. The agent explains what was built and what you must understand for the defense
10. The agent asks "push?" → you say "push" → it goes to main
```

"The agent" = Claude Code or Codex. Both follow the same rules in [`AGENTS.md`](../AGENTS.md) (D21).

**Rules that keep two people safe on one `main` branch:**
- **Pull before work, push after work.** Two people on two machines share `main`. Never leave a session with unpushed commits: in Alex's cloud session they'd be lost when the session ends, and on Roberta's computer the other person can't see them, which leads to conflicts later. If a pull has conflicts, the agent stops and explains them to you before doing anything.
- **Who builds what (D23, 4 Nov; before that D17, D18, D20).** Both of us work on backend **and** frontend. Done tasks keep their owners. For the remaining tasks (Weeks 2–5): **Alex ≈ 63 % of the backend and ≈ 39 % of the frontend; Roberta ≈ 37 % of the backend and ≈ 61 % of the frontend; shared tasks half/half.** Remaining hours: Alex ≈ 71 h, Roberta ≈ 76 h. The owner is the person who mainly builds a part and must explain it in the defense. It is **not** a lock: either of you may change anything.
  - **Alex, backend:** W2-05 web push and W2-06 e-mail (backend done; real-phone and real Brevo tests left), W3-01 reports API, W3-06 admin API, W3-07 ✂ AI layer, W4-01 security hardening, W5-04 demo video + USB build. Already done: CI, database + RLS, auth, pairing, engine logic, checks/alerts/contacts/invites APIs.
  - **Alex, frontend:** W2-07 family dashboard, the UIs of W2-03 (live alert page), W2-04 („Обаждам ѝ се сега“ button) and W2-05 (opt-in + iOS hint), W2-10 ✂ voice input, W3-02 report form, W3-04 moderation UI, W3-06 admin dashboard + charts, W4-04 Lighthouse.
  - **Roberta, backend:** W3-04 moderation API, W3-05 scam-script library API, W3-09 ✂ escalation, W4-02 security tests (one per attack), W4-07 account deletion/export API. Already done: seed script, engine dictionary and test cases.
  - **Roberta, frontend:** W2-13 site layout + home page, W2-01 call-check screen, W2-14 `/pokana` invite page, W2-06 e-mail wording, W2-09 PWA (incl. push icons and the offline card in `public/sw.js`), W3-03 map, W3-05 education pages + script editor, W3-08 help pages, W3-10 ✂ fridge card, W4-06 proofreading (incl. the `bg.ts` sections marked "draft — Roberta to proofread"), W4-07 privacy-notice text, W5-02 leaflet. Already done: design system, login/register/`/svarzhi` pages.
  - **Shared (half each):** W2-11 e2e (Alex leads), W2-12 and W3-11 learning notes, W4-03 e2e per role (each tests their own pages), W4-05 usability test, W4-08 release, W4-09 registration, W5-01 documentation (each writes about their own parts), W5-03 slides, W5-05 rehearsals.
- **Commit style (D23): honest, equal history.** Roberta makes one commit per step; Alex makes one commit per task. Every commit is real work by its author. Expected end: about 65–70 commits each. Each of you must explain your own backend and frontend parts in the defense.
- **Changing something on the other person's side:** (1) tell them first, with what and why; (2) pull; (3) make the change in your own session, under your own name; (4) they read the commit afterwards and say if something is wrong.
- **Files you'll both touch** (`package.json`, `src/i18n/bg.ts`, `docs/HOW_IT_WORKS.md`, `docs/WHY_WE_CHOSE.md`, this status board): pull right before you edit and push soon after, so you rarely change the same lines at the same time.
- **Never push red.** If checks fail, the agent fixes them first or tells you why it can't.
- **Read each other's commits** on GitHub (click the commit → see the changes). There are no pull requests, so this is our review.
- **Git author (D21):** Alex's cloud sessions set the author to Alex Georgiev. On Roberta's computer, Codex uses her own local git config (her name and the email of her GitHub account), so nothing needs to be asked; the agent only checks that `git config user.name` is `Roberta Hristova` before the first commit.

---

## 2. How to change the plan (any time)

Just say it in any session, in normal words, for example:
- "Change: drop the AI layer, we don't have time."
- "Add: a Turkish version of the protected-person screen."
- "Remove the map's week filter."
- "Idea: what if grandma could send a voice message to the family?"

Then the agent:
1. **Explains the impact** before touching anything: extra hours, which tasks move, what might need cutting, any risk to security, tests or the deadline.
2. After you say OK, **updates the documents**: a new line in the brief's decision log (`D13`, `D14`…), the task list in `BUILD_PLAN.md`, the status board below, one line in `CHANGES.md`, and `HOW_IT_WORKS.md` / `WHY_WE_CHOSE.md` if something is added, changed or removed (D19).
3. **Changes the code** (usually small, thanks to section 3).

### What is flexible vs. what the agent will warn you about

| Flexible (change freely) | Protected (the agent will push back and explain the risk before changing) |
|---|---|
| Features, screens, questions, wording, colours, layout | **D9**: green never says "safe" |
| Which week something happens | **Hard rules** (D10) can be added freely; removing one needs a test that shows why |
| Who owns a task | **Security baseline**: RLS, server checks, rate limits, no secrets in git |
| Adding or removing optional features (AI, voice, escalation, push, email…) | **Tests**: a feature isn't "done" without tests |
| Names (including the app name) | **Bulgarian UI** and the 29.11 registration deadline |
| The engine's weights and keywords (with updated tests) | **No paid services** without asking (D11) |

These aren't "forbidden". They're the things the jury scores hardest, so the agent makes sure you change them on purpose, not by accident.

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

The AI agent can't create accounts or click in web dashboards. These are all **free**. **Never paste keys or passwords into the chat.** Put them in the right settings page (below), and the agent reads them from environment variables.

| When | What | Who | Where the keys go |
|---|---|---|---|
| Week 1, day 1–2 ✅ done 3 Nov (tables created via SQL Editor, see HOW_IT_WORKS "The live database") | **Supabase** account → new project, region **Frankfurt (eu-central-1)** | Alex | Vercel env vars + this cloud environment's settings (environment menu in the session title bar → Edit → secrets/environment variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Week 1 | Generate two random secrets for `PAIRING_PEPPER` and `HASH_PEPPER` (the agent gives you the command) | Alex | Same places |
| Week 1, before Roberta's next session | **Roberta's computer (D21):** install Node.js 22 and git, set up Codex, clone the repo, run `npm ci`. Create her own `.env.local` by copying `.env.example`; Alex sends her the keys through a private channel (never in git, never in a chat with an AI) | Roberta (keys from Alex) | `.env.local` on her computer (git ignores every `.env*` file except `.env.example`) |
| Mon 9 Nov (D20) | **Vercel** account (Hobby, sign in with GitHub) → import the repo, region **fra1** | Alex | Vercel dashboard |
| Mon 9 Nov (D20) | GitHub repo → Settings → Secrets → `HEALTH_URL` for the keep-alive job | Alex | GitHub |
| Week 2 | **Brevo** account → verify one sender email → API key | Alex | `BREVO_API_KEY`, `EMAIL_FROM` |
| Week 2 | VAPID keys for web push (the agent gives you the command) | Alex | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Week 3 | **Google AI Studio** (Gemini) + **Groq** free API keys | Alex | `GEMINI_API_KEY`, `GROQ_API_KEY` |
| Week 4 | **UptimeRobot** (free) monitor on `/api/health` | Alex | UptimeRobot |

A new cloud session picks up environment changes, so after adding a key, start a new session (Alex). On Roberta's computer, restart `npm run dev` after changing `.env.local`.

**Database tests on Roberta's computer:** `npm run test:db` only works on Linux with PostgreSQL 16 + pgTAP installed. On Windows or Mac, Roberta relies on CI's *database* job for the database tests (look at it right after pushing a change in `supabase/`).

---

## 5. Status board

Statuses: ⬜ to do · 🔄 in progress · ✅ done · ✂️ cut · 🔁 changed (see `CHANGES.md`).
Task details (dependencies, "done when", hours per person) are in `BUILD_PLAN.md` section 6. Owners follow D23 for all remaining work (updated 4 Nov); done tasks keep their D17/D18/D20 owners.

### Week 1 (2–8 Nov): foundations

| ID | Task | Owner | Status |
|---|---|---|---|
| W1-01 | Scaffold (Next.js, TS strict, Tailwind, lint, tests, licence, README) | Alex | ✅ |
| W1-02 | GitHub Actions CI | Alex | ✅ |
| W1-03 | ADRs D4–D7 | Alex (0001–0004) + Roberta (0005) | ✅ |
| W1-04 | Supabase schema migration | Alex | ✅ |
| W1-05 | RLS policies + pgTAP tests | Alex | ✅ |
| W1-06 | Auth for family / moderator / admin | Alex (login/register UI: Roberta) | ✅ backend + designed UI; live demo logins verified on Vercel 4 Nov |
| W1-07 | Device pairing | Alex (`/svarzhi` UI: Roberta) | ✅ backend + designed UI; live demo logins verified on Vercel 4 Nov |
| W1-08 | Engine part 1: types, normalise, transliterate, fuzzy | Alex | ✅ |
| W1-09 | Engine part 2: signals, scoring, hard rules, verdict | Alex | ✅ `analyseCall()`; all 4.7 worked examples pass |
| W1-09b | Engine dictionary (`dictionary.ts`, шльокавица, typos) | Roberta | ✅ data prepared; matcher integration pending |
| W1-10 | Engine tests ≥ 25 + `redactPersonalData()` | Roberta (test cases) + Alex (runner, redact) | ✅ 170 engine tests (51/51 scenarios), `redactPersonalData()`, coverage 100 % lines (`docs/evidence/engine-coverage-2026-11-04.md`); Roberta: run the scenarios together (Session D step 5) |
| W1-11 | Design system basics | Roberta | ✅ checks, production build and six browser runs pass |
| W1-12 | Seed script | Roberta (D20) | ✅ applied to the live project 4 Nov; all four demo logins verified; batch-insert `hard_rules` fix |
| W1-13 | Vercel deploy + health + keep-alive | Alex, Mon 9 Nov (D20) | ✅ live at https://scamly-ag777.vercel.app (health OK, 4 demo logins OK, 4 Nov) · ⬜ GitHub secret `HEALTH_URL` + Supabase Site URL (Alex) |
| W1-14 | `docs/learning/week-1.md` | Alex + Roberta | 🔄 note written; human check-in and remaining Week 1 review pending |

### Week 2 (9–15 Nov): call check + family alert

| ID | Task | Owner | Status |
|---|---|---|---|
| W2-01 | Protected UI: big button, wizard, result, `tel:` button (incl. offline fallback) | Roberta | ⬜ |
| W2-02 | Checks API + service (engine on the server) | Alex | ✅ backend · offline fallback is part of W2-01 (Roberta) |
| W2-03 | Alert fan-out + Realtime (+ 5 s polling fallback) | Alex (backend + live alert page UI) | ✅ (Alex) · `/family/alerts` live page, header link „Сигнали“, `?check=` focus, sound only after a tap · Realtime fix: 10 s safety poll while connected · live 5/5, alert visible after 2.3–3.9 s |
| W2-04 | Acknowledge „Обаждам ѝ се сега“ | Alex (backend + button UI) | ✅ (Alex) · button on each alert; phone shows the name 0.8–1.3 s after the tap (live) · two-browser e2e in W2-11 |
| W2-05 | Web push | Alex (backend + opt-in UI + iOS hint) | ✅ backend (`src/lib/push.ts` ready) · smoke test 22/22 · ✅ opt-in UI + iOS hint (Alex, `PushOptIn` on `/family`; logout unsubscribes) · ⬜ real-phone test (Alex; iPhone only after "Add to Home Screen") · push icons: W2-09 (Roberta) |
| W2-06 | `EmailProvider` + Brevo | Alex (wording: Roberta) | ✅ backend, tested with fakes · ✅ wording proofread by Roberta (6 Nov: `bg.alertEmail` and `bg.push`) · ⬜ real Brevo e-mail: Alex (no account yet) |
| W2-07 | Family dashboard UI | Roberta (took it over from Alex on 5 Nov) | ✅ 5 Nov: people list, create person, contact order + invite, pairing + QR, devices + revoke, check history, e2e |
| W2-08 | Contacts + invite API | Alex | ✅ backend · migration applied 4 Nov; live smoke test 44/44 · contacts UI in W2-07 (Alex), `/pokana` page is W2-14 (Roberta) |
| W2-09 | PWA (+ push icons, offline card in `public/sw.js`) | Roberta | ✅ manifest + own icons, „Инсталирай Scamly“ card (Android + iPhone steps), offline card on failed page loads; `pwa.spec.ts` 7 × 2 · ⬜ real install + push on a phone (iPhone: needs this manifest) |
| W2-10 | ✂ Voice input | Alex (D23) | ✅ „Говорете“ (Web Speech API, `bg-BG`), only when supported and `FEATURE_VOICE` on · real Bulgarian recognition on a phone not yet tested |
| W2-11 | E2E: button → alert → acknowledge → message | Alex (leads) + Roberta | ⬜ |
| W2-12 | `docs/learning/week-2.md` | Alex + Roberta | ⬜ |
| W2-13 | Site layout + home page (D22) | Roberta | ✅ 5 Nov: header + logo + nav, compact theme switch, footer, home page with the 3 steps, e2e |
| W2-14 | `/pokana` invite page (D23) | Roberta | ✅ 6 Nov · token sent at once, removed from the address, `no-referrer`; safe `next` after login; `invite.spec.ts` · live redeem with two real accounts pending |

### Weeks 3–5

| ID range | Theme | Status |
|---|---|---|
| W3-01 … W3-11 | Reports, map, moderation, education, admin, AI ✂, escalation ✂ | ⬜ |
| W3-01 | Reports API (`POST /api/reports`, `GET /api/map/stats` + wave flags) | ✅ (Alex, 9 Nov) · 29 unit tests; live smoke test (honeypot, 429, 403, redaction, hashed number) |
| W3-05 | Scam-script library: `/api/scripts` API, 4 starter cards (migration `20261109000001`), education pages `/kak-raboti`, moderator editor `/moderator/scripts`, moderator keywords fed to the engine | ✅ code (Roberta, 9 Nov) · unit, pgTAP and browser tests pass · ⬜ migration to run in the Supabase SQL Editor before the push |
| W4-01 … W4-09 | Security, e2e, Lighthouse, usability test, proofreading, **registration** | ⬜ |
| W5-01 … W5-05 | Documentation, leaflet, slides, video, rehearsals | ⬜ |

Owners per week after D23 (remaining hours from `BUILD_PLAN.md` section 6; shared tasks count half each):
- **Week 2 (A ≈ 18 h, R ≈ 20 h; Alex also has W1-13 deploy, 2 h, on Mon 9 Nov, D20).** Alex: W2-07 family dashboard, the UIs of W2-03 (live alert page), W2-04 (button) and W2-05 (opt-in + iOS hint), W2-10 ✂ voice, the W2-05 real-phone test and the W2-06 real Brevo test. Roberta: **W2-13 site layout + home page first (D22)**, W2-01 call-check screen, W2-14 `/pokana`, W2-09 PWA, W2-06 e-mail wording. Both: W2-11 e2e (Alex leads), W2-12 learning note.
- **Week 3 (A ≈ 23 h, R ≈ 26 h).** Alex: W3-01 reports API, W3-02 report form, W3-04 moderation UI, W3-06 admin API + UI + charts, W3-07 ✂ AI. Roberta: W3-03 map, W3-04 moderation API, W3-05 script API + education pages + editor, W3-08 help pages, W3-09 ✂ escalation, W3-10 ✂ fridge card. Both: W3-11 learning note.
- **Week 4 (A ≈ 18 h, R ≈ 18 h).** Alex: W4-01 security hardening, W4-04 Lighthouse. Roberta: W4-02 security tests, W4-06 proofreading, W4-07 delete/export API + privacy notice. Both: W4-03 e2e (own pages), W4-05 usability test, W4-08 release, W4-09 registration.
- **Week 5 (A ≈ 12 h, R ≈ 12 h).** Alex: W5-04 video + USB. Roberta: W5-02 leaflet. Both: W5-01 documentation (own parts), W5-03 slides, W5-05 rehearsals.
- **Remaining total: Alex ≈ 71 h, Roberta ≈ 76 h.**

### Ideas accepted from `IDEAS.md`

| Idea | Week | Owner | Status |
|---|---|---|---|
| *(none yet; tell the agent which ideas you want)* | | | |

---

## 6. Week 1 step by step

**Planning style:** only the *current* week is planned in detail. Next week is planned on its first day, using what we learned. This "rolling" style is why changes are cheap: we never plan far ahead in detail and then throw it away.

**Every commit below** also updates `docs/HOW_IT_WORKS.md` and `docs/WHY_WE_CHOSE.md` for what it adds or changes (D19), so those are not listed as separate steps.

### Order for the rest of the week (updated 3 Nov, D20)

Week 1 hours left after D20: **Alex ≈ 28.5 h** (26.5 h until Sun 8 Nov + 2 h deploy on Mon 9 Nov), **Roberta ≈ 18.5 h**.

| | Alex | Roberta |
|---|---|---|
| Done | ✅ Session A (scaffold + CI), ✅ Session C (database + RLS), ✅ Session H step 1 (engine types), ✅ Session E (auth + pairing backend), ✅ Session H steps 2–10 (engine logic) | |
| 1 | **Session H step 1 first** (engine types, about 30 min), push it right away so Roberta is not blocked | **Session B**: design system. No dependency, start now |
| 2 | **Session E**: auth + pairing backend | **Session D**: engine dictionary + test cases (needs H step 1 on `main`) |
| 3 | **Session H** steps 2–10: rest of the engine logic | **Session F**: login, register and `/svarzhi` pages (needs Session E's API on `main`) |
| 4 | Buffer: finish whatever ran late in E or H | **Session J**: seed script (needs Session E's pairing API on `main`) |
| 5 | | Spare time: start W2-01 (protected UI) early |
| End | **Session G** (both): ADRs, learning note, Sunday check-in | **Session G** |
| Mon 9 Nov | **Session I**: deploy + keep-alive | |

### ✅ Session A (Alex): W1-01 scaffold + W1-02 CI, done 2 Nov

| Step | What the agent does | Commit (in Alex's name) |
|---|---|---|
| 1 | Create the Next.js app (current stable version, pinned): TypeScript, App Router, `src/` folder, Tailwind, ESLint. Node 22 (`.nvmrc`) | `Scaffold Next.js app with TypeScript and Tailwind` |
| 2 | TypeScript extra-strict (`strict`, `noUncheckedIndexedAccess`), Prettier, `.editorconfig`, scripts: `dev, build, lint, typecheck, test, test:coverage, e2e, format, check` | `Configure strict TypeScript, Prettier and npm scripts` |
| 3 | Vitest + coverage, Playwright (Chromium + a cheap Android phone profile), 1 example test each | `Add Vitest and Playwright with example tests` |
| 4 | `LICENSE` (full GPL-3.0 text), `README.md` (setup in ≤ 5 commands), `.env.example`, `THIRD_PARTY_LICENSES.md`, `.gitignore` | `Add GPL-3.0 licence, README and env example` |
| 5 | `src/config/features.ts` (switches), `src/i18n/bg.ts` (first strings), `src/lib/env.ts` (checks env vars at startup with Zod) | `Add feature switches, Bulgarian strings file and env check` |
| 6 | `.github/workflows/ci.yml`: install → lint → typecheck → test with coverage → build, on every push to `main` | `Add CI workflow` |
| ✔ | `npm run check` passes → **"push?"** | |

### ✅ Session C (Alex): W1-04 database + W1-05 RLS, done 2 Nov

| Step | What the agent does | Commit |
|---|---|---|
| 1 | Supabase CLI setup, local database in Docker | `Set up Supabase CLI and local config` |
| 2 | Migration 1: enums, tables, indexes, 28 districts | `Add database schema migration` |
| 3 | Migration 2: helper functions (`is_admin()`, `has_family_access()`…) | `Add RLS helper functions` |
| 4 | Migration 3: all RLS policies + column privileges | `Add row level security policies` |
| 5 | pgTAP tests: every policy + IDOR tests | `Add RLS tests` |
| 6 | Generated TypeScript types for the database (not done yet: moved to Session E step 1) | `Generate database types` |
| 7 | CI: add a job that starts Supabase and runs the RLS tests | `Run RLS tests in CI` |
| ✔ | `supabase test db` green → **"push?"** | |

### ✅ Session E (Alex): W1-06 auth + W1-07 pairing backend, done 3 Nov

The pages themselves (login, register, `/svarzhi`) are Roberta's Session F. Alex builds the logic, the API and the tests. Temporary plain pages (`/vhod`, `/registratsia`, `/svarzhi`, `/403`, area layouts in `src/app/_auth-placeholders/`) exist so the API can be tried in a browser; Session F replaces them. No new migration, so `npm run test:db` is not needed. What was built: `docs/HOW_IT_WORKS.md` sections 3.8–3.17; differences from this table: section 8 there.

| Step | What the agent does | Commit (in Alex's name) |
|---|---|---|
| 1 | Generated TypeScript types for the database (`src/types/database.ts`), left over from Session C | `Generate database types` |
| 2 | Supabase clients (browser, server-user, server-admin), session refresh in `src/proxy.ts` (Next.js 16 renamed middleware to proxy) | `Add Supabase clients and session middleware` |
| 3 | `getActor()` / `requireRole()` + tests | `Add role checks for the API layer` |
| 4 | Register / login / logout logic (server side), route guards per role in `src/proxy.ts`, a plain 403 page | `Add family auth and role-based route guards` |
| 5 | Rate limiter TS wrapper around the existing `hit_rate_limit` SQL function + tests | `Add rate limiter wrapper` |
| 6 | Pairing code endpoint + redeem endpoint + device session | `Add device pairing API` |
| 7 | Revoke device + integration tests (valid, wrong, expired, reused, 6th try → 429, revoked → 401) | `Add device revocation and pairing tests` |
| ✔ | `npm run check` + `npm run test:db` green → tell Roberta the API is ready → **"push?"** | |

### ✅ Session H (Alex): W1-08 + W1-09 + W1-10 engine logic, done 4 Nov

Step 1 comes **before Session E**: it's short and it unblocks Roberta's Session D. Steps 2–10 done 4 Nov: all 51 of Roberta's scenarios pass, 170 engine tests, 100 % line coverage. What was built: `docs/HOW_IT_WORKS.md` section 3.21; differences from BUILD_PLAN 4: section 8 there (#18–#21).

| Step | What the agent does | Commit (in Alex's name) |
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

### Session I (Alex): W1-13 deploy + keep-alive, Mon 9 Nov, about 2 h

Moved to Monday 9 Nov by D20. The seed script (W1-12) is now Roberta's Session J.

| Step | What the agent does | Commit (in Alex's name) |
|---|---|---|
| 1 | `/api/health`: returns `{ok: true, db: true}` after a real database query | `Add health endpoint` |
| 2 | Alex creates the Vercel project (fra1) and adds the env vars (section 4); the agent checks the production URL | (no commit) |
| 3 | `.github/workflows/keep-alive.yml`: calls `/api/health` every 12 h | `Add keep-alive workflow` |
| ✔ | Production URL live, health OK, keep-alive run visible in Actions → **"push?"** | |

### Session B (Roberta): W1-11 design system, about 6 h, start now

| Step | What the agent does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Colour tokens light/dark (contrast checked, ratios in a comment), font scale | `Add design tokens for light and dark mode` |
| 2 | `Button` and `Card`; short explanation of React props in Python terms | `Add Button and Card components` |
| 3 | `Verdict` (red/yellow/green, D9 wording from `bg.ts`) and `BigChoice` (big yes/no answers) | `Add Verdict and BigChoice components` |
| 4 | `ThemeToggle` (light/dark, remembers the choice) | `Add theme toggle` |
| 5 | `/dev/ui` preview page: every component in light + dark | `Add UI preview page` |
| ✔ | `npm run check` passes → **"push?"** | |

### Session D (Roberta): W1-09b dictionary + W1-10 test cases, about 6 h

Starts after Alex pushes `src/engine/types.ts` (Session H step 1).

| Step | What the agent does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Pull; the agent walks through `types.ts` with Python comparisons | (no commit) |
| 2 | `dictionary.ts`: Bulgarian stems and phrases for every signal category in `BUILD_PLAN.md` 4.5, each with a comment showing an example sentence | `Add scam signal dictionary` |
| 3 | шльокавица spellings (`politsiya`, `pari`, `kurier`…) and common typos for the main stems | `Add Latin-script and typo spellings to the dictionary` |
| 4 | Test cases as plain data in `src/engine/__tests__/scenarios.ts`: every scam script, every hard rule, legitimate calls that must **not** be red (grandchild, bank reminder, doctor, courier), шльокавица, typos, edge cases (empty text, answers only). ≥ 25 in total (brief section 9) | `Add engine test scenarios` |
| 5 | When Alex's runner exists (Session H step 8): run the tests together. A failing case means the case or the logic is wrong, so talk to Alex | (fixes, if any) |
| ✔ | `npm run check` passes → **"push?"** | |

The scenarios file is data, not a test file (`*.test.ts`), so it doesn't run (and can't go red) until Alex's runner uses it.

### Session F (Roberta): W1-06 + W1-07 page UIs, about 2 h

Starts after Session E's API is on `main`. Uses the design system from Session B.

| Step | What the agent does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Login and register pages (Bulgarian, all text in `bg.ts`), error messages, logout button; replaces Alex's plain 403 page with a styled one | `Add login and register pages` |
| 2 | `/svarzhi` page: big 6-digit code input, clear errors (wrong code, expired code, too many tries) | `Add device pairing page` |
| ✔ | Logging in as each demo role works by hand; `npm run check` passes → **"push?"** | |

### Session J (Roberta): W1-12 seed script, about 3 h (D20)

Starts after Session E's pairing API (W1-07) is on `main`, because the seed creates a demo device that is already paired. Needs Roberta's `.env.local` (section 4). Ask Alex which empty database to run it on.

| Step | What the agent does | Commit (in Roberta's name) |
|---|---|---|
| 1 | Pull; the agent explains how pairing creates a device user (`BUILD_PLAN.md` section 5) and why the seed uses the service-role key (it runs only on a computer, never in the browser) | (no commit) |
| 2 | `scripts/seed.ts` + `npm run seed`: demo accounts for all roles (family, moderator, admin, already confirmed), a protected person with an already-paired demo device (using Alex's pairing service, not a copy of it), contacts, sample checks and reports | `Add seed script with demo accounts` |
| 3 | Demo-accounts table in README | `Document demo accounts` |
| ✔ | `npm run seed` on an empty database → every login in the README table works; `npm run check` passes → **"push?"** | |

### Session G (both, short): W1-03, W1-14, Sunday check-in

| Step | What the agent does | Commit |
|---|---|---|
| 1 | ADRs in `docs/decisions/`: 0001 stack, 0002 device pairing, 0003 email provider, 0004 AI chain | `Add ADRs for stack, pairing, email and AI` (Alex) |
| 2 | ADR 0005 alert channels (D7) | `Add ADR for alert channels` (Roberta) |
| 3 | `docs/learning/week-1.md` | `Add Week 1 learning note` (either) |
| 4 | **Sunday 8 Nov check-in:** each of you explains the other's code out loud for 5 minutes. For the engine (D18): Roberta explains the logic, Alex explains the dictionary and the test cases. Then the agent helps plan Week 2 in detail | (no commit) |

### If Week 1 runs late

1. **Decided (D20, 3 Nov):** to balance Week 1, the seed script (W1-12) moved to Roberta (Session J) and the deploy (W1-13) is planned for Monday 9 Nov (Session I).
2. If more runs late: W1-07 (pairing) may slip to Monday 9 Nov and no further, because W2-02 needs it. W1-12 (seed) then moves with it, because the seed needs pairing. Nothing else may slip.
3. The design-system preview page can be skipped; the components themselves can't.
4. Tell the agent "we're behind". It will propose what to move, never silently cut tests.

## 7. Week 2 step by step (saved 5 Nov)

Both work **in parallel on separate files**; every phase ends with a **checkpoint**: all tests, commits under the name of the person who directed each task (Roberta one commit per step, Alex one per task, D23), push. Roberta builds the **frame** first, because every other screen sits inside it.

**Shared session rule:** when Roberta works in Alex's Claude Code session, she says „I'm Roberta“ first; when Alex takes over, „I'm Alex“. The agent commits each piece under the name of the person who directed it and asks when it's unclear.

### Phase 0: preparation (Alex, 10 min)

| Who | What |
|---|---|
| Alex | GitHub secret `HEALTH_URL` · Supabase Site URL · Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` · Brevo if there is time |
| Alex | Week 1 marked ✅ on the status board |

### Phase 1: frame + family dashboard (parallel)

| Who | Task | Files (no overlap) |
|---|---|---|
| Roberta | **W2-13** site layout + home page (header with logo, small theme switch, menu, footer, real home page) | `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/layout/` |
| Alex | **W2-07 part 1**: people list, create person, person page with ordered contacts | `src/app/family/`, `src/components/family/` |

🔵 **Checkpoint 1:** Roberta's W2-13 commits (≈ 5) → push. From here every page has the frame.

### Phase 2: grandma's screen + rest of the dashboard (parallel)

| Who | Task |
|---|---|
| Roberta | **W2-01** grandma's screen: big button → 4 + 1 questions → optional text → result → `tel:` button → offline fallback; **includes** the live message „Иван ще ви се обади веднага“ on her result screen (`watchCheck()` from `src/lib/realtime.ts`) |
| Alex | **W2-07 part 2**: pairing screen with QR, devices + revoke, check history → **W2-03** live alert page `/family/alerts` → **W2-04** „Обаждам ѝ се сега“ button |

🔵 **Checkpoint 2:** Roberta's W2-01 commits (≈ 6) + Alex's W2-07, W2-03, W2-04 (≈ 3) → push. The core demo works in the browser.

### Phase 3: finishing (parallel)

| Who | Task |
|---|---|
| Roberta | **W2-14** `/pokana` invite page → **W2-09** PWA (manifest, icons incl. `/icons/icon-192.png` and `/icons/badge-72.png`, install prompt, offline card in `public/sw.js`) → **W2-06** proofread the `bg.ts` texts marked "draft" (e-mail, push) |
| Alex | **W2-05** notification opt-in + iPhone hint → **W2-10 ✂** voice input (add-on to grandma's text step, only after W2-01 is on `main`) → real tests: push on a real phone, e-mail via Brevo |

🔵 **Checkpoint 3:** commits under each name → push.

### Phase 4: together

| Who | Task |
|---|---|
| Alex (leads) + Roberta | **W2-11** full demo e2e: two browsers, grandma + family, start to end |
| Alex + Roberta | **W2-12** learning note: Alex writes Realtime, push, e-mail; Roberta writes the screens and PWA |
| both | Check the live site on a real phone; each explains the other's part for 5 minutes |

🔵 **Final checkpoint:** all tests, push, CI green, Vercel deployed → Week 2 done.

### Expected commits at the end of Week 2

| | Before (5 Nov) | + Week 2 | End of Week 2 |
|---|---|---|---|
| Roberta | 11 | ≈ 19 | ≈ 30 |
| Alex | 48 | ≈ 8 | ≈ 56 |

Week 3 (Roberta 26 h, Alex 23 h) closes the gap further.

### Next: Week 3 (16–22 Nov)

Roberta: W3-03 map, W3-04 moderation API, W3-05 script API + education pages, W3-08 help pages, W3-09 ✂ escalation, W3-10 fridge card. Alex: W3-01 reports API, W3-02 report form, W3-04 moderation UI, W3-06 admin API + UI + charts, W3-07 ✂ AI. Both: W3-11 learning note. Planned in detail on its first day.
