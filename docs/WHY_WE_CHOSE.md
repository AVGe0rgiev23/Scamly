# Scamly: why we chose what we chose

> **Rule (decision D19): this file is updated in the same commit every time anything is used, added, changed or removed** (a library, a service, a tool, or an important design choice). If a commit adds a package to `package.json` and this file doesn't change, the commit isn't finished.
>
> Last updated: 2026-11-03

This file answers the jury question **"why this and not something else?"** for every technology, library, service, tool and important design choice in Scamly. It's written for us (Alex and Roberta) so we can defend each choice in our own words. Each entry is honest: it says what we gain **and what we lose**.

Our constraints, which most answers come back to:

- **Budget ~€0** (D11): free tiers only, and the free tier must be enough for the whole judging period.
- **Online and stable** from registration (29.11) to the end of the tournament (6.12). Nothing may sleep or pause.
- **2 students, about 4 weeks**, next to school. We both know Python and SQL well; Roberta is learning TypeScript.
- **The jury scores** architecture (layers, separation of UI and logic), security, automated tests, git use, original UI, correct Bulgarian, light/dark mode.
- **GPL-3.0** and a declaration that we only use licensed or free software.
- **Users:** older people on cheap Android phones, Bulgarian UI only.

How the pieces fit together at runtime: [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md). The full plan: [`BUILD_PLAN.md`](./BUILD_PLAN.md). Versions below are the exact ones in `package.json`.

Status labels: **in use** = it's in the repo now. **decided, not built yet (week N)** = agreed in the plan, arrives in that week.

---

## Contents

1. [Language and framework](#1-language-and-framework): TypeScript · Next.js 16 · React 19 · Node.js 22 · REST route handlers · layers
2. [Database and backend services](#2-database-and-backend-services): Supabase / PostgreSQL · **SQL Server + SSMS (detailed)** · Firebase · MySQL/MariaDB · MongoDB · SQLite · own auth · plain SQL migrations (no ORM) · Supabase JS client · generated DB types (postgres-meta)
3. [Security design](#3-security-design): two locks (RLS + API) · server-only writes · HMAC pairing codes · device pairing · `.invalid` device e-mails · Postgres rate limiting · Zod · auth through our API · HttpOnly cookies + three clients · proxy checks login only · same-origin check · CSP · personal-data redaction
4. [Frontend](#4-frontend): Tailwind CSS 4 · own design system · system fonts · PWA · Leaflet + OpenStreetMap · Web Speech API · Recharts
5. [Notifications](#5-notifications): Supabase Realtime · Web Push (VAPID) · Brevo behind `EmailProvider`
6. [AI layer (planned, week 3)](#6-ai-layer-planned-week-3): rules first + optional AI · Gemini + Groq chain · AI can only raise the verdict
7. [Detection engine design](#7-detection-engine-design): pure TypeScript rules · Damerau-Levenshtein · шльокавица transliteration · offline fallback · green never says "safe" · shared types + `as const` lists
8. [Testing and quality](#8-testing-and-quality): Vitest · Playwright · pgTAP · local Postgres + shim runner · dependency-injected fakes · ESLint + Prettier · strict TypeScript · GitHub Actions
9. [Hosting and operations](#9-hosting-and-operations): Vercel Hobby · Frankfurt region · keep-alive · `pg_cron` · uptime monitor · pinned versions
10. [Project process and documentation](#10-project-process-and-documentation): one `main` branch · student-only commits · Claude Code + Codex · shared `AGENTS.md` rules · GPL-3.0 · English code + Bulgarian UI · Markdown docs · rolling planning · feature switches
11. [Small configuration choices](#11-small-configuration-choices): `next typegen` · `cacheComponents` · `.npmrc save-exact` · Turbopack · `proxy.ts` · npm · EditorConfig · env check with Zod · `APP_NAME` constant · `server-only`
12. [How to add an entry](#12-how-to-add-an-entry)
13. [Change history](#13-change-history)

---

## 1. Language and framework

### TypeScript 5.9.3  (status: in use)

**Used for:** all application code: pages, API, detection engine, tests.

**Alternatives we considered:** Python (Django/FastAPI), plain JavaScript, Java (Spring), C# (ASP.NET), PHP (Laravel).

**Why this one:**
- **One language for browser and server.** The browser can only run JavaScript. With Python we would still need JavaScript/TypeScript for the UI, so we'd be learning and debugging two languages in 4 weeks instead of one.
- **The detection engine runs in both places** (server = official verdict, phone = offline fallback, BUILD_PLAN 4.9). That's only possible if it's written in the browser's language.
- **Types catch mistakes before the jury does.** Compared with plain JavaScript, a wrong field name or a missing `null` check is an error at build time, not a crash on grandma's phone. The jury scores "valid code" and stability.
- **Close to Python with type hints.** `type CallInput = {...}` reads like a `TypedDict`; Zod schemas are like Pydantic. We comment these comparisons in the code so Roberta's Python knowledge transfers.
- Java and C# are strong typed languages too, but they'd also need a separate frontend in JavaScript, and their free hosting options are fewer. PHP has the same "second language for the UI" problem.

**What we give up:**
- Roberta has to learn a new language during the project, which costs time in week 1–2.
- Python is the language we're best at; some logic would be faster for us to write in it.
- TypeScript types disappear at runtime, so we still need Zod to check data from outside.

**We would reconsider if:** the app had no browser UI (e.g. a pure data-analysis backend), where Python would be the obvious choice.

### Next.js 16 (16.4.4), App Router  (status: in use)

**Used for:** the web framework: pages, the REST API (`src/app/api/**/route.ts`), building and serving the app.

**Alternatives we considered:** React + a separate Express or FastAPI backend, Django, Flask/FastAPI + React, Laravel, ASP.NET.

**Why this one:**
- **Frontend and REST API in one project, one deploy.** With React + FastAPI we'd run two apps, two hostings, CORS settings and two CI setups. That's double the operations work for two people.
- **Free, first-class hosting on Vercel** (the company that makes Next.js). No server to keep alive.
- **Route handlers are a normal REST API** (GET/POST/PUT/DELETE + JSON), which is what the "Distributed Applications" category expects. We can still show a clear client–server split.
- **Server Components** let us keep secrets and database code on the server by default; `server-only` code never reaches the browser.
- Django and Laravel are excellent full-stack frameworks, but their UI is server-rendered templates; a live alert page and an offline-capable PWA need a lot of JavaScript on top anyway.
- Current stable version: we start the project on it, so we don't migrate in the middle of the competition.

**What we give up:**
- Next.js 16 is newer than most tutorials and Claude's training data (see `AGENTS.md`); we must read the docs in `node_modules/next/dist/docs/`.
- The framework does a lot "by magic" (caching, server vs client components), which is harder to explain than a plain Express server.
- Some features work best on Vercel, so we're somewhat tied to it.

**We would reconsider if:** we needed a long-running server (e.g. our own WebSocket server); then a separate backend would fit better.

### React 19 (19.3.1)  (status: in use)

**Used for:** building the UI from components (Button, Verdict, BigChoice...).

**Alternatives we considered:** Vue, Svelte, Angular, plain HTML + JavaScript.

**Why this one:**
- Next.js is built on React; choosing Next.js means choosing React.
- React is the most widely used UI library, so answers to our questions are easy to find.
- Components match how we design: our own small design system in `src/components/ui/`.
- React escapes text by default, which protects against XSS (we never use `dangerouslySetInnerHTML`).

**What we give up:**
- React adds JavaScript to download, which matters on cheap phones; Svelte would ship less.
- Server vs client components is a new idea we must learn.

**We would reconsider if:** we dropped Next.js (then Svelte/SvelteKit would be a serious option).

### Node.js 22 LTS  (status: in use)

**Used for:** running Next.js, the tests and the tools; version fixed in `.nvmrc` (`22`), and CI reads the same file.

**Alternatives we considered:** Node.js 24 (newer LTS), Bun, Deno.

**Why this one:**
- LTS (long-term support) = security fixes; Node 22 is supported past the tournament.
- Supported by Next.js 16, Vercel and every tool we use. Bun and Deno are faster in places but have more compatibility surprises.
- One version in `.nvmrc` means our laptops, the cloud session and CI all run the same Node.

**What we give up:**
- Node 22 is already in its maintenance phase; Node 24 is the newer LTS and will be supported longer.

**We would reconsider if:** a library we need requires Node 24, or the project continues after the tournament (then upgrade to the newest LTS).

### REST API with route handlers  (status: in use (auth, me, persons, pairing, devices); the rest: week 2–3)

**Used for:** every read and write from the browser goes through `/api/...` (36 routes, BUILD_PLAN section 3).

**Alternatives we considered:** Next.js Server Actions, GraphQL, tRPC, the browser talking to Supabase directly.

**Why this one:**
- The category is "Distributed Applications"; a REST API is the clearest way to show client–server communication.
- Every route has the same 4 steps (who are you → is the input valid → business logic → respond), which is easy to explain and test.
- Plain HTTP + JSON is testable with any tool (Playwright, curl), and the status codes (400/401/403/404/429) show our error handling.
- GraphQL and tRPC add a new concept to learn without giving the jury anything they score.

**What we give up:**
- More code than Server Actions (we write the `fetch` calls and the JSON shapes ourselves).
- No automatic type link between client and server; we share Zod schemas from `src/schemas/` instead.

**We would reconsider if:** the API were only used by our own pages and nobody cared about REST; then Server Actions would save code.

### Strict layers: UI → API → services → repositories → database  (status: in use (Session E: `src/app/api`, `src/server/services`, `src/server/repositories`))

**Used for:** organising the code so each layer only talks to the one below (BUILD_PLAN 0 and 1).

**Alternatives we considered:** putting queries directly in pages and route handlers (the "tutorial" style).

**Why this one:**
- The jury explicitly scores "separation of UI from business logic" and "well-structured layers and modules".
- Business logic in services can be tested without a browser; queries in repositories can be changed without touching screens.
- Two people can work in parallel in different folders with few conflicts.

**What we give up:**
- More files and some boilerplate for simple features.

**We would reconsider if:** never for this project; it's a scoring criterion.

---

## 2. Database and backend services

### Supabase (PostgreSQL 17, Auth, Realtime, RLS), free tier  (status: in use (schema, RLS, functions, Auth); Realtime: week 2)

**Used for:** our database, logins, live updates to the family's alert page, and the security rules in the database.

**Alternatives we considered:** Microsoft SQL Server (+ SSMS), Firebase, MySQL/MariaDB, MongoDB, SQLite, writing our own auth.

**Why this one:**
- **Five things in one free package:** a hosted PostgreSQL database, Auth (sign-up, login, password hashing, sessions), Realtime (push changes to browsers), Row Level Security, and an automatic REST layer. Building those ourselves would take most of our 4 weeks.
- **It's real SQL.** We already know SQL; our schema, RLS policies and functions are plain `.sql` files we can read in the defense.
- **RLS + Auth are connected:** the logged-in user's id arrives in PostgreSQL as `auth.uid()`, so the database itself can say "you may only see your own rows". Realtime uses the same rules, so a family member only gets alerts for their own people.
- **EU region (Frankfurt)** for GDPR and low latency to Bulgaria.
- **Not locked in:** it's standard PostgreSQL, so we can export it with `pg_dump` and move to any Postgres host.
- PostgreSQL is open source (PostgreSQL licence), which fits our free-software declaration.

**What we give up:**
- The free project **pauses after a period of inactivity** (about a week when we checked; check current limits). We need a keep-alive (section 9).
- Free-tier limits on database size, auth emails and Realtime connections (check current limits). Fine for a demo, not for a national launch.
- We depend on one company for several services at once; if Supabase is down, login, database and Realtime are all down.

**We would reconsider if:** the free tier stopped being enough for the judging period, or we needed a feature Supabase can't do.

### Why PostgreSQL in Supabase and not Microsoft SQL Server with SSMS  (status: decided, rejected alternative)

**The question the team asked:** "We know SQL Server and SSMS from school. Why not use them?"

**First, an important detail: SSMS is not a database.** SSMS (SQL Server Management Studio) is a **tool** for managing a database: you write queries, look at tables and manage users in it. The database itself would be **Microsoft SQL Server**. So the real comparison is **SQL Server vs PostgreSQL**, plus **SSMS vs the tools we'd use with PostgreSQL**.

**SQL Server is a good database.** To be fair to it:
- It's fast, reliable and used by many companies.
- It also has **Row-Level Security** (security predicates on tables), so the "database checks who sees which rows" idea would work there too.
- **SQL Server Express** is free to use, and SQL Server also runs on Linux and in Docker.
- T-SQL is standard SQL with extras, just like PostgreSQL's dialect.

**So why not, for us?**

1. **Hosting is the big problem.** The rules say the app must be online and stable for the whole judging period.
   - SQL Server Express is free, but **we would have to host it ourselves 24/7**: on a home computer (must never turn off, needs port forwarding, opens our home network to the internet) or on a rented server (costs money, against D11).
   - **Azure SQL Database** has a limited free offer, and Azure for Students gives some free credit (check current limits and terms). But the free amounts are limited, credits run out, and it's one more cloud account to manage.
   - Supabase gives us a hosted, backed-up PostgreSQL in Frankfurt for free, with no server to look after.
2. **SQL Server is only the database. We'd have to build the rest ourselves:**
   - **Login/auth:** password hashing, sessions, password reset emails, brute-force protection. Supabase Auth does this; writing our own is risky (see "Writing our own auth" below).
   - **Live updates to browsers:** SQL Server has no built-in way to push a new row to a web page. We'd need our own WebSocket server (e.g. ASP.NET SignalR) running all the time, and Vercel's serverless functions can't hold WebSocket connections open. Supabase Realtime does this, and it respects our RLS rules.
   - **RLS needs to know who the user is.** In SQL Server, our app would have to pass the user id into every connection (e.g. with `SESSION_CONTEXT`). In Supabase, the logged-in user's id reaches the database automatically through the JWT (`auth.uid()`).
   - **An API layer** for Realtime and direct reads: Supabase generates it.
3. **Serverless + SQL Server connections are awkward.** On Vercel, every request may start a new short-lived function. SQL Server expects a few long-lived connections from one app server. Supabase provides a connection pooler and an HTTP API built for this situation.
4. **SSMS runs only on Windows.** Our laptops, the cloud session (Linux) and the jury's machines may differ. Supabase has a **web dashboard** with a table editor and a **SQL editor** that works in any browser.
5. **Licence fit.** PostgreSQL is open source. SQL Server Express is free of charge but closed-source (proprietary licence). It would still be allowed ("licensed or free software"), but an open-source database fits a GPL project and our declaration more naturally.
6. **Our SQL skills transfer.** Both are SQL. `SELECT`, `JOIN`, `GROUP BY`, indexes, constraints, transactions, views and functions work the same way. The differences are small and learnable, for example: `TOP 10` → `LIMIT 10`, `IDENTITY` → `generated always as identity`, `GETDATE()` → `now()`, `NVARCHAR` → `text`, T-SQL procedures → PL/pgSQL functions.

**What we give up:**
- We can't use SSMS, the tool we already know.
- We have to learn the PostgreSQL differences and Supabase's way of doing auth and RLS.
- SQL Server has some features (e.g. its tooling for reports) that we'd know better.

**If you like SSMS, you can still use a similar desktop tool with our database:** **pgAdmin** or **DBeaver** (both free, both run on Windows, macOS and Linux) connect to Supabase's PostgreSQL. In the Supabase dashboard, click **Connect** and copy the connection details (if your network has no IPv6, use the **pooler** connection string). Two warnings: the `postgres` login bypasses RLS, so what you see there is not what a user sees; and schema changes must still go through a new file in `supabase/migrations/`, never by clicking in a tool.

**We would reconsider if:** a school or sponsor gave us a hosted SQL Server for free for the whole period **and** we didn't need auth and live browser updates (which isn't our case).

### Supabase vs Firebase  (status: decided, rejected alternative)

**Used for:** (comparison) a "backend in a box" with auth, database and realtime.

**Alternatives we considered:** Firebase (Firestore + Firebase Auth).

**Why Supabase:**
- Firestore is a **NoSQL document database**: no SQL, no `JOIN`s, no foreign keys. Our data is very relational (person → contacts → checks → alerts), and we know SQL.
- Firebase security rules are written in **Firebase's own rules language**; Supabase RLS policies are written **in SQL** inside the database, and we test them with pgTAP.
- Supabase is open source and standard Postgres, so we can leave; leaving Firestore means rewriting the data layer.

**What we give up:**
- Firebase has very good mobile SDKs and push (FCM) built in.
- Firebase's free tier is generous and doesn't pause projects the same way.

**We would reconsider if:** we built a native mobile app with mostly offline, document-shaped data.

### Supabase vs MySQL / MariaDB  (status: decided, rejected alternative)

**Used for:** (comparison) a relational SQL database.

**Alternatives we considered:** MySQL, MariaDB (hosted or self-hosted).

**Why PostgreSQL/Supabase:**
- MySQL and MariaDB have **no built-in Row Level Security**; we'd lose our second lock.
- They'd also come without Auth and Realtime (same problem as SQL Server).
- Free hosted MySQL options are fewer and change often (e.g. PlanetScale dropped its free plan); check current offers.

**What we give up:**
- MySQL is very common in school courses and cheap shared hosting.

**We would reconsider if:** we moved to classic PHP hosting where MySQL is the only option.

### Supabase vs MongoDB  (status: decided, rejected alternative)

**Used for:** (comparison) a database.

**Alternatives we considered:** MongoDB Atlas free tier.

**Why PostgreSQL/Supabase:**
- MongoDB is NoSQL (documents), so we'd give up SQL, relations and constraints that protect data (e.g. `unique (protected_person_id, priority)`).
- No RLS in the database; all access rules would be in our code only (one lock).
- No auth and no realtime-to-browser package comparable to Supabase in the same free offer.

**What we give up:**
- Flexible documents are quicker when the data shape changes a lot.

**We would reconsider if:** our data were unstructured (e.g. storing whole AI conversations).

### Supabase vs SQLite  (status: decided, rejected alternative)

**Used for:** (comparison) a simple database.

**Alternatives we considered:** SQLite file database (or a hosted SQLite service such as Turso).

**Why PostgreSQL/Supabase:**
- Vercel functions have **no permanent disk**, so a SQLite file would be lost between requests.
- No users, roles or RLS in SQLite; no realtime.
- Hosted SQLite services exist, but still without auth, RLS and realtime.

**What we give up:**
- SQLite is the simplest database there is (one file, zero setup), great for tests.

**We would reconsider if:** we built an offline-only app on one device.

### Supabase Auth vs writing our own auth  (status: in use (family accounts, device logins))

**Used for:** family / moderator / admin sign-up and login, sessions, and the device logins for older people.

**Alternatives we considered:** our own users table + password hashing + sessions; Auth.js (NextAuth); Clerk/Auth0.

**Why this one:**
- Auth is where most security bugs live (password storage, session theft, reset links, brute force). Supabase Auth already hashes passwords (bcrypt), handles refresh tokens and has rate limits.
- It's connected to RLS (`auth.uid()`) and Realtime, which a separate auth service wouldn't be.
- Clerk and Auth0 are good but add another account and their own free-tier limits; Auth.js would still need our own user storage.
- We spend our security effort on what's special to us (device pairing, RLS, rate limits).

**What we give up:**
- Less control over how sign-up emails and sessions work; Supabase's built-in auth email sending is very limited on the free tier (risk R5).
- We must learn how Supabase sessions and cookies work in Next.js.

**We would reconsider if:** Supabase Auth couldn't support our device-pairing flow (it can, with server-created users).

### Plain SQL migrations with the Supabase CLI (no ORM)  (status: in use)

**Used for:** building the database from numbered `.sql` files in `supabase/migrations/` (schema, triggers, RLS helpers, policies, functions, Realtime).

**Alternatives we considered:** Prisma, Drizzle, TypeORM; clicking tables together in the dashboard.

**Why this one:**
- We know SQL; reading `create table` and `create policy` is easier for us than learning an ORM's schema language.
- RLS policies, `SECURITY DEFINER` functions and grants are SQL anyway; ORMs don't manage them well.
- `supabase db reset` rebuilds the database from zero, so the schema is in git and reviewable (better than clicking in a dashboard).
- **Additive rule:** we never edit an old migration; we add a new numbered file. The live database is never broken by a rewrite.

**What we give up:**
- No automatic TypeScript types from an ORM; we generate them from the database instead (`src/types/database.ts`, next entry but one).
- Renaming a column means writing the `alter table` ourselves.

**We would reconsider if:** the schema grew so big that hand-written SQL became error-prone.

### Supabase JS client (2.118.0) + `@supabase/ssr` (0.12.7)  (status: in use)

**Used for:** talking to Supabase from our server code (user and admin clients) and, from Week 2, from the browser (Realtime only), with sessions in cookies written by the server.

**Alternatives we considered:** a raw PostgreSQL driver (`pg`, `postgres`), raw HTTP calls.

**Why this one:**
- Queries are parameterised for us, so no SQL injection from string building.
- Requests carry the user's own token, so RLS applies even to our server code (the "user-scoped client").
- `@supabase/ssr` is Supabase's official way to keep sessions in cookies with Next.js.

**What we give up:**
- One more library to keep updated, and its query style is less flexible than raw SQL (complex queries become SQL functions).

**We would reconsider if:** we left Supabase.

### Generated database types with `@supabase/postgres-meta` (vs hand-written types, vs waiting for the Supabase CLI)  (status: in use (`src/types/database.ts`))

**Used for:** the TypeScript shape of every table, enum and SQL function, passed to every client as `createClient<Database>()`, so every query is type-checked.

**Alternatives we considered:** writing the types by hand; skipping types (`any` rows); waiting for a computer where `supabase gen types typescript` runs (the CLI can't be downloaded in the cloud session).

**Why this one:**
- **Generated = can't drift.** Hand-written types would be a second copy of the schema that we'd forget to update; a typo in a column name would only show up at runtime.
- `postgres-meta` (0.100.0) is the generator the Supabase CLI itself runs inside its Docker image, so the output is the same format the CLI makes. We ran it once against a local PostgreSQL 16 with our 6 migrations applied.
- It didn't block Session E: W1-04's last step was done the same day.
- Strict TypeScript (section 8) then catches wrong columns, enum values and `null` handling in every repository.

**What we give up:**
- Regenerating is a manual step after every migration; nothing checks that the file matches the SQL.
- The local run used PostgreSQL 16, the live project uses 17 (no difference for the types we use). `postgres-meta` is not a dependency in `package.json`; it was used once.

**We would reconsider if:** the Supabase CLI works in our environment; then `npx supabase gen types typescript --local` becomes the way to regenerate (the same output).

---

## 3. Security design

### Two locks: Row Level Security in the database + checks in the API  (status: in use (RLS; API checks in `requireRole` and the services since Session E))

**Used for:** making sure user A can never read or change user B's data (IDOR protection).

**Alternatives we considered:** only checks in the API code (the usual approach); only RLS.

**Why this one:**
- **Defence in depth:** if one lock has a bug, the other still holds. A forgotten ownership check in a route handler still returns zero rows, because PostgreSQL refuses.
- Realtime goes straight from the database to the browser, without our API. **Only RLS can protect Realtime.**
- Our migrations also `revoke all` privileges first and grant back only what's needed, so even commands RLS doesn't cover (like `TRUNCATE`) are blocked.
- The rules are testable on their own with pgTAP (section 8), which is strong evidence for the security score.

**What we give up:**
- Every rule exists twice (in TypeScript and in SQL), so changing permissions means changing both.
- RLS helper functions and policies are harder to debug than a plain `if` in code.

**We would reconsider if:** never for this project; security is scored and our users are vulnerable.

### Server-only writes for sensitive tables  (status: in use (no client write policies; the server writes `devices`, `pairing_codes`, `audit_log`, `rate_limits`); checks, alerts, reports: week 2–3)

**Used for:** `checks`, `alerts`, `reports`, `devices`, `pairing_codes`, `audit_log`, `rate_limits` have **no INSERT/UPDATE policy** for browsers; only our server (service role) writes them, after checking permissions.

**Alternatives we considered:** letting the browser write with RLS rules.

**Why this one:**
- **The phone must not send its own verdict.** The server runs the engine and stores the result; a modified phone can't write "green".
- Guests can't skip our rate limiter or honeypot by calling the database directly.
- The service role (which bypasses RLS) is used only in a short, listed set of functions (BUILD_PLAN 2.4), each with tests.

**What we give up:**
- The service-role key is powerful; if it leaked, RLS wouldn't help. It lives only in server environment variables.
- More API code than "just insert from the browser".

**We would reconsider if:** never for these tables.

### HMAC-SHA256 with a secret pepper for pairing codes  (status: in use (pairing codes, IP addresses in the rate limiter); phone numbers: week 2–3)

**Used for:** storing the 6-digit pairing codes (and caller phone numbers, IP addresses for rate limiting) as `HMAC-SHA256(value, PEPPER)`, never in plain text.

**Alternatives we considered:** plain SHA-256, bcrypt/argon2, storing the code in plain text.

**Why this one:**
- **Plain SHA-256 is useless for a 6-digit code:** there are only 1,000,000 codes, so anyone with the database can hash all of them in under a second and read every code.
- **The pepper is a secret that lives only in Vercel's environment variables**, not in the database. A leaked database alone doesn't reveal any code.
- **Why not bcrypt?** bcrypt is built for passwords people choose and reuse for years. Our codes are random, **single-use and expire in 10 minutes**. bcrypt uses a random salt, so we couldn't find a code with a simple indexed `WHERE code_hash = ...` lookup; we'd have to bcrypt-compare against every active code. And even slow bcrypt can't truly protect a space of only 1,000,000 codes from someone who has the database; the pepper is what actually protects it.
- Online guessing is stopped by **rate limiting** (5 tries per IP and 100 in total per 15 min), so the chance of hitting an active code is about 0.01 % (BUILD_PLAN 5).
- Family passwords are a different case: Supabase Auth stores those with bcrypt.

**What we give up:**
- If an attacker gets **both** the database and the pepper, codes are readable at once (but they're expired within 10 minutes anyway).
- Changing the pepper makes stored phone-number hashes no longer match (duplicate detection restarts).

**We would reconsider if:** we ever stored long-lived secrets chosen by users; those need a slow hash like bcrypt or argon2.

### Device pairing with a server-created device user  (status: in use (D4, D14; backend in Session E, page in Session F))

**Used for:** logging in the older person's phone once, with a 6-digit code or QR code, so they never see a login screen.

**Alternatives we considered:** Supabase anonymous sign-in, email + password for the older person, magic links, SMS codes.

**Why this one:**
- **Older people shouldn't have to remember passwords or open emails.** The family member enters the code once on grandma's phone.
- **Nothing exists until the code is correct.** With anonymous sign-in, every visit creates a user first, so bots could fill our user table. Here the server creates the device's user only after a correct code.
- **Revoking is simple:** delete the device's user, and its refresh token dies.
- The device user has an internal email at `.invalid` (a reserved domain that can never receive mail) and a random password the server uses once and forgets.
- Magic links need an email inbox the older person can open. **SMS costs money** (D11).

**What we give up:**
- A long-lived session on a phone: whoever holds the unlocked phone can use it (the same as any app that stays logged in).
- iOS Safari may clear storage on sites not opened for a long time, which can log the phone out (risk R9; re-pairing takes under a minute).
- More code to write and defend than a normal login.

**We would reconsider if:** the usability test (W4-05) shows families can't manage the pairing step.

### Device e-mail addresses on `devices.scamly.invalid`  (status: in use)

**Used for:** the internal login of each paired phone: `device-<random uuid>@devices.scamly.invalid`, with a random 32-byte password used once and forgotten.

**Alternatives we considered:** an address on `example.com`; an address on a real domain we own; a made-up top-level domain like `.local` or `.test`; Supabase phone or anonymous logins.

**Why this one:**
- **`.invalid` is reserved by RFC 2606** for exactly this: it never resolves, so no e-mail can ever be delivered and the address can never belong to a real person. A real domain could receive mail (and we'd have to own and maintain it).
- `example.com` is reserved for documentation, and `.local` has a real meaning on home networks; `.invalid` says "not an address" clearly in the defense.
- A random uuid per phone means two phones never collide, and the address reveals nothing about the older person.
- Supabase Auth needs an e-mail or phone for a password login; anonymous sign-in was rejected (D14, previous entry). Checked on 3 Nov that the live project accepts the domain.

**What we give up:**
- If Supabase ever started rejecting reserved domains, pairing would break; the smoke test would show it at once.
- Device accounts appear in the Auth user list next to real ones (they are easy to tell apart by the domain).

**We would reconsider if:** Supabase offered a proper "device" login type.

### Rate limiting in PostgreSQL, with HMAC'd IP addresses  (status: in use (login, register, pairing; reports: week 3))

**Used for:** limiting login (10 per 15 min per IP), registration (5 per hour per IP) and pairing-code guesses (5 per 15 min per IP + 100 per 15 min for everybody), later public reports. TypeScript wrapper: `src/server/security/rateLimit.ts`.

**Alternatives we considered:** Redis / Upstash, Vercel or Cloudflare rate limiting, in-memory counters; storing the plain IP address.

**Why this one:**
- **No extra service or account:** a `rate_limits` table + one atomic SQL function (`INSERT ... ON CONFLICT DO UPDATE`), tested with pgTAP. Upstash would be one more account, key and free-tier limit (D11).
- **In-memory counters don't work on serverless:** each Vercel function instance has its own memory, and it is lost between requests.
- **The IP is HMAC'd with `HASH_PEPPER`** before it becomes part of a key, so the database never stores a real IP address (GDPR). Old windows are deleted automatically, so even the hash is kept for about an hour at most.
- **Fails closed:** if the database can't count, the attempt is refused (429/500), never let through.
- **Our own limits for login and sign-up** are needed because those go through our server (next entries): Supabase's per-IP limits see only our server's address.

**What we give up:**
- Every limited request costs one database write; Redis would be faster under heavy load.
- Fixed windows can allow a short burst at a window's edge (fine at our scale).
- Failing closed means a database outage also blocks logins (but without the database nothing works anyway).
- Locally there is no `x-real-ip`, so all local requests share one counter.

**We would reconsider if:** traffic grew so large that the extra database writes became a bottleneck.

### Zod 4 (4.6.7) for validation  (status: in use (env check, API schemas in `src/schemas/`))

**Used for:** checking every input to the API, form data, environment variables, and (week 3) AI answers.

**Alternatives we considered:** Yup, Joi, writing `if` checks by hand.

**Why this one:**
- One schema gives both the **runtime check** and the **TypeScript type** (`z.infer`), like a Pydantic model.
- The same schema is shared by the form in the browser and the API on the server (`src/schemas/`).
- Joi is mainly for Node servers, and Yup's TypeScript support is weaker. Hand-written checks are easy to forget, and every forgotten check is a security hole.
- MIT licence, no dependencies.

**What we give up:**
- One more API to learn; error messages need translating to Bulgarian ourselves.

**We would reconsider if:** never; it's central to "protection from common attacks".

### Sign-up and login through our API (vs Supabase Auth directly from the browser)  (status: in use (`/api/auth/register`, `/login`, `/logout`))

**Used for:** family members' sign-up, login and logout. The browser posts JSON to our route handlers; the server calls Supabase Auth and sets the cookies.

**Alternatives we considered:** the plan's default: the browser calls `supabase.auth.signUp()` / `signInWithPassword()` itself through `@supabase/ssr`; Server Actions.

**Why this one:**
- **The cookies can be HttpOnly**, because the server writes them (next entry). With browser-side login the library must write cookies JavaScript can read.
- **Our own rate limits run first** (login 10 per 15 min, register 5 per hour, per IP), next to the pairing limits, in one place we can test.
- **Bulgarian errors, and no account probing:** Supabase's error codes are mapped to our messages; an unknown e-mail and a wrong password get the same 401.
- It follows our rule "the browser never talks to the database or Auth directly, everything goes through the API" (BUILD_PLAN 0), and it's the same route shape as every other endpoint.

**What we give up:**
- **Supabase sees every login coming from our server's IP**, so its own per-IP limits are useless to us; we rely on ours.
- A little more code than calling the library from the page.

**We would reconsider if:** we needed Supabase's built-in OAuth logins (Google etc.), which redirect in the browser.

### Session in HttpOnly cookies, with three Supabase clients  (status: in use (`src/server/supabase/`, `src/lib/supabase/browser.ts`))

**Used for:** keeping users (and paired phones) logged in, and choosing which client a piece of code may use: the **user client** (publishable key + the caller's cookies, RLS applies), the **admin client** (secret key, bypasses RLS, `server-only`, only for the BUILD_PLAN 2.4 list) and the **browser client** (publishable key, no session, Realtime from Week 2).

**Alternatives we considered:** tokens in `localStorage`; `@supabase/ssr`'s default cookies, which page JavaScript can read; one admin client for all server code.

**Why this one:**
- JavaScript can't read HttpOnly cookies, so an XSS bug can't steal the session. We override the library's default with `AUTH_COOKIE_OPTIONS` (`httpOnly: true`, `secure` in production, `sameSite: "lax"`), shared by the user client and the proxy.
- `Secure` + `SameSite=Lax` cookies are sent only over HTTPS and not on most cross-site requests.
- **The user client by default** keeps RLS working on our own server code (two locks). One admin client everywhere would make one forgotten check a data leak.
- `server-only` turns "the secret key must never reach a phone" into a build error.

**What we give up:**
- Cookies need CSRF protection (the same-origin check below).
- The browser client can't see the session, so Week 2 Realtime needs a small endpoint that hands the page a short-lived access token for `realtime.setAuth()`.

**We would reconsider if:** we built a native app (which would store tokens in the phone's secure storage).

### The proxy checks only "logged in or not"; roles are checked in server code  (status: in use (`src/proxy.ts`, `requirePageRole`, `requireRole`))

**Used for:** the proxy refreshes the session with `getClaims()` (local JWT signature check, no database call) and sends logged-out visitors to `/vhod` or `/svarzhi`. Roles are checked in each area layout (`requirePageRole`) and API route (`requireRole`), which use `getActor()` → `auth.getUser()` + the profile.

**Alternatives we considered:** looking up the role in the database inside the proxy on every request; trusting a role stored in the JWT; checking only in the proxy.

**Why this one:**
- The proxy runs on **every** request, prefetches included. A database query each time would slow every page on a cheap phone and use up free-tier quota.
- The Next.js 16 authentication guide recommends exactly this split: the proxy for "optimistic checks", real authorization close to the data.
- `getUser()` in the server check rejects a **deleted** account at once, so a revoked phone is locked out on its next request.
- A role in the JWT would stay old until the token expired after a role change; the profile row is the single source of truth.

**What we give up:**
- A revoked phone's access token (about 1 hour) still passes the proxy until it expires; only the layout and the API stop it.
- One Auth call per protected request (in `getActor()`).

**We would reconsider if:** Auth calls became a measurable delay; then a short-lived cache of the actor per request would be the next step.

### Same-origin check for CSRF (vs CSRF tokens)  (status: in use (`src/server/security/origin.ts`, step 0 of every non-GET route))

**Used for:** refusing any non-GET API request that another website started (403 `bad_origin`).

**Alternatives we considered:** CSRF tokens (a secret in every form, or the "double-submit cookie"); relying on `SameSite=Lax` alone; checking only `Origin`.

**Why this one:**
- Browsers add `Sec-Fetch-Site` and `Origin` themselves and page JavaScript can't change them. We use the rule order of Go's `net/http` `CrossOriginProtection`: `Sec-Fetch-Site` (only `same-origin` or `none`) → else `Origin` host must equal `Host` → else (no browser headers) allow, because a request without a browser carries no victim's cookies.
- No token to create, store, send with every form and check: less code for both of us, nothing for Roberta's pages to forget.
- `SameSite=Lax` alone is not enough for older browsers and same-site subdomains; together the two are layered.
- It is a pure function, so 7 unit tests prove it (foreign site → 403, own page → OK, GET never blocked).

**What we give up:**
- Very old browsers send neither header; they are treated like curl (allowed), and only `SameSite=Lax` protects them.
- A proxy in front of us that rewrote `Host` would need care (Vercel doesn't).

**We would reconsider if:** we had to accept form posts from another site of ours, which would need an allow-list.

### CSP and security headers  (status: decided, not built yet (week 4); the same-origin part is the previous entry)

**Used for:** blocking requests from other websites (CSRF), and limiting what scripts may run (CSP) and how our pages may be framed.

**Alternatives we considered:** CSRF tokens in every form; no CSP.

**Why this one:**
- A CSP with a nonce and headers such as HSTS and `frame-ancestors` are free extra protection, and the result can be shown with a header-scanning site.

**What we give up:**
- A strict CSP can break things (e.g. a map tile server must be allowed explicitly).

**We would reconsider if:** we added third-party embeds; each one needs to be allowed in the CSP.

### `redactPersonalData()` before storing or sending text  (status: decided, not built yet (week 1))

**Used for:** removing phone numbers, emails, IBANs, card numbers, ЕГН and known names from free text before it's saved or sent to AI.

**Alternatives we considered:** storing the raw text; asking users not to type personal data.

**Why this one:**
- GDPR data minimisation: we don't need these details to detect a scam.
- Free AI tiers may use inputs for training, so personal data must never reach them.
- It's a pure, unit-tested function; each pattern has tests.

**What we give up:**
- Some useful detail is lost (e.g. the exact number a scammer gave), and patterns can miss unusual formats.

**We would reconsider if:** never; we'd only extend the patterns.

---

## 4. Frontend

### Tailwind CSS 4 (4.3.4)  (status: in use)

**Used for:** styling every component with small utility classes and our own colour tokens.

**Alternatives we considered:** plain CSS / CSS modules, Bootstrap, Material UI, component kits (e.g. shadcn/ui, Chakra).

**Why this one:**
- The jury scores **"original components and design"**. Bootstrap and Material UI give a recognisable "default" look that's hard to make our own; Tailwind gives building blocks, not finished components.
- Colour tokens for light/dark mode live in CSS variables (`globals.css`, `@theme`); the theme control selects a palette without duplicating component styles.
- Only the classes we use end up in the CSS file, which keeps pages small for cheap phones.
- Plain CSS would work too, but it's slower to keep consistent across many screens with two people.

**What we give up:**
- Long `className` strings that look messy at first.
- One more syntax to learn; the jury may ask "isn't that just inline styles?" (answer: no, they're shared, theme-aware design tokens).

**We would reconsider if:** we needed a large set of complex widgets (date pickers, data grids) fast; then a component kit would save time.

### Our own design system  (status: in use; W1-11 verified)

**Used for:** `Button`, `Card`, `Verdict`, `BigChoice`, `ThemeToggle` and colour/typography tokens in `src/components/ui/`, shown on a `/dev/ui` preview page.

**Alternatives we considered:** a ready component library.

**Why this one:**
- Scored directly ("original components and design").
- Our main user needs things kits don't offer by default: very large tap targets (≥ 64 px), base font ≥ 18 px, very high contrast, three verdict colours with words, not colour alone.
- We check WCAG AA contrast for every colour pair, in both themes.
- The theme select uses an explicit label/for association to keep its label separate from the option text. We installed Playwright Chromium locally and verified the production build with six browser runs. Build/browser commands need approved execution outside the Codex Windows sandbox because Turbopack workers use local TCP connections; no bundler or dependency changes were needed.
- Native buttons and fieldset/radio groups preserve keyboard and screen-reader behaviour without another UI dependency. Component props are explained as Python keyword arguments in the code.
- A three-choice theme control allows an explicit light/dark preference or the device setting. `localStorage` remembers only this non-sensitive preference; denied storage does not stop the control working, and system mode tracks device changes.
- Verdicts include words alongside colours and use the D9 green wording. The preview shows both palettes together so changes can be reviewed consistently.

**What we give up:**
- More work; accessibility details (focus rings, keyboard use) are now our responsibility.
- A saved browser preference is available after client initialization; without browser JavaScript the stylesheet can still follow the device palette, but the control cannot save a new choice.

**We would reconsider if:** time ran out; then we'd keep our own look for the protected screens and use simpler styling for admin pages.

### Shared schemas and native auth forms (status: in use, Session F)

**Used for:** designed login, registration, pairing and 403 pages plus logout in `src/components/auth/`.

**Alternatives we considered:** keeping the temporary forms, adding a form library, trusting browser-native validation messages, or signing in directly from the browser.

**Why this one:**
- Native labelled fields support keyboard use, password managers and phone input; our shared Button/Card and semantic tokens keep both themes consistent.
- Reusing Zod schemas gives Bulgarian validation before submission while the API still validates every request. Focused error summaries and field descriptions make the problem discoverable.
- Disabled controls plus a synchronous ref guard prevent accidental duplicate submissions. Failures retain the form, and logout navigates only when the server succeeds.
- Pairing codes stay strings; a valid query prefill saves typing without automatically linking a device. Known-role checks keep login destinations controlled.

**What we give up:**
- We maintain a small request helper ourselves. Browser tests with mocked API responses verify the UI contract but do not replace live demo-account login and pairing checks.

**We would reconsider if:** form complexity grows enough to justify a library; the API and server-managed session boundary remain the same.
### System fonts instead of web fonts  (status: in use)

**Used for:** all text uses the phone's or computer's built-in font (`font-sans`); we removed the Geist web font that `create-next-app` adds.

**Alternatives we considered:** Google Fonts / Geist via `next/font`, our own font files.

**Why this one:**
- **Faster on slow phones:** no font file to download.
- Built-in fonts on Android, iOS and Windows support Cyrillic well. Geist was chosen by the template for Latin text, not for Bulgarian.
- No font licence to track, no request to a font server (privacy).

**What we give up:**
- The app looks slightly different on each device, and we can't guarantee the Bulgarian-style Cyrillic letter shapes.

**We would reconsider if:** our design needed a specific font for the brand; then we'd self-host one with a free licence (e.g. OFL) that supports Bulgarian Cyrillic.

### PWA instead of a native Android/iOS app  (status: decided, not built yet (week 2))

**Used for:** making Scamly installable on the home screen, with web push and an offline "what to do" card.

**Alternatives we considered:** a native Android app (Kotlin), React Native / Flutter, a plain website.

**Why this one:**
- **One codebase for every phone and the jury's laptops.** A native app would be a second project.
- **No app store:** publishing takes accounts, review time and (for Apple) a paid developer account.
- The family can set it up on grandma's phone by opening a link and tapping "Add to Home Screen".
- The jury can open it from a link during judging.

**What we give up:**
- **iOS limits:** web push only works after "Add to Home Screen" on iOS 16.4+ (risk R2).
- A web app can't see incoming calls (and we don't want to: no call recording, by design).

**We would reconsider if:** the project continued and we needed features only native apps get (e.g. a screen that appears during a call).

### Leaflet + OpenStreetMap for the scam map  (status: decided, not built yet (week 3))

**Used for:** the public map of Bulgaria's 28 districts, coloured by number of approved reports.

**Alternatives we considered:** Google Maps, Mapbox, a static SVG map.

**Why this one:**
- **No API key, no billing account:** Google Maps and Mapbox need an account and a key, and charge above their free amounts (check current terms). D11 says no paid services.
- Leaflet is small (good for cheap phones) and open source (BSD-2-Clause); the district shapes come from OpenStreetMap data (ODbL), which is free if we show the credit "© OpenStreetMap contributors".
- A district choropleth is exactly what Leaflet + GeoJSON does well.

**What we give up:**
- Public OSM tile servers have usage rules and no guarantee; we must follow their policy (or show the districts without a tile background).
- Fewer ready features than Google Maps (no street view, no places search, which we don't need).

**We would reconsider if:** we needed street-level detail (we don't: privacy rule = district level only).

### Browser Web Speech API for voice input  (status: decided, not built yet (week 2) ✂ can be cut)

**Used for:** letting the older person say what the caller said instead of typing (`bg-BG`).

**Alternatives we considered:** paid speech-to-text APIs (Google Cloud, Azure, OpenAI Whisper API), running Whisper ourselves.

**Why this one:**
- **Free and built into Chrome on Android**, our main target phone.
- No audio files on our servers.
- Paid APIs cost money per minute; running Whisper ourselves needs a server with a lot of computing power.

**What we give up:**
- **Not available everywhere** (missing in Firefox, unreliable on iOS), so we hide the button when it isn't supported and always offer typing (risk R3).
- In Chrome, the audio is processed by the browser maker's servers, not ours; we can't control that.
- Needs an internet connection.

**We would reconsider if:** voice became the main way to use the app for people who can't read well (then a dedicated speech service would be worth asking about).

### Recharts for admin statistics  (status: decided (Q9), not built yet (week 3))

**Used for:** charts of checks per day, script types and regions on the admin dashboard.

**Alternatives we considered:** Chart.js, D3, drawing SVG by hand.

**Why this one:**
- Made for React (charts are components), MIT licence, widely used.
- We style it with our own tokens so it matches our design and dark mode.
- D3 is very powerful but much more to learn; hand-made SVG takes too long.

**What we give up:**
- Adds JavaScript to the admin pages (but those aren't for cheap phones).

**We would reconsider if:** the bundle got too big; then a lighter chart library.

---

## 5. Notifications

### Supabase Realtime live alert page as the primary channel  (status: in use (publication on `checks`, `alerts`); page: week 2)

**Used for:** the family member's alert page updates within seconds when grandma presses the button, and grandma's screen shows „Иван ще ви се обади веднага“ when Ivan acknowledges.

**Alternatives we considered:** web push only, email only, SMS, polling only.

**Why this one:**
- **Works on every phone and browser with nothing to install or allow** (D7). Push needs permission and, on iPhone, a home-screen install.
- It's what we show live in the demo: the alert appears on the jury member's phone.
- It respects RLS, so nobody gets events for people they aren't linked to.
- A 5-second polling fallback covers networks that block WebSockets.

**What we give up:**
- Only works while the page is open; if the family member's phone is locked with the page closed, they need push or email.

**We would reconsider if:** Realtime's free-tier connection limits became a problem (check current limits).

### Web Push with VAPID  (status: decided, not built yet (week 2))

**Used for:** a notification on the family member's phone even when Scamly isn't open.

**Alternatives we considered:** Firebase Cloud Messaging (FCM) SDK, SMS, Viber/Telegram bots (stretch goal).

**Why this one:**
- **VAPID web push is an open web standard**; it works in Chrome, Firefox, Edge and Safari (iOS after home-screen install) without an extra account. (Chrome uses Google's push service underneath, but we don't need the Firebase SDK or a Firebase project.)
- **Free**, unlike SMS, which costs money per message.
- Our server signs messages with our own key pair (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`).

**What we give up:**
- iPhone support needs iOS 16.4+ and "Add to Home Screen" (risk R2), which is why Realtime is primary.
- Delivery isn't guaranteed (the phone may be offline or in battery-saving mode).

**We would reconsider if:** we built a native app (then FCM/APNs directly).

### Brevo free tier behind an `EmailProvider` interface  (status: decided (D5), not built yet (week 2))

**Used for:** alert emails to family members (third channel); possibly sign-up confirmation emails (Q8).

**Alternatives we considered:** Resend, SendGrid, Gmail SMTP, Supabase's built-in email, no email.

**Why this one:**
- **Brevo's free tier allows sending from one verified sender address, with no domain of our own** (we haven't bought a domain, Q13). There's a daily sending limit; check current limits.
- **Resend** is nice for developers but needs **our own domain** to send to other people.
- **SendGrid's** free offer has changed over time; we couldn't rely on a lasting free plan (check current terms).
- **Gmail SMTP** would mean putting a personal Google account's credentials on our server, with low sending limits and a risk of the account being blocked.
- **The interface** (`EmailProvider`, like a Python abstract base class) lets us switch Brevo → Resend → `noop` by changing one environment variable (`EMAIL_PROVIDER`).

**What we give up:**
- Emails from a single sender without our own domain are more likely to land in spam (risk R4).
- Another account with an API key to protect.

**We would reconsider if:** we buy a domain; then Resend (or Brevo with our domain) for better delivery.

---

## 6. AI layer (planned, week 3)

### Rule-based engine first, AI only as an optional second opinion  (status: decided (D6), not built yet (week 3) ✂ first to cut)

**Used for:** an AI model reads the (redacted) text and suggests the scam type and risk level.

**Alternatives we considered:** AI only (send everything to an LLM), rules only.

**Why this one:**
- **The rules always work**, even with no internet and no AI provider. The red "hang up" message never depends on a free API.
- **Explainable:** for the defense, we can show exactly why a call is red. An LLM's reasoning can't be tested the same way.
- **AI adds value on new wording** the dictionary doesn't know yet.
- It's the first thing we cut if late (D12), and the app is complete without it.

**What we give up:**
- Rules miss new scam scripts until someone adds keywords (the moderator script library helps).
- Two systems to test instead of one.

**We would reconsider if:** we had real labelled data and evidence that AI alone is more accurate (we don't).

### Gemini + Groq free tiers behind `ScamClassifier` / `ClassifierChain`  (status: decided (D6), not built yet (week 3))

**Used for:** calling AI providers in order (Gemini → Groq → rule engine), each with a timeout.

**Alternatives we considered:** paid OpenAI / Claude APIs, running an open model ourselves.

**Why this one:**
- **Budget:** both have free tiers (check current limits); paid APIs cost money per request (D11).
- **The chain always ends with the rule engine**, so a timeout, a rate limit or bad JSON just moves to the next provider. The user always gets an answer.
- **One interface** (`ScamClassifier`) means a new provider (or Alex's multi-model router) is one new class.
- AI answers are checked with a Zod schema, so a strange answer can't break anything.

**What we give up:**
- Free tiers have rate limits and can change their terms at any time (risk R6).
- **Free tiers may use our inputs** to improve their models, which is why we only send redacted text.
- AI text may have Bulgarian grammar mistakes, so it's shown only to family, labelled „Допълнителен анализ (ИИ)“.

**We would reconsider if:** the free tiers disappeared; then we'd turn the feature off with `FEATURE_AI` and keep the rules.

### AI can only raise the verdict, never lower it  (status: decided (brief 5.2 C, Q5), not built yet (week 3))

**Used for:** `combineVerdicts(rule, ai)`: AI may raise the level by at most one step (green → yellow, yellow → red), only when confident; it can never turn a red into anything else.

**Alternatives we considered:** averaging the two; trusting AI when it's confident.

**Why this one:**
- **A false "safe" is the worst possible bug** (D9). A hallucinating AI must never be able to calm someone down during a real scam.
- One step at most limits the damage from a single wrong AI answer.
- It has its own test, which is a strong defense point.

**What we give up:**
- If the rules are wrong in the "too strict" direction (false red), AI can't fix it.

**We would reconsider if:** never for lowering; the one-step limit could be tuned after testing.

---

## 7. Detection engine design

### Pure TypeScript function with weights + hard rules + stem/fuzzy matching  (status: decided, not built yet (week 1))

**Used for:** `analyseCall(input) → verdict`: the core "algorithm" of Scamly (BUILD_PLAN 4).

**Alternatives we considered:** a machine-learning model, a plain keyword list, an LLM only.

**Why this one:**
- **We have no training data.** An ML model needs thousands of labelled real scam calls in Bulgarian; nobody has published such a dataset for us, and we can't record calls (out of scope by design).
- **A plain keyword list is too weak:** it misses word forms (хвърлете / хвърли), шльокавица and typos, and it can't combine signals ("police" alone is fine; "police + money" is a scam).
- **Weights + hard rules are explainable:** every point in the score comes from a named reason, shown to the user in Bulgarian. Hard rules (D10) force red for combinations that are always scams.
- **Pure function** (no database, no network, no clock): easy to unit-test, and it can run on the phone too.
- **Engine as data:** weights in one table, stems in one dictionary, each hard rule one object. Adding a scam script = keywords + a rule + tests.

**What we give up:**
- The weights are set by us, not learned, so they reflect our judgement; we tune them with tests and the usability test.
- New wording needs new keywords (moderators can add some without code).

**We would reconsider if:** we collected enough real, labelled reports (e.g. from the public report form) to train and validate a model.

### Typed dictionary and scenario data (status: data in use; verdict runner pending)

**Used for:** `DICTIONARY` in `src/engine/dictionary.ts` and `SCENARIOS` in `src/engine/__tests__/scenarios.ts`.

**Alternatives we considered:** keywords embedded in scoring functions, an untyped JSON file, and a second temporary matcher built just for Roberta's tests.

**Why this one:**
- Shared `DictionaryEntry` and `EngineScenario` types catch spelling mistakes in category names before runtime, like checking a Python TypedDict.
- Bulgarian stems cover inflections; explicit spelling variants document Latin ambiguity and frequent errors. Ordered phrases keep words such as courier or account from independently becoming high-risk evidence.
- Legitimate calls and uncertain answers are recorded alongside scams so the final engine must demonstrate both detection and restraint.
- Data-contract tests check coverage and consistency without claiming that the absent engine has analysed the scenarios.

**What we give up:**
- Types and data checks cannot prove detection accuracy. Alex must connect the real runner and investigate failures with Roberta.
- Stem matching does not understand negation or quotations in general; hard-rule context and false-positive cases need careful review rather than more generic keywords.

**We would reconsider if:** real evaluated examples show that a stem is too broad or a phrase misses common wording; adjust the data together with regression scenarios.
### Damerau-Levenshtein distance for typos  (status: decided, not built yet (week 1))

**Used for:** matching words with typos to dictionary stems (`хварлете` ≈ `хвърл`).

**Alternatives we considered:** plain Levenshtein, exact matching only, a full spell-checker, phonetic algorithms (Soundex).

**Why this one:**
- Like Levenshtein, but **a swap of two neighbouring letters counts as one edit**, which is a very common typing mistake on small phone keyboards.
- Easy to explain and to code ourselves (a dynamic-programming table, like in a Python algorithms class).
- The tolerance depends on word length (0 edits for short stems), which avoids false matches.
- Soundex-style algorithms are designed for English names, not Bulgarian.

**What we give up:**
- It's slower than exact matching (fine: our texts are at most 2000 characters).
- Fuzzy matching can create rare false matches; we test for them.

**We would reconsider if:** tests showed too many false matches; then we'd tighten the tolerance.

### Own transliteration for шльокавица (Latin-script Bulgarian)  (status: decided, not built yet (week 1))

**Used for:** turning `politsiya`, `hvarlete parite ot terasata` and `ne ka6ete` into Cyrillic before matching.

**Alternatives we considered:** the official Bulgarian transliteration standard only, a library, separate Latin keyword lists.

**Why this one:**
- People type шльокавица in many ways (`sh`, `6`, `w`, `q` for я...), not by the official standard (which is meant for Cyrillic → Latin, the other direction).
- Our own rules (longest match first) are small, tested, and we can explain each one.
- One Cyrillic dictionary instead of two keyword lists to keep in sync.

**What we give up:**
- Some spellings are ambiguous (`a` for `ъ`, `y` for `ъ` or `й`); fuzzy matching covers part of that, not all.

**We would reconsider if:** we found a maintained library that handles real-world шльокавица better than our rules.

### The same engine on the phone as an offline fallback  (status: decided (Q6), not built yet (week 2))

**Used for:** if the network fails or takes more than 4 s, the phone shows the locally computed verdict and uploads later.

**Alternatives we considered:** server-only verdict; showing an error when offline.

**Why this one:**
- The red "hang up" message must never depend on Wi-Fi.
- It costs almost nothing because the engine is pure TypeScript with no dependencies.

**What we give up:**
- The engine code is visible in the browser (fine: it holds no secrets), and the server verdict stays the official one.

**We would reconsider if:** the engine needed secret data (it doesn't).

### Green verdict never says "safe"  (status: decided (D9), not built yet (week 1))

**Used for:** the green result text: „Няма типични признаци на измама. Ако се съмнявате, затворете и се обадете сами на близкия си...“, plus a "money floor" (a request for money is never green).

**Alternatives we considered:** "Safe ✓" / „Безопасно“.

**Why this one:**
- A false "safe" on a real scam would actively help the scammer. "No typical signs" is honest about what we can know.

**What we give up:**
- A slightly weaker feeling of reassurance for legitimate calls.

**We would reconsider if:** never.

### Shared type definitions + `as const` lists (vs plain strings / TS enums)  (status: in use (`src/engine/types.ts`))

**Used for:** one file with every engine type and value list (`CallInput`, `Verdict`, `SignalCategory`, `HardRuleId`...), written as `const X = [...] as const` with the type taken from it: `type RiskLevel = (typeof RISK_LEVELS)[number]`.

**Alternatives we considered:** plain `string` everywhere; TypeScript `enum`s; types written by hand next to each file that uses them.

**Why this one:**
- **Plain strings catch nothing:** `"polise"` would compile and silently never match. With literal types it's a compile error.
- **TS `enum`s** are a TypeScript-only feature that generates extra JavaScript and makes us write `RiskLevel.Red` while the database and JSON use `"red"`. A union of strings is exactly what PostgreSQL enums and JSON already hold, so no conversion is needed.
- **`as const` lists give us both** a type and a real list at runtime: a test reads the SQL schema and checks the lists are the same as the database enums, and the API can reuse them for validation later.
- **One shared file** lets Roberta write the dictionary and test cases (Session D) before the engine logic exists, and it has no imports, so it works on the server and on the phone.
- Easy to explain: it's like a Python `Literal[...]` built from a tuple.

**What we give up:**
- The lists are still copied by hand from the SQL (the test catches a difference; generated database types, W1-04, may replace part of this later).
- `(typeof X)[number]` looks strange at first; each one has a Python comment.

**We would reconsider if:** the generated Supabase types (`src/types/database.ts`) covered these enums well enough to import them in the engine without breaking the "no imports" rule.

---

## 8. Testing and quality

### Vitest 5 (5.1.0) + V8 coverage  (status: in use)

**Used for:** unit tests (engine, helpers, services), with a coverage report (`npm run test:coverage`).

**Alternatives we considered:** Jest, Node's built-in test runner.

**Why this one:**
- **Works with TypeScript and modern imports with no extra setup**; Jest needs extra transform configuration for this.
- The API (`describe`, `it`, `expect`) is the same as Jest's, so tutorials still apply. It feels like pytest.
- Fast watch mode (`npm run test:watch`) for working on the engine.
- Coverage via V8 (`@vitest/coverage-v8`) needs no code instrumentation.

**What we give up:**
- Jest has a longer history and more examples online.
- Vitest needs Vite (8.3.5) as a dev dependency.

**We would reconsider if:** a tool we need only supported Jest.

### Dependency-injected fakes in unit tests (vs `vi.mock`, vs a live Supabase)  (status: in use (`pairingService`, `authService`, `loadActor`, rate limiter))

**Used for:** testing the services without Supabase. Each service gets its tools as parameters (`PairingDeps`, `AuthGateway`, `ActorReader`, `HitCounter`); tests pass small in-memory fakes, e.g. arrays that behave like our tables and what RLS would show each caller.

**Alternatives we considered:** `vi.mock()` to replace imported modules; integration tests against a local or live Supabase (the plan's `tests/integration/`).

**Why this one:**
- **Plain to explain:** "the function gets its database as an argument" is like passing objects into a Python function. `vi.mock` rewrites imports behind the scenes, which is harder to defend and breaks silently when a file is renamed.
- **Fast and offline:** 92 tests in about a second, in CI and in the cloud session (which has no Docker for a local Supabase).
- The fake can test cases that are hard to create for real: an expired code, a failing step in the middle of redeem, 100 IPs.
- The real SQL rules are still proven for real, by pgTAP (151 assertions), and the whole flow once by a live smoke test.

**What we give up:**
- A fake can be wrong in a way the real Supabase isn't; the glue (`createPairingDeps`, repositories) is not unit-tested. That gap is why the live smoke test was run and why API e2e tests are planned (W2-11, W4-03).
- Slightly more code: each service needs a deps type and a real factory.

**We would reconsider if:** we got a reliable local Supabase in CI for API tests; then a few integration tests would cover the glue.

### Playwright (1.63.0) for end-to-end tests  (status: in use)

**Used for:** testing whole flows in a real browser, on a desktop Chrome and on a phone screen (Pixel 5), in CI.

**Alternatives we considered:** Cypress, Selenium.

**Why this one:**
- **Several browser contexts in one test:** our key test has grandma's phone press the button and the family's browser receive the alert. Cypress is built around one browser and one tab per test.
- **Phone emulation built in**, so every test also runs on a small Android screen.
- Waits automatically for elements, so tests are less flaky than with Selenium, which also needs more setup (drivers).
- Saves an HTML report and traces, useful as evidence for the jury.

**What we give up:**
- We only run Chromium in CI; Safari/WebKit and Firefox aren't tested (could be added later).
- Browser tests are slower than unit tests.

**We would reconsider if:** never for this project.

### pgTAP for database and RLS tests  (status: in use (8 test files))

**Used for:** proving in SQL that each role sees exactly the rows it should (`supabase/tests/*.test.sql`), including IDOR tests (family B can't see family A's data).

**Alternatives we considered:** testing RLS only through the app (integration tests), not testing RLS at all.

**Why this one:**
- **Tests the second lock on its own.** Testing only through the API can't tell whether RLS or our code blocked a request; pgTAP proves RLS works even if the API had a bug.
- Fast and exact: each test switches role and user id and counts rows.
- Runs in CI with the Supabase CLI (`supabase test db`).

**What we give up:**
- Another tool and test style to learn (SQL-based tests).
- They don't test our TypeScript code; we still need API integration tests.

**We would reconsider if:** never; RLS without tests is a guess.

### Local plain PostgreSQL + shim test runner (`npm run test:db`)  (status: in use)

**Used for:** running the migrations and pgTAP tests on a temporary local PostgreSQL **without Docker**, using `scripts/db/supabase-shim.sql` to fake the parts of Supabase we need (roles, `auth.uid()`, the Realtime publication).

**Alternatives we considered:** only `supabase start` (needs Docker); only running database tests in CI.

**Why this one:**
- **Supabase's local Docker images couldn't be pulled in our cloud coding session**, so we couldn't run `supabase start` there. The shim lets us run the database tests before every push anyway.
- **CI still uses real Supabase** (`supabase db start` + `supabase test db`), so the shim is never the only check.
- The shim is clearly marked "only for local tests, never on real Supabase".

**What we give up:**
- The shim is a fake: if it behaves differently from real Supabase, local tests could pass and CI fail.
- The local runner uses the newest installed PostgreSQL (16 in our session), while Supabase runs 17.

**We would reconsider if:** Docker images become available in the session; then we'd use `supabase start` everywhere.

### ESLint 9 + Prettier 3  (status: in use)

**Used for:** ESLint (9.39.5, with `eslint-config-next` 16.4.4) finds bugs and bad patterns; Prettier (3.9.10) formats code the same way for both of us; `eslint-config-prettier` stops them fighting.

**Alternatives we considered:** Biome (one tool for both), no linting.

**Why this one:**
- The Next.js rules (React hooks, Core Web Vitals) come ready-made for ESLint.
- "Code quality: standards, valid code" is scored, and CI fails on lint or format errors.
- No discussions about formatting between us; Prettier decides.

**What we give up:**
- Two tools and two config files; Biome would be faster and simpler.
- Our planning docs in `docs/` are excluded from Prettier and formatted by hand.

**We would reconsider if:** Biome fully supported the Next.js rules we rely on.

### Strict TypeScript (`strict` + `noUncheckedIndexedAccess`)  (status: in use)

**Used for:** the strictest useful type checking (`tsconfig.json`).

**Alternatives we considered:** default (non-strict) settings.

**Why this one:**
- `strict` forces us to handle `null`/`undefined`, the most common crash.
- `noUncheckedIndexedAccess` treats `list[0]` as "maybe missing", like getting `None` from `dict.get()` in Python. That's exactly the kind of bug that would crash the result screen.

**What we give up:**
- More type errors to fix, especially while Roberta is learning TypeScript.

**We would reconsider if:** never; we'd rather fix errors at build time.

### GitHub Actions for CI  (status: in use)

**Used for:** on every push to `main`: lint, type check, format check, unit tests with coverage, production build, Playwright tests, and database/RLS tests (`.github/workflows/ci.yml`).

**Alternatives we considered:** GitLab CI, Jenkins, CircleCI, no CI (just running checks locally).

**Why this one:**
- **Our code is on GitHub**, and Actions is built in and free for public repositories.
- Jenkins needs its own server running all the time; GitLab CI would mean moving or mirroring the repo.
- The green ✓ / red ✗ on each commit is visible evidence of "automated testing" and "use of version control" for the jury.
- **No CI is too risky with one shared branch** and no pull requests: CI is our safety net.
- Read-only permissions and cancelling outdated runs (`concurrency`) keep it safe and fast.

**What we give up:**
- CI runs after a push, so a broken commit can reach `main` before CI catches it (we run `npm run check` before pushing).
- The workflow uses the Supabase CLI's `latest` version and action tags (`@v4`), not exact versions, so a tool update could change CI behaviour.

**We would reconsider if:** we moved the repo away from GitHub.

---

## 9. Hosting and operations

### Vercel Hobby (free)  (status: decided, not built yet (week 1, W1-13))

**Used for:** hosting the Next.js app (pages + API) on the internet.

**Alternatives we considered:** Netlify, Render / Railway free tiers, our own VPS, a home computer.

**Why this one:**
- **Free, always on, no server to manage**, with automatic HTTPS and a deploy from every push.
- Made by the company behind Next.js, so new Next.js 16 features work without extra setup.
- **Render's free web services sleep when idle**, so the first request after a pause is slow; Railway's free offer is trial credit (check current terms). A sleeping site during judging would be a disaster.
- A VPS costs money and needs us to manage security updates; a home computer must stay on and exposes our home network.
- Netlify would also work, but Next.js support is most complete on Vercel.

**What we give up:**
- **Hobby limits:** cron jobs and function run time are limited (check current limits); Hobby is for personal, non-commercial use (fine for a student project; check current terms).
- Serverless functions can't hold WebSocket connections (Supabase Realtime handles that for us).
- We depend on Vercel; the flash-drive local build is our offline backup.

**We would reconsider if:** the app became a real service with users (then a paid plan or another host).

### Region Frankfurt (Supabase `eu-central-1`, Vercel `fra1`)  (status: decided, not built yet (week 1))

**Used for:** where our database and server functions run.

**Alternatives we considered:** the default US regions, other EU regions.

**Why this one:**
- **GDPR:** personal data of Bulgarian users stays in the EU.
- **Low latency to Bulgaria**, and the database and functions are in the same city, so each query is fast.

**What we give up:**
- Nothing important for us.

**We would reconsider if:** a Bulgarian or closer region became available on the free tier.

### Keep-alive cron against Supabase pausing  (status: decided, not built yet (week 1, W1-13))

**Used for:** a GitHub Actions scheduled job calls `/api/health` (which touches the database) every 12 hours, so the free Supabase project never pauses.

**Alternatives we considered:** Vercel cron, upgrading Supabase, hoping someone visits the site.

**Why this one:**
- The rules say the site must be online for the whole judging period (risk R1).
- GitHub Actions schedules are free and visible in the Actions tab.

**What we give up:**
- GitHub may delay scheduled runs, and it disables scheduled workflows in public repos after a long time without activity; we check the dashboard daily from 29.11 to 6.12.

**We would reconsider if:** Supabase changed its pausing rules (check current limits).

### External uptime monitor (e.g. UptimeRobot, free)  (status: decided, not built yet (week 4))

**Used for:** pinging `/api/health` every few minutes and emailing us if the site is down.

**Alternatives we considered:** checking by hand.

**Why this one:**
- We find out about downtime before the jury does; it also keeps the database active.

**What we give up:**
- One more free account.

**We would reconsider if:** never during the competition.

### `pg_cron` for frequent jobs  (status: decided, not built yet (week 3) ✂ stretch)

**Used for:** the escalation job (every minute: an alert nobody acknowledged → notify the next contact), using Supabase's `pg_cron` scheduler calling our secret-protected `/api/cron/escalate` endpoint.

**Alternatives we considered:** Vercel cron jobs, GitHub Actions schedules.

**Why this one:**
- **Vercel Hobby cron jobs run too rarely** for "every minute" (check current limits), and GitHub Actions schedules can be delayed by minutes.
- `pg_cron` runs inside our database, which is already always on.

**What we give up:**
- The job's schedule lives in the database, not in our code files, so we must record it in a migration.
- Calling HTTP from the database needs an extra extension (e.g. `pg_net`) and the cron secret stored safely.

**We would reconsider if:** we dropped the escalation feature (it's a stretch goal).

### Pinned exact dependency versions (`.npmrc save-exact=true` + `package-lock.json`)  (status: in use)

**Used for:** every package in `package.json` has an exact version (e.g. `"next": "16.4.4"`, not `"^16.4.4"`), and `npm ci` installs exactly the lock file.

**Alternatives we considered:** version ranges with `^` (npm's default).

**Why this one:**
- **The demo must behave the same on 6 December as on the day we tested it.** A surprise minor update could break the build the night before.
- Our laptops, the cloud session, CI and Vercel all install the same versions.
- Upgrades become deliberate commits, which we can test and record here.

**What we give up:**
- We don't get bug and security fixes automatically; we run `npm audit` and upgrade by hand (W4-01).

**We would reconsider if:** the project were maintained long-term (then automated update pull requests, e.g. Dependabot).

---

## 10. Project process and documentation

### One `main` branch, no pull requests  (status: in use (D13, Q16))

**Used for:** all commits go straight to `main`.

**Alternatives we considered:** feature branches + pull requests reviewed by the teammate (the brief's original plan, D3).

**Why this one:**
- Simpler for two people new to team git: no merge conflicts between long-lived branches, no stale PRs.
- Folders are split by owner (`IMPLEMENTATION_PLAN.md` section 1), so we rarely edit the same file.
- We pull before work, push after work, and never push red.

**What we give up:**
- **No review gate:** a mistake reaches `main` without the other person approving it. We compensate by **reading each other's commits on GitHub** and relying on CI.
- The jury may ask why we didn't use PRs; this is the honest answer.

**We would reconsider if:** a bad commit broke `main` badly, or the team grew beyond two.

### Commits authored only by the students  (status: in use (D13, Q3))

**Used for:** every commit carries Alex's or Roberta's name only, no co-author lines; only they push.

**Alternatives we considered:** co-author lines for the AI assistant (Claude or Codex); the assistant pushing by itself.

**Why this one:**
- The jury looks at the git history to see **who built what** (both authors must have meaningful commits).
- Each of us must be able to explain every commit with our name on it.

**What we give up:**
- The history doesn't show which parts were written with AI help (we say it openly in the defense instead; next entry).

**We would reconsider if:** the competition rules asked us to mark AI-assisted commits.

### AI coding assistants: Claude Code (Alex) and OpenAI Codex (Roberta)  (status: in use (D3, D21))

**Used for:** planning, writing code and tests, and explaining concepts. Alex uses **Claude Code** in a cloud session inside our GitHub repo; Roberta uses **OpenAI Codex** on her own computer.

**Alternatives we considered:** writing everything by hand; both of us on the same tool; other AI assistants.

**Why this one:**
- Two students, four weeks and a large scope: an assistant lets us build a complete, tested product.
- Each of us uses the tool we're comfortable with. Both tools follow the same rules file (`AGENTS.md`, next entry), so the result is the same either way.
- Both are set up to explain every piece in Python terms and write weekly learning notes (`docs/learning/`).
- The brief's rule: **if we can't explain it, it isn't built that way.**

**What we give up:**
- Risk of code we don't fully understand; we test each other by explaining the other's code out loud each week.
- Two tools behave a little differently (for example, Claude Code's cloud environment can ask to add AI attribution, which our rules say to ignore).
- Roberta works on her own computer, so her setup (Node.js 22, `.env.local`) must match the cloud, and `npm run test:db` only runs on Linux; on Windows or Mac CI's database job is the check.
- Dependence on the tools' availability.

**We would reconsider if:** we found we couldn't defend the code they produced, or one tool kept ignoring the rules.

### Shared rules in `AGENTS.md` (vs separate rule files per tool)  (status: in use (D21))

**Used for:** one file with all project rules (git, docs, ownership, code style, safety) that every AI agent reads first.

**Alternatives we considered:** separate files per tool (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex) with the same rules copied into both; rules only in our heads.

**Why this one:**
- Codex reads `AGENTS.md`; Claude Code reads `CLAUDE.md`, which can import another file with the line `@AGENTS.md`. So one file serves both tools.
- One copy of the rules can't drift apart: a rule changed once is changed for both of us.
- Next.js 16 already writes a small managed block into `AGENTS.md` and keeps the rest of the file, so our rules can live below it safely.

**What we give up:**
- The file has a Next.js block at the top that we must not edit by hand.
- If a tool ever stopped reading `AGENTS.md` (or `@` imports), we'd need to notice and fix it.

**We would reconsider if:** a tool needed rules the other must not see, or Next.js stopped keeping our text below its block.

### GPL-3.0-only licence  (status: in use)

**Used for:** the licence of Scamly (`LICENSE`, `package.json`).

**Alternatives we considered:** MIT, GPL-3.0-or-later.

**Why this one:**
- **The competition requires GNU GPL** for the product given to the education system.
- `-only` means exactly the GPL version 3 text we've read, not future versions we don't know yet.
- All our dependencies use licences compatible with GPL-3.0 (MIT, Apache-2.0, BSD, LGPL), tracked in `THIRD_PARTY_LICENSES.md`.

**What we give up:**
- Anyone who distributes a changed version must also share their source under GPL; some companies avoid GPL code.
- `-only` can't move to a future GPL version without all authors agreeing.

**We would reconsider if:** never for the competition (it's required).

### English code + Bulgarian UI in one `bg.ts` file  (status: in use)

**Used for:** code, comments and docs in English; every user-visible text in `src/i18n/bg.ts`; the page is marked `lang="bg"`.

**Alternatives we considered:** Bulgarian in the code; text written directly in each screen; an i18n library (e.g. next-intl).

**Why this one:**
- **Correct Bulgarian is scored:** one file can be proofread by us and a Bulgarian teacher in one sitting (W4-06).
- English code matches every library, error message and tutorial.
- A second language later (e.g. `tr.ts`) is a new file with the same shape.
- An i18n library adds routing and setup we don't need for one language.
- Pages people type by hand get transliterated Bulgarian paths (`/svarzhi`); the rest stays English.

**What we give up:**
- Screens are a bit harder to read in code (`bg.check.title` instead of the text itself).
- No plural rules or formatting helpers from an i18n library; we write those ourselves where needed.

**We would reconsider if:** we added two or more languages; then a proper i18n library.

### Markdown docs in the repo  (status: in use)

**Used for:** the brief, plans, ideas, change log, this file, ADRs (`docs/decisions/`, week 1) and learning notes, with Mermaid diagrams.

**Alternatives we considered:** Google Docs, Notion, a wiki.

**Why this one:**
- Docs change in the same commit as the code they describe, so they stay true, and git shows who changed what.
- GitHub shows Markdown and Mermaid diagrams nicely, and the jury can read them next to the code.
- Free, no extra accounts.
- ADR 0005 records the existing D7 alert-channel decision, including alternatives and tradeoffs; the Week 1 learning note provides Python comparisons and practice questions. Writing these documents does not mean notification delivery or the human check-in is complete.

**What we give up:**
- The official 5-page documentation still has to be a `.docx`/PDF in Times New Roman (we'll write it from these files in week 5).
- Less comfortable for comments and live co-editing than Google Docs.

**We would reconsider if:** we needed non-technical people to edit the docs.

### Rolling weekly planning  (status: in use (D16))

**Used for:** only the current week is planned in detail; the next week is planned on its first day. The plan may change at any time (`IMPLEMENTATION_PLAN.md` section 2, `CHANGES.md`).

**Alternatives we considered:** planning all five weeks in detail up front; no plan.

**Why this one:**
- We learn every week (what's slow, what's easy), so detailed long plans get thrown away.
- The cut order (D12) tells us what to drop if late, so the important parts never slip.

**What we give up:**
- Less certainty about what weeks 3–5 will look like in detail.

**We would reconsider if:** we fell behind repeatedly; then a stricter fixed plan with a teacher checking it.

### Feature switches in environment variables  (status: in use (`src/config/features.ts`))

**Used for:** turning optional features (AI, voice, escalation, push, email) on or off with `FEATURE_*` variables, without code changes.

**Alternatives we considered:** a feature-flag service (e.g. LaunchDarkly), deleting code to cut a feature.

**Why this one:**
- Cutting a feature per D12, or turning AI off for the demo, is one variable on Vercel.
- A small, tested function; no extra service or account.

**What we give up:**
- Changing a switch needs a redeploy (Vercel environment changes apply to new deployments).

**We would reconsider if:** we needed to change switches per user or instantly.

---

## 11. Small configuration choices

### `next typegen` in `npm run typecheck`  (status: in use)

**Used for:** `typecheck` runs `next typegen && tsc --noEmit`. `next typegen` generates Next.js route types (e.g. `PageProps`, `RouteContext`) before TypeScript checks the code.

**Alternatives we considered:** plain `tsc --noEmit` (fails on a fresh clone because the generated types don't exist yet); running `next build` to get the types (slow).

**Why this one:**
- The type check works on a fresh clone and in CI without building the app first.

**What we give up:**
- The type check takes a little longer.

**We would reconsider if:** Next.js stopped needing generated types.

### `cacheComponents: true` (+ `partialPrefetching`)  (status: in use (`next.config.ts`))

**Used for:** Next.js 16's Cache Components mode: pages are pre-rendered where possible, and we choose explicitly what to cache with `"use cache"`. The Next.js docs recommend turning on `partialPrefetching` with it.

**Alternatives we considered:** the older default caching behaviour.

**Why this one:**
- It's the current recommended Next.js 16 setup, so we don't build on a model that's being replaced.
- Caching is **explicit**: nothing personal is cached by accident unless we write `"use cache"`.
- Fast first load of static parts (landing page, education cards) on slow phones.

**What we give up:**
- Newer than most guides; data loading must follow its rules (dynamic data inside `<Suspense>`), which we must learn.

**We would reconsider if:** it caused bugs we couldn't explain in the defense.

### Turbopack with the `@tailwindcss/turbopack` plugin  (status: in use)

**Used for:** Turbopack is Next.js 16's default bundler; Tailwind CSS is processed by its own Turbopack plugin (4.3.4), as set by `create-next-app` for Next.js 16.4.

**Alternatives we considered:** webpack; Tailwind through PostCSS.

**Why this one:**
- It's the default, so it's the best-tested path for our Next.js version, and builds are fast.

**What we give up:**
- Fewer plugins than webpack (we don't need any others).

**We would reconsider if:** a library we need only works with webpack.

### `proxy.ts` instead of `middleware.ts` for route guards  (status: in use (Session E); CSP nonce: week 4)

**Used for:** refreshing the session and sending logged-out visitors to the login or pairing page (roles are checked in server code, section 3); later the CSP nonce. The build plan calls it `middleware.ts`; in Next.js 16 that file name is deprecated and renamed to `proxy.ts`.

**Alternatives we considered:** the old `middleware.ts` name.

**Why this one:**
- Follows the Next.js 16 docs and avoids a deprecation warning.

**What we give up:**
- Most tutorials still say "middleware".

**We would reconsider if:** never; we follow the framework's current convention.

### npm as the package manager  (status: in use)

**Used for:** installing packages; `npm ci` in CI and for setup.

**Alternatives we considered:** pnpm, yarn, Bun.

**Why this one:**
- Comes with Node.js, nothing extra to install, the default in every tutorial and on Vercel.
- Clean installs use `npm ci`. During W1-11 setup it rejected a missing optional Oxide WebAssembly lockfile entry, so `npm install` repaired the lockfile rather than replacing pinned package versions or changing package managers. An offline npm ci dry run now accepts the repaired lockfile.

**What we give up:**
- Slower installs and more disk use than pnpm.

**We would reconsider if:** installs became a bottleneck.

### EditorConfig + `.nvmrc`  (status: in use)

**Used for:** the same basic editor settings (UTF-8, LF line endings, 2-space indent) and the same Node version for both of us.

**Alternatives we considered:** each person's own editor settings.

**Why this one:**
- UTF-8 matters for Cyrillic text; LF line endings avoid noisy diffs between Windows and Linux.

**What we give up:**
- Nothing.

**We would reconsider if:** never.

### Environment variables checked with Zod at startup (`src/lib/env.ts`)  (status: in use)

**Used for:** a missing or wrong secret gives a clear error naming the variable (never its value), instead of a strange crash later.

**Alternatives we considered:** reading `process.env` directly everywhere.

**Why this one:**
- Easier debugging of deployment mistakes; secrets are checked only on the server.
- `.env.example` documents every variable, with no real values (secrets never go into git).

**What we give up:**
- One more file to update when a variable is added.

**We would reconsider if:** never.

### `server-only` (0.0.1) marker package  (status: in use)

**Used for:** the first line of every file under `src/server/` that must never reach the browser (admin client, services, auth checks). If a client component imports one, `next build` fails.

**Alternatives we considered:** relying on care and code review; a lint rule.

**Why this one:**
- The service-role key bypasses RLS; leaking it into a phone's JavaScript would undo all our security. A build error is safer than discipline.
- It is the method the Next.js docs recommend, one tiny package (MIT).

**What we give up:**
- Tests need an alias to its empty version (`vitest.config.mts`), and the proxy can't import it (so `cookieOptions.ts` has no marker).

**We would reconsider if:** Next.js built the same check in.

### App name in one constant (`APP_NAME`)  (status: in use (D15))

**Used for:** the name "Scamly" appears in one place (`src/config/app.ts`).

**Alternatives we considered:** writing the name in each page.

**Why this one:**
- An existing company app uses the same name (D15). If we must rename, it's a one-line change.

**What we give up:**
- Nothing.

**We would reconsider if:** never.

---

## 12. How to add an entry

When you use, add, change or remove anything (a package, a service, a tool or an important design choice), update this file **in the same commit** (D19):

1. Add or edit the entry in the right section, using the template below.
2. Use the exact version from `package.json` if it's a package.
3. Update the status when something moves from "decided" to "in use", or mark it "removed (date, reason)" instead of deleting the entry, so the history of the decision stays.
4. Update "Last updated" at the top and add a line to the change history below.
5. If it's a new library, also update `THIRD_PARTY_LICENSES.md`.

```
### <What we use>  (status: in use / decided, not built yet (week N))

**Used for:** one line

**Alternatives we considered:** list

**Why this one:**
- 3–6 bullets, tied to OUR constraints (free, 2 students, 4 weeks, jury criteria, security,
  older users on cheap Android phones, Bulgarian UI)

**What we give up:**
- 1–3 honest bullets

**We would reconsider if:** one line
```

If you're not sure about a free-tier limit or a price, don't write a number: write "free tier; check current limits".

---

## 13. Change history

- 2026-11-03 · created
- 2026-11-03 · AI assistants entry now covers Claude Code (Alex) and Codex (Roberta); new entry: shared rules in `AGENTS.md` (D21)
- 2026-11-03 · design-system entry is now implemented: native controls, accessible sizing, textual verdicts, theme persistence and both-theme preview; npm run check passes, browser verification remains blocked by a local Turbopack CSS-worker crash. Documented the npm lockfile repair for the missing optional Oxide WebAssembly entry.
- 2026-11-03 · new entry in section 7: shared type definitions + `as const` lists (vs plain strings / TS enums), `src/engine/types.ts`

- 2026-11-03 · W1-11 browser verification completed; documented explicit theme labels and the sandbox loopback restriction instead of changing the working build configuration.

- 2026-11-03 · documented typed dictionary/scenario data, contextual high-risk phrases and why data checks do not replace verdict execution tests.

- 2026-11-03 · added ADR 0005 and Week 1 learning material as reviewable repo documents; kept planned feature delivery separate from documentation completion.
- 2026-11-03 · Session E (auth + pairing backend): new entries generated DB types (postgres-meta), `.invalid` device e-mails, auth through our API, HttpOnly cookies with three clients (replaces "Session in HttpOnly cookies"), proxy checks login only, same-origin check (split from the CSP entry), dependency-injected fakes, `server-only`; rate limiting entry now covers HMAC'd IPs, fail-closed and our login/register limits; statuses moved to "in use" for REST API, layers, Supabase Auth, Supabase JS client + `@supabase/ssr`, two locks, server-only writes, HMAC, device pairing, Zod, `proxy.ts`

- 2026-11-03 · documented the designed auth forms, shared Zod validation, accessible error handling, duplicate-request guard and explicit QR pairing action.
