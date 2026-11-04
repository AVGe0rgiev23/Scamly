<!-- Records the stack chosen in the brief (section 6) under D11; describes what is in the repo on 4 Nov, not future deploys. -->
# ADR 0001: Next.js, TypeScript and Supabase on free tiers

Date: 4 November 2026

Status: accepted (brief section 6, D11); in use since W1-01. Vercel deploy planned for Monday 9 November (W1-13, D20).

## Context

Scamly is a web application for the "Distributed Applications" category. It needs a REST API, a browser UI for four roles (protected person, family, moderator/admin, guest), user accounts, a relational database, live updates to the family's alert page and strong security that the jury will test. The app must be online and stable from registration (29.11) to the end of the tournament (6.12).

Our constraints: two 11th-grade students, about four weeks next to school. We both know Python and SQL; Roberta is learning TypeScript. The budget is about €0, so free tiers only, and any paid service needs our explicit agreement first ([D11](../PROJECT_BRIEF.md#0-decision-log-decided-on-2-november-2026)). The project is licensed GPL-3.0 and we must declare that we use only licensed or free software. The jury scores layered architecture, security, automated tests, git use, original UI, light/dark mode and correct Bulgarian.

## Options

| Option | Benefit | Limitation for this project |
|---|---|---|
| **Next.js 16 + TypeScript + Supabase + Tailwind on Vercel** | One language and one project for UI and REST API; the detection engine can run on the server and on the phone; Supabase gives PostgreSQL, Auth, Realtime and RLS in one free package; Vercel hosts Next.js for free with HTTPS | Roberta must learn TypeScript; Next.js 16 is newer than most tutorials; free Supabase projects pause when idle; we depend on two providers |
| Python (Django or FastAPI) + a React frontend | Python is the language we know best | Still needs JavaScript/TypeScript for the browser, so two languages, two apps, two deploys, CORS and two CI setups; the engine could not run on the phone as an offline fallback |
| Microsoft SQL Server (managed with SSMS) as the database | Familiar from school; also has row-level security | Only a database: no auth or push-to-browser; a free instance must be hosted by us 24/7, and Azure free offers are limited; SSMS runs only on Windows; closed source |
| Firebase (Firestore + Firebase Auth) | Generous free tier, good mobile SDKs and push | NoSQL: no SQL, joins or foreign keys for very relational data; security rules in Firebase's own language instead of SQL that we can test with pgTAP; hard to leave |
| Next.js frontend + a separate Express (Node) backend | A plain server that is easy to explain; could hold WebSockets | Two apps and two deploys; a long-running server needs a host that does not sleep (free options sleep or cost money); auth, Realtime and RLS would still have to come from somewhere |

## Decision

Use **Next.js 16 (App Router) with strict TypeScript** for pages and the REST API (route handlers in `src/app/api/`), **Supabase** for PostgreSQL, Auth, Realtime and Row Level Security, **Tailwind CSS 4** for our own design system with light/dark mode, and **Vercel Hobby** for hosting. Supabase and Vercel run in the Frankfurt region. All services stay on **free tiers** (D11).

- Code follows strict layers: UI → API (auth check + Zod) → services → repositories → PostgreSQL with RLS. The browser never writes to the database directly.
- RLS is a second lock behind the API checks. The service-role key is used only by a short, listed set of server functions (BUILD_PLAN 2.4).
- The database is built from plain SQL migration files in `supabase/` (no ORM) and tested with pgTAP; unit tests use Vitest, end-to-end tests use Playwright, and GitHub Actions runs them on every push.
- Exact versions are pinned in `package.json` (Next.js 16.4.4, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.4, `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, Zod 4.6.7).
- A keep-alive job (GitHub Actions cron hitting a health endpoint) and an external uptime monitor keep the free Supabase project from pausing.

## Consequences

Good: one language and one repository for the whole app, so both of us can work on both sides and Python habits carry over (Zod is like Pydantic, types are like type hints). Security-critical parts we would otherwise write ourselves (password hashing, sessions, refresh tokens) come from Supabase Auth. Access rules live in SQL inside the database, where we can read them in the defense and test them. Realtime respects the same RLS rules, which serverless Vercel functions could not provide on their own because they cannot hold WebSocket connections. Supabase is standard PostgreSQL, so we can export with `pg_dump` and move.

Bad: Roberta spends Week 1–2 learning TypeScript, and Next.js 16 changed APIs since most tutorials (we read `node_modules/next/dist/docs/`). Next.js does a lot automatically (caching, server and client components), which is harder to explain than a plain server. Free tiers have limits (database size, auth e-mails, Realtime connections, Vercel function time) and a free Supabase project pauses after a period of inactivity; the keep-alive is required, not optional. If Supabase is down, login, data and live alerts are down together. We are somewhat tied to Vercel; the flash-drive local build is the offline backup. No paid service is approved by this ADR.

## Current implementation and completion evidence

In the repo on 4 November: the Next.js 16 scaffold with strict TypeScript, Tailwind design system and light/dark mode (W1-01, W1-11), the Supabase schema, RLS policies and pgTAP tests (W1-04, W1-05), Supabase Auth through our API (W1-06), device pairing (W1-07) and GitHub Actions CI running lint, type-check, format check and tests (W1-02). The cloud Supabase project exists and has the migrations applied.

**Not done yet:** the Vercel production deploy, `/api/health` and the keep-alive cron (W1-13, Monday 9 November), the uptime monitor (Week 4) and the Realtime alert page (Week 2). Completion evidence for W1-13: the production URL is live, the health endpoint returns `{ok: true, db: true}` and a cron run is visible in Actions.

Sources within the repository: [brief section 6 and D11](../PROJECT_BRIEF.md), [architecture at a glance](../BUILD_PLAN.md#0-architecture-at-a-glance), [language and framework choices](../WHY_WE_CHOSE.md#1-language-and-framework), [database choices](../WHY_WE_CHOSE.md#2-database-and-backend-services), [hosting](../WHY_WE_CHOSE.md#9-hosting-and-operations).
