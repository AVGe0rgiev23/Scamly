# Scamly: why we chose what we chose

> **Rule (decision D19): this file is updated in the same commit every time anything is used, added, changed or removed** (a library, a service, a tool, or an important design choice). If a commit adds a package to `package.json` and this file doesn't change, the commit isn't finished.
>
> Last updated: 2026-11-10

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
3. [Security design](#3-security-design): two locks (RLS + API) · server-only writes · HMAC pairing codes · device pairing · `.invalid` device e-mails · Postgres rate limiting · Zod · auth through our API · HttpOnly cookies + three clients · proxy checks login only · same-origin check · CSP · personal-data redaction (regex + Luhn vs an NLP library) · server-side verdict · redact before storing · Realtime token endpoint · contact list through one SQL function (SECURITY INVOKER) · invite tokens · refusals don't burn invites · invite page (token sent at once, `replaceState`, `no-referrer`) · safe `next` redirect · push endpoint allowlist · push upsert = delete + insert · silent honeypot (vs an error, vs a CAPTCHA) · caller number only as an HMAC · off-screen honeypot field · compare-and-set role change · admins can't change their own role · allow-listed audit summary
4. [Frontend](#4-frontend): Tailwind CSS 4 · own design system · shared root layout for header and footer · compact theme switch in the header · home page that explains the 3 steps · family dashboard: Client Components that call our API · ↑ / ↓ buttons for the contact order · `qrcode` in the browser · system fonts · `useSyncExternalStore` for `?check=` · Web Audio alert beep · PWA · manifest via the Next.js file convention · own generated icons · offline card only on failed page loads · Leaflet without base tiles · Natural Earth district shapes · Web Speech API · one sentence per tap · `FEATURE_VOICE` at request time · native select and date input on the report form · hand-made bar charts (vs Recharts) · one-click approve vs a reject window · quick-pick reject reasons · count-only repeat-number badge
5. [Notifications](#5-notifications): Supabase Realtime · `AlertChannel` interface · Realtime as a doorbell + polling fallback · 10 s safety poll while connected · one Realtime channel for all people · own Realtime client with `accessToken` · `Promise.all` sends · Web Push (VAPID) through `web-push` · VAPID public key from a route · 1.5 s cap on the push unsubscribe at logout · Brevo behind `EmailProvider` · plain `fetch` for Brevo · Resend as a stub · no row when nothing was sent
6. [AI layer (planned, week 3)](#6-ai-layer-planned-week-3): rules first + optional AI · Gemini + Groq chain · AI can only raise the verdict
7. [Detection engine design](#7-detection-engine-design): pure TypeScript rules · deterministic pure function · prefix stems vs a full stemmer · Damerau-Levenshtein · шльокавица transliteration · transliterate-then-fuzzy vs a Latin dictionary · weights table + max per category · hard rules as data objects · offline fallback · green never says "safe" · shared types + `as const` lists · rolling 7/28-day windows for scam waves · admin statistics counted in TypeScript (vs a SQL function)
8. [Testing and quality](#8-testing-and-quality): Vitest · Playwright · preview pages for browser tests · pgTAP · local Postgres + shim runner · dependency-injected fakes · ESLint + Prettier · strict TypeScript · GitHub Actions
9. [Hosting and operations](#9-hosting-and-operations): Vercel Hobby · Frankfurt region · health check on a public table (publishable key vs service-role key) · keep-alive (GitHub Actions vs Vercel cron vs only an uptime monitor) · cookie-less public client + 60 s CDN cache for the map · `pg_cron` · uptime monitor · pinned versions
10. [Project process and documentation](#10-project-process-and-documentation): one `main` branch · student-only commits · Claude Code + Codex · shared `AGENTS.md` rules · GPL-3.0 · English code + Bulgarian UI · Markdown docs · rolling planning · feature switches
11. [Small configuration choices](#11-small-configuration-choices): `next typegen` · `cacheComponents` · `.npmrc save-exact` · Turbopack · `proxy.ts` · npm · EditorConfig · env check with Zod · `.catch()` fallback for optional env vars · `APP_NAME` constant · `server-only`
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

### REST API with route handlers  (status: in use (auth, me, persons, pairing, devices, checks, realtime token, contacts, invites); the rest: week 2–3)

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

### Supabase (PostgreSQL 17, Auth, Realtime, RLS), free tier  (status: in use (schema, RLS, functions, Auth, Realtime since W2-03))

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

### Server-only writes for sensitive tables  (status: in use (no client write policies; the server writes `devices`, `pairing_codes`, `audit_log`, `rate_limits`, `checks`, `alerts`, `contact_invites`, and `reports` since W3-01))

**Used for:** `checks`, `alerts`, `reports`, `devices`, `pairing_codes`, `audit_log`, `rate_limits` have **no INSERT/UPDATE policy** for browsers; only our server (service role) writes them, after checking permissions.

**Alternatives we considered:** letting the browser write with RLS rules.

**Why this one:**
- **The phone must not send its own verdict.** The server runs the engine and stores the result; a modified phone can't write "green".
- Guests can't skip our rate limiter or honeypot by calling the database directly. **`reports` has no INSERT policy for `anon` at all:** with one, a bot could post straight to Supabase with the public key and skip the limits, the honeypot and the redaction. `POST /api/reports` stores with the service role only after all its checks (W3-01).
- The service role (which bypasses RLS) is used only in a short, listed set of functions (BUILD_PLAN 2.4), each with tests.

**What we give up:**
- The service-role key is powerful; if it leaked, RLS wouldn't help. It lives only in server environment variables.
- More API code than "just insert from the browser".

**We would reconsider if:** never for these tables.

### HMAC-SHA256 with a secret pepper for pairing codes  (status: in use (pairing codes, invite tokens, IP addresses in the rate limiter, caller numbers of public reports since W3-01))

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

### Rate limiting in PostgreSQL, with HMAC'd IP addresses  (status: in use (login, register, pairing, invite links, call checks per phone, push subscriptions per account, public reports since W3-01))

**Used for:** limiting login (10 per 15 min per IP), registration (5 per hour per IP) and pairing-code guesses (5 per 15 min per IP + 100 per 15 min for everybody), and public reports (3 per hour per IP + 100 stored per hour for everybody). TypeScript wrapper: `src/server/security/rateLimit.ts`.

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

### `redactPersonalData()` with regular expressions + the Luhn check (vs an NLP library)  (status: in use (`src/engine/redact.ts`); called by the checks API since W2-02)

**Used for:** removing phone numbers, emails, IBANs, card numbers, ЕГН and known names from free text before it's saved or sent to AI.

**Alternatives we considered:** storing the raw text; asking users not to type personal data; a named-entity-recognition (NLP) library or an online PII-detection service.

**Why this one:**
- GDPR data minimisation: we don't need these details to detect a scam.
- Free AI tiers may use inputs for training, so personal data must never reach them.
- It's a pure, unit-tested function; each pattern has tests.
- **Regular expressions + Luhn instead of an NLP library:** the data we must remove has a fixed *shape* (Bulgarian phone formats, IBAN, 13–19 digit cards with a check digit, 10-digit ЕГН), which a pattern finds exactly. NLP name-recognition libraries are large, mostly English, would have to run on the phone too, and still miss names; but we already *know* the names that matter (the protected person and their contacts), so we pass them in as `knownNames`. An online service would send the very data we want to protect to a third party.
- The Luhn check stops us from marking any long number as a card; dates, amounts and short numbers stay readable (tested).

**What we give up:**
- Some useful detail is lost (e.g. the exact number a scammer gave), and patterns can miss unusual formats (e.g. a phone number written in words, or a name we don't know).
- Any 10-digit number becomes `[ЕГН]` even if it isn't one: we prefer removing too much.

**We would reconsider if:** never; we'd only extend the patterns.

### Server-side verdict: the phone sends only answers  (status: in use (`checkService.submitAnswers()`, W2-02))

**Used for:** `PUT /api/checks/:id/answers` takes the older person's answers and text; the server runs `analyseCall()` and stores the verdict with the service role (HOW_IT_WORKS 3.23).

**Alternatives we considered:** the phone computes the verdict and sends it (it has the same engine for the offline fallback); a database trigger that computes the verdict on insert.

**Why this one:**
- **The phone could lie.** A modified phone, or a scammer talking grandma through the browser's tools, could send "green". The family must see a verdict nobody outside our server could change. Zod drops any `riskLevel`/`score` key, and the database has no browser write right on `checks` at all.
- **A database trigger can't run our engine:** the engine is TypeScript (fuzzy matching, transliteration, hard rules as data). Rewriting it in PL/pgSQL would give two engines to keep identical, and it must also run on the phone offline.
- The engine is a deterministic pure function, so the server's verdict and the phone's offline fallback are the same for the same input.

**What we give up:**
- One more round trip before grandma sees the verdict online (the offline fallback covers no network).
- The server is a single place that must be up; Vercel + keep-alive cover that.

**We would reconsider if:** never for the stored verdict.

### Redact personal data before storing the call text  (status: in use (`checkService.submitAnswers()`, W2-02))

**Used for:** the engine reads the original words in memory; only `redactPersonalData(text, knownNames)` (known names = the person + their contacts), cut to 2000 characters, reaches `checks.text_redacted`.

**Alternatives we considered:** storing the original and redacting when showing it; storing no text at all; redacting on the phone before sending.

**Why this one:**
- **GDPR data minimisation:** what is never stored can't leak, be exported by mistake or be sent to an AI later (Week 3).
- Redacting only when showing would keep the raw data in the database and in every backup.
- No text at all would lose the evidence the family (and the moderators' statistics) need.
- The engine still sees the full words, so the verdict is not weakened; redacting on the phone would let a modified phone skip it.
- The cut to 2000 is needed because a label can be longer than the name it replaces.

**What we give up:**
- The caller's exact phone number or IBAN is gone (useful for a police report; the family can still ask grandma).
- Names we don't know (a neighbour not in the list) stay in the text.

**We would reconsider if:** never; we would only extend what counts as personal data.

### Realtime token endpoint (vs readable session cookies)  (status: in use (`GET /api/realtime/token`, W2-03))

**Used for:** giving the browser the user's short-lived access token so Supabase Realtime (which runs in the browser) can apply RLS to this user (HOW_IT_WORKS 3.25).

**Alternatives we considered:** `@supabase/ssr`'s default cookies, which page JavaScript can read; no Realtime, only polling; a separate Realtime-only token signed by us.

**Why this one:**
- **Only the access token reaches the page, for about 1 hour.** The refresh token, which keeps a session alive for weeks, stays in the HttpOnly cookie. With readable cookies an XSS bug could steal both.
- The endpoint checks the caller with the Auth server (`getUser()`), requires the cookie session to belong to the same account, answers `no-store`, and refuses a request another site started even though it is a GET.
- Only polling would mean a 5 s delay every time and more load; the demo needs the alert in under 3 s.
- Signing our own tokens would need the project's JWT secret on our server and more code to defend.

**What we give up:**
- During that hour an XSS bug could read the access token and call Supabase as the user (still limited by RLS). The CSP (W4-01) is the next layer.
- One more request when a live page opens and about once an hour after.

**We would reconsider if:** Supabase Realtime could authenticate from HttpOnly cookies directly.

### Contact list through one SQL function, `SECURITY INVOKER`  (status: in use (`replace_trusted_contacts()`, migration `20261104000002`; not yet applied in the live project))

**Used for:** `PUT /api/persons/:id/contacts` saves the whole ordered list (rename, phones, swap places, add, remove) in one call and one transaction (HOW_IT_WORKS 3.27, 5.14).

**Alternatives we considered:** several REST calls in a "safe" order (delete, update one by one, insert); an upsert by `id`; giving browsers more column rights; the same function as `SECURITY DEFINER`; doing it with the service role.

**Why this one:**
- **All or nothing:** one transaction, so a failure never leaves half a list.
- **Swaps work even with all 5 places full:** the "one contact per place" rule is DEFERRABLE and checked at the end of a statement, and the function moves every row in **one** UPDATE. One-by-one updates clash in the middle (two contacts on place 1), and there is no free place to park one.
- **An upsert** would need INSERT rights on the `id` column; **more column rights** would weaken the rule that browsers can never set `user_id`.
- **`SECURITY INVOKER`:** RLS (owner only) and the column privileges still apply inside the function, so `user_id` can't be set or changed through it. `SECURITY DEFINER` (or the service role) would bypass RLS and make our own checks the only guard.
- The function also checks the owner, keeps the owner's row and refuses foreign ids itself, so even a direct call from a browser can't break the list. 20 pgTAP tests.

**What we give up:**
- A migration and some PL/pgSQL to explain, instead of only TypeScript.
- The function had to be added to `src/types/database.ts` by hand (in the generator's format) until the types are generated again.
- It must be run in the live project's SQL Editor before the endpoint works there.

**We would reconsider if:** PostgREST let one request update different rows with different values.

### Invite tokens: 256 random bits, HMAC with `PAIRING_PEPPER`, 7 days, single use  (status: in use (`inviteService.ts`, W2-08))

**Used for:** the link `/pokana?t=<token>` that lets another relative join a person's contact list with their own account (HOW_IT_WORKS 3.28).

**Alternatives we considered:** a 6-digit code like pairing; storing the token in plain text; a reusable link; a shorter lifetime; a new environment variable for the pepper.

**Why this one:**
- **The link travels through Viber, SMS or e-mail and may be opened days later**, so it must live longer than a 10-minute code. That is only safe if it can't be guessed: 32 random bytes (43 URL-safe characters) make guessing hopeless even without the rate limit (which we still have: 10 per 15 min per IP).
- **Only the HMAC is stored**, as with pairing codes: a leaked database doesn't contain working links.
- **Single use through one atomic UPDATE**, and the same 400 for wrong, expired and used, so nothing is revealed.
- `PAIRING_PEPPER` is already the secret for "codes that let someone join a protected person"; no new variable to set in Vercel.

**What we give up:**
- The token is in the URL, so it can land in the browser history or a `Referer` header. The page `/pokana` (W2-14) POSTs it at once, removes it from the address and sets `Referrer-Policy: no-referrer` (entry below).
- Whoever gets the link first (e.g. a forwarded message) joins; the owner sees the new contact in the list and can remove them.

**We would reconsider if:** relatives had to join without an account (then a different flow).

### Refusals don't burn invites (check first, then use up; give back on failure)  (status: in use (`redeemInvite()`, W2-08))

**Used for:** redeeming an invite checks "own invite", "already in the list" and "a free place" **before** the atomic UPDATE that uses it up; if adding the contact then fails, `releaseInvite()` makes the link work again.

**Alternatives we considered:** use the invite up first and then check (the pattern pairing uses).

**Why this one:**
- **A mistake shouldn't cost a new link:** the owner tapping their own link, or a relative who is already listed, gets a clear 409 and the invite still works for the right person.
- A race (two people at once, or a place taken at the same moment) is still safe: only one UPDATE can use the invite, and the unique rules on `trusted_contacts` refuse a double place or account.
- Giving back only works if the invite still carries **our** `used_at` time, so we never re-open an invite someone else used.

**What we give up:**
- A few more steps than "use up, then check", and two more tests to explain.

**We would reconsider if:** never; pairing doesn't need it because a refused code there is simply asked for again in a minute.

### Invite page: send the token at once, remove it with `replaceState`, `no-referrer`  (status: in use (`/pokana`, `InviteAccept.tsx`, W2-14))

**Used for:** the page `/pokana?t=<token>` (HOW_IT_WORKS 3.37). A logged-in family member's browser POSTs the token to `/api/invites/redeem` as soon as the page opens, then calls `history.replaceState(null, "", "/pokana")`; the page answers with `Referrer-Policy: no-referrer` (header in `next.config.ts` plus a `<meta name="referrer">`).

**Alternatives we considered:** a „Приеми поканата“ button the person must press; keeping the token in the address; a server-side redirect after redeeming (POST → 303 to a clean URL); the default referrer policy; a `GET /api/invites/:token` lookup so the page could say „Мария ви кани…“ before redeeming.

**Why this one:**
- **The address is the weak spot of a link token:** it stays in the address bar, in screenshots and in bookmarks, and with the default policy the full address can be sent as `Referer` to the next page. Removing it right after use and sending no `Referer` closes both.
- **`replaceState` changes the address without loading the page again**, so the success message stays on screen; a server redirect would need a form POST and a second page.
- **No extra button:** opening the link already means "I accept"; refusals (own invite, already listed, no place) don't burn the invite (see above), so nothing is lost by sending at once.
- **No lookup endpoint:** a page that shows whose invite it is before redeeming would let anyone with a forwarded link learn the older person's name. The API reveals the name only to the family member who redeems.

**What we give up:**
- The entry the person first opened (`/pokana?t=…`) stays in the browser's history list; a page can't delete history entries. After redeeming, that token is used up and worthless.
- A guest keeps the token in the address until they log in (they need it to come back).

**We would reconsider if:** invites became reusable or long-lived; then a one-time short code typed by hand would be safer.

### Safe `next` redirect after login (vs an open redirect, vs no redirect)  (status: in use (`safeNextPath()` in `src/config/routes.ts`, W2-14))

**Used for:** „Вход“ / „Регистрация“ on the invite page link to `/vhod?next=/pokana?t=…`; after login the form opens `next` instead of the role's home page.

**Alternatives we considered:** use `next` as it is (open redirect); no `next` at all (the person opens the invite link again after login); keep the invite in `sessionStorage`; an allowlist of exact pages.

**Why this one:**
- **An open redirect is a gift to scammers:** a real Scamly link `…/vhod?next=https://fake-bank.example` would look trustworthy and then send the person to a fake page. `safeNextPath()` accepts only a path on our site: it must start with one `/` (not `//`, which browsers read as "another site"), contain no `\` and no control characters (browsers drop a tab or new line, so `/<tab>/evil` would become `//evil`), be at most 512 characters, and, read as an address on our site, must stay on our site. Anything else → the normal home page of the role.
- **Fewer steps for a relative:** log in once and the invite is accepted.
- A rule ("same-site path") is simpler than an allowlist that has to grow with every page.

**What we give up:**
- After registration with e-mail confirmation the person must open the invite link again (the confirmation link is Supabase's); the form says so.

**We would reconsider if:** we added more `next` sources; then a short allowlist of areas could be safer still.

### Push endpoint allowlist (vs accepting any `https` URL)  (status: in use (`isAllowedPushEndpoint()` in `src/schemas/push.ts`, W2-05))

**Used for:** `POST /api/push/subscriptions` accepts an endpoint only if it is `https`, port 443, without user/password, on `fcm.googleapis.com`, `push.services.mozilla.com`, `push.apple.com` or `notify.windows.com` (or a sub-domain of one).

**Alternatives we considered:** any `https` URL (what the browser sends is normally fine); blocking only private IP ranges.

**Why this one:**
- **The server later POSTs to the stored endpoint.** Without a check, any logged-in user could store any address and make our server send requests there (SSRF), e.g. to internal services or as a weapon against another site.
- An allowlist of four known hosts is short, easy to test (`schemas/push.test.ts`, look-alike hosts included) and easy to explain; a private-IP blocklist misses DNS tricks.
- These four services cover every browser we support (Chrome/Samsung/Opera/Brave, Firefox, Safari, Edge).

**What we give up:**
- A browser with another push service can't subscribe until we add its host.

**We would reconsider if:** a supported browser used a new push host; then one line in `PUSH_SERVICE_HOSTS`.

### Push subscription upsert = delete own row + insert (vs an UPDATE grant)  (status: in use (`pushSubscriptionService.saveSubscription()`, W2-05))

**Used for:** saving the same browser again (new keys after a key change) deletes the caller's row for that endpoint and inserts it again, both with the **user** client under RLS.

**Alternatives we considered:** a new migration with an UPDATE right (or a real `upsert`) on `push_subscriptions`; the service role for the write.

**Why this one:**
- The table already has the rights it needs (SELECT/INSERT/DELETE own rows); no migration, no new right to test, and RLS stays the second lock.
- `user_id` comes only from the session; the browser can't choose it.
- If the endpoint belongs to **another** account (a shared browser), RLS hides that row, the insert hits the unique endpoint and we answer 409; `subscribeToPush()` then makes a fresh subscription (a new endpoint) and retries once, so the new person still gets push.

**What we give up:**
- Two statements instead of one: between them the browser has no row for a moment (harmless, an alert in that millisecond just finds no subscription).
- The old account's row for that endpoint stays until the push service calls it gone (404/410) and the channel deletes it.

**We would reconsider if:** subscriptions changed often enough that the two steps mattered.

### Honeypot: a silent 201 (vs an error, vs a CAPTCHA)  (status: in use (`website` field, `reportService.submitReport()`, W3-01))

**Used for:** stopping simple bots on the public report form. The form has a field `website` hidden from people; if it arrives filled in, the API answers exactly like for a real report (`201 { ok: true }`) and stores nothing. The hit still counts against that IP's 3 per hour, but not against the global cap of 100.

**Alternatives we considered:** answering 400 „бот“ for a filled honeypot; a CAPTCHA (Google reCAPTCHA, hCaptcha, Cloudflare Turnstile); no bot protection beyond the rate limit.

**Why this one:**
- **A bot learns nothing:** with an error, its author would see the field is a trap and leave it empty. The same answer, the same 429 after 3 tries, no id: nothing to compare.
- **A CAPTCHA would stop the people we build for:** older people struggle with "click all traffic lights". Most CAPTCHAs are also a third-party service that sees our visitors (privacy, D11 free tier, one more key).
- **Counts against the IP, not the global cap:** a caught bot can't use up the 100 per hour and block real people.
- Costs one hidden field and one `if`; easy to explain and test.

**What we give up:**
- Only simple bots fill every field. A bot written for our form gets past it; then the rate limits and moderation (nothing reaches the map unapproved) are the next locks.
- A browser autofill could fill the hidden field for a real person; that report would vanish silently, so the form (W3-02) hides the field off-screen with `autocomplete="off"` (next entry).

**We would reconsider if:** moderators saw lots of spam getting through; then a privacy-friendly CAPTCHA (e.g. Turnstile) only after the first report from an IP.

### Caller number stored only as an HMAC  (status: in use (`caller_number_hash`, W3-01))

**Used for:** the number that called, if the guest gives it, is normalised to `+359…` and stored only as `HMAC-SHA256(number, HASH_PEPPER)`. Only Bulgarian numbers are accepted.

**Alternatives we considered:** storing the number in plain text; plain SHA-256; not asking for the number at all.

**Why this one:**
- **The number may belong to a real, innocent person** (scammers spoof numbers), so publishing or even keeping it is a GDPR risk. The hash still lets us see that several reports name the **same** number.
- **Plain SHA-256 is reversible here:** Bulgarian mobile numbers are only about 10⁸ possibilities, hashed in seconds. The secret pepper (outside the database) is what protects it, as for pairing codes.
- **Normalising first** (`0888 123 456` and `+359 888 123 456` → one value) is needed, or two spellings would give two hashes.
- Only Bulgarian numbers: the form is for calls in Bulgaria, and one format keeps the normalising simple.

**What we give up:**
- Nobody, not even a moderator, can read the number or call it back; we can't publish a "known scam numbers" list.
- Changing `HASH_PEPPER` breaks matching with older reports.
- Foreign numbers (some scams call from abroad) can't be given.

**We would reconsider if:** the police or a telecom asked for real numbers; that would need a legal basis and a separate, protected flow.

### Off-screen honeypot field (vs `display:none`, vs `type="hidden"`, vs a CAPTCHA)  (status: in use (`.report-trap` in `ReportForm.tsx`, W3-02))

**Used for:** the `website` trap field on `/signal`. It is moved off the screen (`position: absolute; left: -10000px`, 1 × 1 px), its wrapper has `aria-hidden="true"`, the input has `tabIndex={-1}` and `autoComplete="off"`.

**Alternatives we considered:** `display:none` or the `hidden` attribute; `<input type="hidden">`; a CAPTCHA; no field at all (rate limit only).

**Why this one:**
- **Bots still see a normal text field.** Simple bots fill every visible-looking input; many skip fields with `display:none` or `type="hidden"`, because those are well-known traps.
- **People never meet it:** not on the screen, Tab skips it, screen readers don't read it, and `autocomplete="off"` keeps autofill from filling it, which would make a real report vanish silently (previous entry).
- **No CAPTCHA:** older people struggle with them, and they are a third-party service (same reasons as the previous entry).
- Tested in the browser: `report.spec.ts` checks the field is off the screen and that Tab never reaches it.

**What we give up:**
- A bot that renders the page and checks positions can tell; then the rate limits and moderation stop it.
- One more rule to keep: whoever changes the form must not move the field back on screen.

**We would reconsider if:** spam got through; see the previous entry (Turnstile after the first report).

### Compare-and-set role change (vs a plain UPDATE, vs a row version column)  (status: in use (`changeProfileRole()` in `profilesRepository.ts`, W3-06))

**Used for:** `PATCH /api/admin/users/:id/role`. The service reads the account's role, then runs `UPDATE profiles SET role = new WHERE id = … AND role = <the role just read> AND role <> 'protected'`. If no row changed, the answer is 409 „Ролята на този профил току-що е била променена от друг администратор…“ and no audit line is written.

**Alternatives we considered:** a plain `UPDATE … WHERE id = …`; a `version` column (optimistic locking); a database lock (`SELECT … FOR UPDATE`) in a SQL function.

**Why this one:**
- **Two admins at once can't overwrite each other unnoticed:** the second one gets a 409 and sees the new role after reloading.
- **The audit line is true:** `{ from, to }` names the role that was really replaced.
- **The phone rule is checked again in the same statement**, not only in code before it.
- One extra `WHERE`; no migration, no new column, no SQL function. The same idea as `saveCheckAnswers` (`WHERE status = 'started'`) and the invite's atomic use.

**What we give up:**
- The admin sees a 409 instead of a merge; they have to reload and choose again.
- It protects only the `role` column; a version column would protect a whole row (we change nothing else).

**We would reconsider if:** admins could edit more fields of a profile; then a `version` or `updated_at` check.

### Admins can't change their own role (vs "can't demote yourself", vs allowing it)  (status: in use (`changeRole()` → 409 `own_role`, W3-06))

**Used for:** `PATCH /api/admin/users/<own id>/role` is refused with 409 „Не можете да смените собствената си роля…“; the page shows no role select on the admin's own row.

**Alternatives we considered:** the plan's "can't demote yourself" (only refuse lowering); allowing it with a confirmation; refusing only if they are the last admin.

**Why this one:**
- **No accidental lock-out:** an admin can't remove the last admin account by mistake, and nobody needs to count admins in a race-free way.
- **A stolen admin session can't hide** by demoting itself after doing damage; another admin must act, and that is audited.
- An admin is already the highest role, so "change your own role" can only mean demote: refusing every change is the same rule, stated more simply.

**What we give up:**
- An admin who wants to step down must ask another admin (or we change it in the SQL Editor).

**We would reconsider if:** there were many admins and stepping down were common; then "allowed unless you are the last admin".

### Compare-and-set moderation: only a pending report can be reviewed (vs a plain UPDATE, vs a lock)  (status: in use (`reviewPendingReport()` in `moderationRepository.ts`, W3-04))

**Used for:** `PATCH /api/moderation/reports/:id`. One statement: `UPDATE reports SET status, reviewed_by, reviewed_at, reject_reason WHERE id = … AND status = 'pending'`, sent with the **moderator's own user client**. If no row changed, the service reads the report: missing → 404, otherwise 409 „Този сигнал вече е прегледан от модератор…“. Only a changed row writes the audit line `report_approved` / `report_rejected`.

**Alternatives we considered:** a plain `UPDATE … WHERE id = …`; reading the status first and then updating (two steps); `SELECT … FOR UPDATE` in a SQL function.

**Why this one:**
- **Two moderators at once can't overwrite each other:** PostgreSQL runs the two UPDATEs one after the other; the second finds no pending row and gets a 409. With read-then-update, both could read "pending" and the second would silently replace the first decision.
- **A decision is final:** an approved report can't be flipped to rejected (or back) by a stale page; a mistake is fixed by an admin, visibly in the audit log.
- **The audit log stays true:** exactly one line per real decision, never one for a 409.
- **Two locks:** the user client means RLS ("Moderators can review reports") and the column privilege (only `status`, `reviewed_*`, `reject_reason`) check again in the database, even if our code had a bug. No migration, no SQL function. Same idea as the role change (above) and `saveCheckAnswers`.

**What we give up:**
- A moderator who clicks late sees a 409 and has to reload the queue.
- No "undo" for moderators.

**We would reconsider if:** moderators needed to change their minds; then an explicit "reopen" action for admins, audited.

### Repeat-caller count without showing the hash (vs showing the hash, vs nothing)  (status: in use (`listQueue()` in `moderationService.ts`, W3-04))

**Used for:** the moderation queue tells the moderator, per report, whether a caller number was given (`hasCallerNumber`) and **how many other reports name the same number** (`sameNumberReports`). The HMAC itself never leaves the server.

**Alternatives we considered:** sending `caller_number_hash` to the page and letting it group reports; not showing anything about the number; a SQL function that returns the counts (needs a migration).

**Why this one:**
- **Useful for spotting a real campaign:** "3 more reports name this number" makes a report more believable.
- **Data minimisation:** a hash in the browser is an identifier that could be copied and compared elsewhere; a count is not. The moderator needs the count, not the identifier.
- **No migration:** moderators may already read all reports (RLS), so the server asks PostgreSQL only for a count (`count: "exact", head: true`, no rows) per different number on the page: at most 25 tiny queries.

**What we give up:**
- Up to 25 extra small queries per page (fine for a queue of tens of reports).
- The moderator can't list *which* reports share the number (not needed for approve/reject).

**We would reconsider if:** the queue became large; then one SQL function returning the counts for a page, plus an index on `caller_number_hash`.

### Allow-listed audit summary (vs showing the raw `details` JSON, vs no details)  (status: in use (`summarizeAuditDetails()` in `auditSummary.ts`, W3-06))

**Used for:** the „Дневник“ tab shows each line's `details` as a short Bulgarian summary built only from known keys: roles (`from`/`to`), a slug that looks like a slug, the number of changed `fields`, `published`, `priority`, `devices_revoked`, the reason `person_deleted`, `linked_existing_contact`. At most 160 characters.

**Alternatives we considered:** showing the raw JSON; a block-list (hide `*_id` keys); no details, only the action.

**Why this one:**
- **`details` may hold ids of people** (`protected_person_id`, `invite_id`). The admin page should not become a tool to collect them; an allow-list can't leak a key someone adds later, a block-list can.
- **Readable for the defense and for older admins:** „Семейство → Модератор“ instead of `{"from":"family","to":"moderator"}`.
- A pure function, so every rule has a unit test (ids, dates, unknown keys and strange values are dropped).

**What we give up:**
- A new audit action shows only the action name until we add its keys to the list.
- For deep investigation the raw rows are still in the database (SQL Editor), not in the app.

**We would reconsider if:** admins needed details for an investigation; then a separate view with a reason and its own audit line.

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
- A three-choice theme control allows an explicit light/dark preference or the device setting (since W2-13 a compact radio-button switch in the header, see "Compact theme switch in the header" below). `localStorage` remembers only this non-sensitive preference; denied storage does not stop the control working, and system mode tracks device changes.
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
### Shared root layout for the header and footer (vs a header in every page)  (status: in use (W2-13, D22))

**Used for:** the header (logo, menu, theme switch) and footer around every page, in `src/app/layout.tsx` with `src/components/layout/`.

**Alternatives we considered:** importing `<SiteHeader />` and `<SiteFooter />` in every `page.tsx`; a separate layout per area (`/family`, `/protected`…) only.

**Why this one:**
- In the App Router the root layout wraps every page by itself; new pages (W2-01, W2-07, W3…) get the frame without any extra code, so nobody can forget it.
- On navigation the layout stays and only the page changes, so the header doesn't flicker or reload.
- One place to change the menu, which two people can explain in the defense.
- Header and footer are Server Components: plain HTML, no extra JavaScript on cheap phones.

**What we give up:**
- The older person's own screen (W2-01) also gets the header; if it should be calmer there, that area needs its own nested layout or a smaller header later.
- On a normal click between pages the header is not drawn again, so it changes only after a full page load (login, pairing and „Изход“ do one on purpose).

**We would reconsider if:** areas needed very different frames; then we'd use route groups with one layout each.

### Logged-in header menu read on the server inside `<Suspense>` (vs the browser asking `GET /api/me`)  (status: in use (`src/components/layout/SiteHeader.tsx`))

**Used for:** the header menu for a logged-in person: link to their area, their name, „Изход“ (not on a paired phone).

**Alternatives we considered:** a Client Component that calls `GET /api/me` after the page loads; reading the login in the root layout itself without `<Suspense>`; a separate „Влезли сте като … / Изход“ bar in each area (what `/family` had).

**Why this one:**
- `getActor()` already answers "who is this?" on the server; the header uses it directly, so there is no second request from the browser and no JavaScript for it.
- It is the pattern of the Next.js 16 guide "Authentication with Cache Components": the component that reads the session sits inside `<Suspense>`, so the rest of every page is still built in advance. Reading the cookie in the layout without `<Suspense>` makes `next build` fail with Cache Components (and would make every page wait for the database).
- The fallback is the guest menu with the same height, so the header never jumps and is never empty.
- One place for the name and „Изход“ in every area, instead of a bar per area.

**What we give up:**
- Every page view of a logged-in person asks Supabase Auth once more (`auth.getUser()`); the area pages ask again in their role guard. Fine at our size.
- A logged-in person may see the guest menu for a moment before the real one streams in, mostly on a slow connection.
- The logged-in menu can't be tested in the browser tests without a database; the role → link rule is unit-tested and the screen was checked by hand with the demo account.

**We would reconsider if:** the header needed to change on client-side navigation without a full page load; then a small Client Component with `GET /api/me` (or a shared user context) would be simpler.

### Compact theme switch in the header (vs the full-width „Изглед“ field)  (status: in use (W2-13, D22))

**Used for:** choosing „Според устройството“, light or dark from any page: three small picture buttons (screen, sun, moon) in the header.

**Alternatives we considered:** keep the full-width select above every page; a small select in the header; a single button that cycles through the three modes; a menu button ("hamburger") that hides the menu and the switch.

**Why this one:**
- The old field looked like part of a form and pushed every page down (D22).
- A select showing „Според устройството“ didn't fit next to the logo at 360 px; three 48 px buttons do.
- Native radio buttons in a named group („Изглед“): Tab, arrow keys and screen readers work without extra code; each choice keeps its full Bulgarian name for screen readers and as a tooltip.
- A cycling button hides which modes exist; with three buttons all choices are visible at once.
- Same behaviour as before: saved in `localStorage`, `system` follows the device.

**What we give up:**
- Pictures alone are less clear than words for some older users; on wide screens the label „Изглед“ is shown next to them, on phones it is only read aloud.
- We listen to the browser's `change` event ourselves, because React's `onChange` misses a click after we tick the saved choice from code; one more thing to explain.

**We would reconsider if:** user tests show older people can't find or understand the pictures; then we'd add short words under them or move the switch to a settings page.

### Home page that explains the 3 steps (vs a plain landing page or straight to login)  (status: in use (W2-13, D22))

**Used for:** `/`: tagline, the problem in one sentence, the 3 steps, start buttons and three rules for a suspicious call.

**Alternatives we considered:** keep the placeholder; send `/` straight to `/vhod`; a long marketing page with statistics.

**Why this one:**
- A family member must understand in seconds what Scamly does and what to do first: register, or pair the older person's phone.
- The jury sees the whole idea on the first page.
- Two clear main actions (64 px buttons) and one secondary („Вход“) instead of many links.
- The three rules help even someone who opens the page during a scam call.
- No numbers or statistics we can't prove; all text is in `bg.ts`.

**What we give up:**
- A logged-in family member also sees the start page; sending them straight to their dashboard comes later.

**We would reconsider if:** most visitors were returning users; then `/` would redirect logged-in people to their area.

### Family dashboard: Client Components that call our API (vs Server Components that read the database)  (status: in use (W2-07))

**Used for:** every screen of `/family` that shows or changes personal data (people list, person page, history, phones, contacts, invites, pairing).

**Alternatives we considered:** Server Components that read Supabase directly with the user client and pass the data down; Server Actions for the forms; a data library such as SWR or TanStack Query.

**Why this one:**
- One path to the data: the API routes we already built and tested (same-origin check, `requireRole`, Zod, RLS). A screen can't skip a check because it has no other way in.
- After a change (save the list, remove a phone) the same component updates itself; no page reload, no second copy of the logic.
- The browser tests answer the API calls with `page.route()`, so the whole UI is tested in CI without a database or a login.
- The server still does what it must do first: the role guard (`FamilyGate`, `requirePageRole`) runs before any page of the area is sent.
- Plain `fetch` in one small helper (`callApi()`) is easy to explain; SWR or TanStack Query would add a library and caching rules we don't need.

**What we give up:**
- The first view shows „Зареждане…“ for a moment, because the data comes after the page; a Server Component could send it with the HTML.
- A little more JavaScript in the browser.

**We would reconsider if:** the first load felt slow on a cheap phone; then the person page could get its first data from a Server Component and keep the API for changes.

### ↑ / ↓ buttons for the contact order (vs drag and drop)  (status: in use (W2-07))

**Used for:** the order of the trusted contacts (places 1–5) on the person page.

**Alternatives we considered:** drag and drop with a library (dnd-kit, SortableJS); the browser's own HTML drag and drop; a number field „Място“ for each contact.

**Why this one:**
- Works with a keyboard, a screen reader and an unsteady finger on a small phone; HTML drag and drop does not work with touch or a keyboard at all, and drag libraries need extra work to be accessible.
- No extra library (less code to load, nothing to licence or explain).
- After a move the focus stays on the same arrow and a hidden status line says „Иван е на място 1.“, so the person always knows where the contact is.
- With at most 5 contacts, moving one place at a time is quick.

**What we give up:**
- Moving someone from place 5 to place 1 takes four taps.

**We would reconsider if:** lists became much longer; then an accessible drag library plus the buttons.

### `qrcode` (1.5.4) in the browser for the pairing QR code (vs our own QR code, vs an online QR service)  (status: in use (W2-07))

**Used for:** the QR code with `<our site>/svarzhi?kod=482915` on the pairing screen.

**Alternatives we considered:** writing the QR algorithm ourselves; an online QR image service (a URL like `https://…/qr?data=…`); only the 6 digits without a QR code.

**Why this one:**
- **Privacy:** the code is made in the browser, so the pairing code (a 10-minute key to the older person's account) never leaves our site; an online service would receive every code.
- A QR code needs Reed–Solomon error correction and mask patterns; writing that ourselves would take days and be easy to get wrong. `qrcode` is small, widely used and MIT-licensed (compatible with GPL-3.0).
- We use only `create()` (the grid of squares) and draw it ourselves as one inline SVG path: sharp at any size, black on white also in dark mode, no image files, and it will pass a strict CSP later (no `data:` images needed).
- The 6 digits stay as the main way; the QR code only saves typing on a phone with a camera.

**What we give up:**
- One more dependency (with its small helper packages) to keep updated.

**We would reconsider if:** the library were abandoned with a security problem; then another MIT QR library with the same `create()` idea.

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

### Call check: one question per screen (vs one long form)  (status: in use (W2-01, `src/components/protected/QuestionWizard.tsx`))

**Used for:** the 4 + 1 questions on the older person's phone (BUILD_PLAN 4.1), then the optional text.

**Alternatives we considered:** all questions on one scrolling form with one „Провери“ button; a chat-like flow (bot messages and answer bubbles); only yes / no buttons without the „Не знам“ answer.

**Why this one:**
- One decision at a time: a frightened 80-year-old on a small phone reads one big question and taps one big answer. A long form needs scrolling, and an unanswered question in the middle is easy to miss.
- One tap goes on to the next question, so the whole check is about 5 taps; „Назад“ and „Въпрос 2 от 4“ show where you are.
- Question 3 („Как искат да ги дадете?“) simply appears or not; in a form it would jump in and move everything below it.
- Each screen gives the focus to its heading, so a screen reader reads the new question; answers are native radio buttons (keyboard and screen reader work without extra code). With the keyboard the arrow keys only choose and „Напред“ goes on, so the choice can't jump away.
- A chat flow looks friendly but adds text to read and is harder to make accessible.

**What we give up:**
- More screens: a person who wants to change an early answer taps „Назад“ a few times.
- A little more code (the stage and question index) than one form.

**We would reconsider if:** tests with older people showed they get lost between screens; then fewer, combined questions.

### Praise first on the red result (vs only the warning)  (status: in use (W2-01, IDEAS #8))

**Used for:** a red result starts with „Добре направихте, че проверихте.“, then „ТОВА Е ИЗМАМА.“, „Затворете телефона.“ and the reasons.

**Alternatives we considered:** only the alarm („ТОВА Е ИЗМАМА.“ in big red letters); a sound or vibration; a softer headline („Може би е измама“).

**Why this one:**
- A scared person who feels ashamed („how could I believe it?“) may freeze or keep talking to the scammer. Praise first tells them they did the right thing, and the next line tells them clearly what to do now.
- The headline stays clear: we soften the tone, not the message (D10 still forces red).
- No sound: the scammer may still be on the line and hear it.

**What we give up:**
- One more line to read before the instruction (it is short, and „Затворете телефона.“ is the biggest line in the box).

**We would reconsider if:** older users told us the praise feels patronising; then a shorter, neutral first line.

### `useSyncExternalStore` for `?check=` (vs `useSearchParams` + `<Suspense>`)  (status: in use (`src/components/family/AlertsPage.tsx`, W2-03))

**Used for:** reading `?check=<id>` (the link in a push notification or an alert e-mail) on `/family/alerts`, to scroll to that alert and focus it.

**Alternatives we considered:** `useSearchParams()` from `next/navigation` (needs a `<Suspense>` boundary around the component with `cacheComponents`, or `next build` fails); reading `window.location.search` in a `useEffect` and storing it in state; a Server Component reading `searchParams`.

**Why this one:**
- React's own hook for "a value that lives outside React": it gives `""` while the page is built on the server and the real address in the browser, **without a hydration mismatch** and without an extra render.
- No `<Suspense>` and no fallback flash for one small value; the address never changes while the page is open, so the "subscribe" function does nothing.
- The same pattern we already use for the remembered call contact (W2-01) and the voice support check (W2-10).

**What we give up:**
- If the page ever changed `?check=` itself (client-side navigation), this hook would not notice; it doesn't.
- A less familiar hook to explain than `useSearchParams()`.

**We would reconsider if:** the page needed to react to address changes; then `useSearchParams()` inside `<Suspense>`.

### Alert beep made with Web Audio (vs a sound file)  (status: in use (`src/components/family/alertSound.ts`, W2-03))

**Used for:** an optional two-tone beep (880 Hz, then 660 Hz) and a vibration on a new alert, only after the family member pressed „Включи звук и вибрация“.

**Alternatives we considered:** an MP3/WAV file played with `<audio>`; no sound at all; sound on by default.

**Why this one:**
- **Nothing to download, license or cache:** an oscillator (a tiny synthesizer in the browser) makes the beep in a few lines.
- Browsers block sound before the user has pressed something on the page; creating the `AudioContext` **in the button's click** is exactly what they allow, so the sound really works later.
- Sound is opt-in: a page that beeps by surprise in an office or at night would be switched off for good. The alert is always on the screen and read aloud anyway.

**What we give up:**
- A plain beep, not a designed sound. The setting is not remembered after a reload.
- iPhones and desktop browsers don't vibrate (`navigator.vibrate` is missing there).

**We would reconsider if:** users asked for a recognisable alert sound; then a short free-licensed file.

### PWA instead of a native Android/iOS app  (status: in use (W2-09: manifest, install card, offline card))

**Used for:** making Scamly installable on the home screen, with web push and an offline "what to do" card.

**Alternatives we considered:** a native Android app (Kotlin), React Native / Flutter, a plain website.

**Why this one:**
- **One codebase for every phone and the jury's laptops.** A native app would be a second project.
- **No app store:** publishing takes accounts, review time and (for Apple) a paid developer account.
- The family can set it up on grandma's phone by opening a link and tapping "Add to Home Screen".
- The jury can open it from a link during judging.

**What we give up:**
- **iOS limits:** web push only works after "Add to Home Screen" on iOS 16.4+ **and** only for a site with a web app manifest (`display: "standalone"`), opened from that icon (risk R2). The family has to do the 3 steps by hand; Safari has no install button.
- A web app can't see incoming calls (and we don't want to: no call recording, by design).

**We would reconsider if:** the project continued and we needed features only native apps get (e.g. a screen that appears during a call).

### Web app manifest via the Next.js file convention (`src/app/manifest.ts`) (vs a hand-written `public/manifest.json`, vs a PWA plugin)  (status: in use (W2-09))

**Used for:** telling phones that Scamly is an installable app (name, icons, colours, `display: "standalone"`), which iPhone web push needs.

**Alternatives we considered:** a static `public/manifest.json` plus a hand-written `<link rel="manifest">`; a PWA plugin such as `next-pwa` / Serwist that also generates a service worker.

**Why this one:**
- **Built into Next.js 16:** `manifest.ts` returns a typed `MetadataRoute.Manifest`, so a typo in a field is a type error; Next.js serves it as `/manifest.webmanifest` and adds the `<link>` to every page by itself.
- **Texts from `bg.ts`** (name and description) and colours from one file (`src/config/pwa.ts`), shared with the `theme-color` tags: nothing to keep in sync by hand.
- **No plugin:** a PWA plugin brings its own build step and a generated service worker that caches pages, which we don't want (see "Offline card only on failed page loads"), and it would have to be merged with Alex's push worker.

**What we give up:**
- Next.js writes only the new `mobile-web-app-capable` tag, so we add Apple's old `apple-mobile-web-app-capable` ourselves (older iPhones).

**We would reconsider if:** we needed per-user manifests (we don't).

### Own app icons generated from SVG with Playwright's Chromium (vs downloaded icons, vs an online generator, vs `sharp`)  (status: in use (W2-09, `scripts/icons/`, `npm run icons`))

**Used for:** the home-screen icons, the iPhone icon and the Android notification badge (`public/icons/`).

**Alternatives we considered:** a free icon set; an online "PWA icon generator"; drawing PNGs in an image editor; a script with `sharp` (comes with Next.js).

**Why this one:**
- **Our own drawing** of the header logo (shield + phone): no licence or credit questions (GPL-3.0, `THIRD_PARTY_LICENSES.md`), and it looks like the site.
- **Reproducible:** the SVG sources are in the repo; one command makes all five PNGs at the exact sizes. Playwright's Chromium is already installed for our browser tests, so no new package.
- An online generator would need uploading and gives files we can't re-make; `sharp` is only an indirect dependency of Next.js and not ours to rely on.

**What we give up:**
- The generator needs Chromium installed (`npx playwright install chromium`), and the PNGs must be re-made by hand after an SVG change.

**We would reconsider if:** a designer made a real logo; then we would replace the SVG sources.

### Offline card only on failed page loads (vs caching app pages, vs no offline support)  (status: in use (W2-09, `public/sw.js`))

**Used for:** showing „Няма връзка с интернет“ and the three rules when a page can't load without internet.

**Alternatives we considered:** caching every page and file the app loads ("cache first" or "stale while revalidate", e.g. Workbox); caching the app shell; no offline support at all (the browser's own error page).

**Why this one:**
- **Never old data:** a cached page could show an old verdict, an old alert or someone's name after logout. Our worker keeps exactly **one** page with no data, and only for **navigations that fail** with a network error; everything else always comes from the network.
- **Still useful without internet:** the most important advice (the police never ask for money, don't give money, call a relative yourself) reaches grandma exactly when Scamly can't check the call.
- **Self-contained page:** inline CSS and SVG, so it looks right although `/_next/` files are not cached; no header with a name.
- **Small and explainable:** one cache name with a version number, old caches deleted on `activate`; push and `notificationclick` untouched.

**What we give up:**
- Without internet the app itself (the big button) doesn't open from the icon; only the card does. The offline engine fallback (3.33) still helps on an already open page.

**We would reconsider if:** the jury or users needed the call check fully offline; then we would cache the `/protected` app shell with careful versioning.

### Native `<select>` and date input on the report form (vs a JavaScript date picker, vs a map to pick the district)  (status: in use (`ReportForm.tsx`, W3-02))

**Used for:** the district (a `<select>` with the 28 names) and the day of the call (`<input type="date">` with `min` = 90 days back and `max` = today, filled in with today) on `/signal`.

**Alternatives we considered:** a date-picker library (e.g. `react-day-picker`); three separate fields for day, month and year; picking the district on a map.

**Why this one:**
- **The phone's own picker:** on Android the date input opens the system calendar, big and familiar; the `<select>` opens the system list. Older people already know them.
- **Accessible for free:** keyboard, screen readers and zoom work without our code.
- **No new dependency** and nothing to style for dark mode beyond our tokens.
- `min`/`max` stop most wrong dates before Zod; Zod still checks (the browser may ignore them).

**What we give up:**
- The date input looks different in each browser, and the desktop version is small; we can't style the calendar.
- A 28-item list is long; a map would be more fun but much harder to use and to make accessible.

**We would reconsider if:** the usability test (W4-05) showed people struggle with the date picker; then „Днес / Вчера / Друга дата“ buttons.

### Leaflet 1.9.4 without a base map (vs OpenStreetMap tiles, vs Google Maps / Mapbox, vs a hand-drawn SVG)  (status: in use (`src/components/map/DistrictMap.tsx`, W3-03))

**Used for:** the public map `/karta`: Bulgaria's 28 districts, coloured by the number of approved reports, with a tooltip, keyboard focus and a click per district.

**Alternatives we considered:** Leaflet **with** the public OpenStreetMap tiles under the districts; Google Maps or Mapbox; drawing the districts ourselves as an SVG (projection, hit-testing and resizing by hand).

**Why this one:**
- **No API key, no billing account, no paid service** (D11). Leaflet is open source (BSD-2-Clause), about 40 KB gzipped, and loaded **only in the browser and only on `/karta`** (`next/dynamic` with `ssr: false`), so no other page gets heavier.
- **No tiles:** street maps add nothing at district level (we never show addresses), but would add dozens of image requests on 4G, a third-party server that sees every visitor's IP (our "no tracking" promise), the OSM tile usage policy (heavy use is not allowed, no guarantee) and an ODbL credit. Without tiles the districts sit on our own background and follow light/dark mode.
- **A fixed map** (no dragging or zooming): on a phone a finger on the map never traps the page's scrolling, and older people can't "lose" Bulgaria. Small districts (Sofia city) are also in the table and its buttons.
- Leaflet still does the hard parts for us: the projection, fitting Bulgaria into any box (`fitBounds`, again on resize), hit-testing, tooltips and one SVG `<path>` per district that we can make a keyboard button.

**What we give up:**
- No streets or towns under the districts (not needed, see above).
- No zoom: very small districts are hard to tap on a 360 px phone; the table is the fallback.
- A hand-drawn SVG would have no dependency at all, but we would own projection and resizing code.

**We would reconsider if:** we needed zoom for very small areas (then enable Leaflet's zoom buttons, still without tiles).

### Natural Earth district shapes, simplified by rounding (vs OpenStreetMap-derived boundaries, vs geoBoundaries)  (status: in use (`public/geo/bg-districts.json`, `scripts/geo/build-districts.mjs`, W3-03))

**Used for:** the shapes of the 28 districts on the map.

**Alternatives we considered:** OpenStreetMap-derived boundaries (the brief's first idea, ODbL); geoBoundaries (CC BY / ODbL); drawing them by hand.

**Why this one:**
- **Public domain:** Natural Earth 1:10m "Admin 1 – States, Provinces" v5.1.2 needs no permission and no credit (we credit it anyway). OSM data would need the ODbL credit and share-alike terms for the derived file.
- **We could actually download it here:** the file is on `raw.githubusercontent.com` at the release tag `v5.1.2`, so the build is reproducible. OSM extracts need an export service or large downloads.
- **Exactly our codes:** every province has `iso_3166_2` = `BG-01` … `BG-28`, the codes of our `districts` table, so the mapping is one line, and a unit test checks all 28.
- **Already generalised for small scales**, so rounding every point to 3 decimals (about 100 m) is enough: **about 56 KB** (14 KB gzipped), far under the 300 KB limit (R17). Rounding keeps the borders that two districts share identical, so there are no gaps or overlaps; simplifying each shape on its own (Douglas–Peucker) would create slivers.

**What we give up:**
- Natural Earth borders are less precise than OSM (fine at country size, not for a zoomed-in street map).
- Sofia city (BG-22) is drawn next to Sofia district (BG-23), not as a hole inside it; that is how Natural Earth models it and it looks right.

**We would reconsider if:** we needed municipalities (община), which Natural Earth does not have; then an OSM-derived set with the ODbL credit.

### Browser Web Speech API for voice input  (status: in use (`src/components/protected/VoiceInput.tsx`, W2-10) ✂ can be cut; real Bulgarian recognition on a phone not yet tested)

**Used for:** letting the older person say what the caller said instead of typing (`bg-BG`, the „Говорете“ button on the text step).

**Alternatives we considered:** recording the audio in the browser (`MediaRecorder`) and sending it to our server, which passes it to a speech service: a paid API (Google Cloud, Azure, OpenAI Whisper API) or Whisper run by ourselves.

**Why this one:**
- **Free and built into Chrome on Android**, our main target phone.
- **Scamly never receives or stores audio**: we get only the text, which goes through the same redaction as typed text (3.23). Recording and uploading would put voice recordings of a frightened person on our server, with consent, storage and deletion to handle.
- Paid APIs cost money per minute (D11); running Whisper ourselves needs a server with a lot of computing power.

**What we give up:**
- **Not available everywhere** (missing in Firefox, unreliable on iOS), so the button is hidden when it isn't supported and typing always works (risk R3).
- **Honest limit:** in Chrome the recognition is done by the browser's speech service (Google's servers), not on the phone and not by us; we can't control that. The note under the button says the browser turns the voice into text and Scamly records no sound, which is true, but it doesn't claim nothing leaves the phone.
- Needs an internet connection (error „Гласовото въвеждане се нуждае от интернет…“).

**We would reconsider if:** voice became the main way to use the app for people who can't read well (then a dedicated speech service would be worth asking about).

### One sentence per tap for voice input (vs continuous listening)  (status: in use (`continuous = false` in `VoiceInput.tsx`, W2-10))

**Used for:** each tap on „Говорете“ listens to one sentence; recognition ends by itself after a pause, the text is added, and the button is ready again. „Спри“ ends earlier.

**Alternatives we considered:** `continuous = true` (keep listening until „Спри“); starting to listen automatically when the text step opens.

**Why this one:**
- **The most reliable mode on Android Chrome:** continuous recognition there often stops on its own, repeats words or ends silently, which would confuse an older person.
- The phone listens only right after a tap: the microphone is never on by surprise (the browser also asks for permission at that moment), and a TV or the caller on speaker is not written down by accident.
- Each piece is added at the end of the field, so speaking twice simply adds two sentences.

**What we give up:**
- A long story needs several taps.

**We would reconsider if:** tests on real phones showed that continuous mode works well in `bg-BG`.

### `FEATURE_VOICE` read at request time (vs at build time)  (status: in use (`src/components/protected/CallCheckPage.tsx`, W2-10))

**Used for:** deciding on the server, for every request, whether the „Говорете“ button may be shown, and passing it to the browser part as a normal prop.

**Alternatives we considered:** a `NEXT_PUBLIC_FEATURE_VOICE` variable (copied into the JavaScript at `next build`); asking an API route from the browser.

**Why this one:**
- **Switching voice off on Vercel needs no new build** (D12: voice is second in the cut order); the same idea as the VAPID public key route (3.29).
- No extra request: the value arrives with the page.
- `await connection()` marks the component as "request time only", which is how Next.js 16 with `cacheComponents` wants request data; it sits inside `<Suspense>` (the `/protected` layout has one, the preview adds its own).

**What we give up:**
- That part of `/protected` is rendered per request instead of once at build time (a tiny cost: the page is a few screens of buttons).

**We would reconsider if:** the switch were never used; then it could be removed instead.

### Hand-made bar charts from HTML and CSS (vs Recharts, vs Chart.js, vs hand-made SVG)  (status: in use (`src/components/admin/Charts.tsx`, W3-06; replaces the Q9 choice of Recharts))

**Used for:** the four charts of „Статистика“ in `/admin`: checks per day stacked by result, checks by result, by kind of scam, reports per district (top 10). Each bar is a `<div>` whose width (or height) is a percentage of the biggest value; each chart has a legend and „Покажи числата“, a real `<table>` with the same numbers.

**Alternatives we considered:** Recharts (the plan's choice, Q9); Chart.js (canvas); D3; drawing SVG by hand.

**Why this one:**
- **No new dependency:** Recharts brings its own packages and JavaScript for four simple bar charts; our version is about 170 lines we can explain line by line in the defense.
- **Accessible by design:** the bars are only a picture (`aria-hidden`); screen readers get the table. Colour is never the only hint: the levels have their symbol and word, yellow and „unfinished“ have stripes. Canvas charts (Chart.js) are invisible to screen readers.
- **Our tokens, dark mode for free:** the fills are the same CSS variables as the verdicts.
- **Fits a 360 px phone** without sideways scrolling, because widths are percentages.
- Bar charts are all we need; SVG by hand would add axes and coordinates for no gain.

**What we give up:**
- No tooltips, zoom, animations or line charts; a new chart type means writing it ourselves.
- The plan said Recharts (Q9); this is a change to the plan (`CHANGES.md`, 10 Nov).

**We would reconsider if:** we needed line charts over months or interactive charts; then Recharts, styled with our tokens.

### One-click „Одобри“ vs a confirmation window for „Отхвърли“ (vs confirming both, vs undo)  (status: in use (`src/components/moderator/ReportQueue.tsx`, W3-04 UI))

**Used for:** on `/moderator/reports` a pending report is approved with **one click** (the card disappears and a polite `aria-live` message says „Сигналът е одобрен и ще се появи на картата до минута.“). Rejecting opens a small window that needs a reason.

**Alternatives we considered:** a confirmation window for both buttons (like role changes in the admin area); one click for both plus an „Отмени“ (undo) link for a few seconds; a checkbox list with one „Одобри избраните“ button.

**Why this one:**
- **Approving is the common, cheap case:** most reports are real. One click per report keeps the queue fast; a window for every report would train moderators to click „Да“ without reading.
- **Rejecting needs information anyway** (a reason), so the window is not an extra step: it is where the reason is typed.
- **No undo in the API:** a decision is final (compare-and-set, only `pending` can change). An undo link would need a new API state; we keep the rule simple to explain.
- The risk of a wrong approval is small and visible: the report only adds 1 to a district's count on the map.

**What we give up:**
- A mis-click approves a report with no way back in the app (it can be fixed in the database by a person with access).

**We would reconsider if:** wrong approvals happened in practice; then an „Отмени“ link for 10 s before the PATCH is sent.

### Quick-pick reject reasons + a required free-text reason (vs free text only, vs a fixed list only)  (status: in use (`src/components/moderator/RejectDialog.tsx`, `bg.moderator.quickReasons`, W3-04 UI))

**Used for:** the „Отхвърли“ window has a required text field (3–200 characters, with a counter) and five buttons that fill it with a common reason: „Спам“, „Не е измама“, „Лични данни“, „Грешна област“, „Дублиран сигнал“. The text can still be edited.

**Alternatives we considered:** free text only; a fixed `<select>` of reasons only (stored as a code); no reason at all.

**Why this one:**
- **A reason is required by the API** (the decision log of other moderators: why was this report not counted?) and makes moderators decide on purpose.
- **Fast on a phone:** one tap instead of typing; the field is still free text, so a special case can be explained.
- **No new database column or enum:** the API already accepts a 3–200 character reason; a unit test checks that every quick reason passes the server's own Zod schema.
- The browser checks the same 3–200 rule before sending (`rejectReasonError()`), the server checks it again.

**What we give up:**
- Reasons are free text, so statistics by reason would need grouping by exact text.

**We would reconsider if:** we wanted statistics of rejected reports by reason; then a reason code next to the text.

### Repeat-number badge shows only the count (vs the number, vs a link to the other reports)  (status: in use (`repeatBadgeText()` in `src/components/moderator/reportQueueHelpers.ts`, W3-04 UI))

**Used for:** a report whose caller number is also named by other reports gets a small badge „Още 3 сигнала от същия номер“. Nothing else about the number is shown.

**Alternatives we considered:** showing the (masked) number; a link that lists the other reports with that number; no badge.

**Why this one:**
- **The API never sends the number or its hash** (section 3, "Repeat-caller count without showing the hash"), so the page can't show it, and a moderator doesn't need it to approve or reject.
- **Privacy:** the person who reported may have typed a wrong number (a relative's). A count can't hurt anybody; a number on a moderator's screen could be copied.
- It still tells the moderator what matters: "this looks like a campaign, the report is believable". An e2e test checks that the cards never show a run of 5 or more digits.

**What we give up:**
- The moderator can't open the other reports with the same number.

**We would reconsider if:** moderators needed to merge duplicates; then a server-side "same number" filter that still never sends the number.

---

## 5. Notifications

### Supabase Realtime live alert page as the primary channel  (status: in use (publication on `checks`, `alerts`; token endpoint and `src/lib/realtime.ts`; family page `/family/alerts` and grandma's family message since W2-01/W2-03))

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

### `AlertChannel` interface, one `alerts` row per (contact, channel)  (status: in use (`alertService.ts`: realtime, push since W2-05, e-mail since W2-06))

**Used for:** the fan-out when the button is pressed: every trusted contact with an account, on every channel, written as one row each in one INSERT (HOW_IT_WORKS 3.24).

**Alternatives we considered:** one function per channel called directly from the check service; a single row per contact with the channels as columns; a job queue.

**Why this one:**
- **Adding push or e-mail = adding one object to a list** (`{ name, send() }`, like a Python `Protocol`); `fanOut()` doesn't change. It is the same idea as `EmailProvider` (D5, ADR 0005).
- **One failed channel never stops the others:** that row becomes `failed` with the reason, and the rest are delivered and recorded.
- One row per (contact, channel) matches the `alerts` table and is the evidence of who was told how.
- The realtime channel's `send()` does nothing: the row itself is what Realtime delivers, so nothing is sent twice.
- A queue would be one more service (cost, D11) for a handful of messages.

**What we give up:**
- Sending happens inside the request: a slow provider makes the phone's answer slower, at most by its 5 s timeout because the sends run in parallel (errors never block it).
- A channel with nothing to send answers `"skipped"` and writes no row, so the table shows real deliveries only, not "who could have been told".
- On the verdict, channels are called again without new rows, so the table records only the first alert.

**We would reconsider if:** sending started to take seconds; then a background job (e.g. `pg_cron` or a queue).

### Realtime as a doorbell + 5 s polling fallback  (status: in use (`src/lib/realtime.ts`, W2-03))

**Used for:** a Realtime event only tells the page "something changed"; the page then re-reads from our API. Until the channel is `SUBSCRIBED` (or after it drops) the page polls our API every 5 seconds (HOW_IT_WORKS 3.25).

**Alternatives we considered:** using the Realtime payload (the raw row) directly; polling only; Realtime only.

**Why this one:**
- **One shape for the page:** our API turns rows into `CheckDto` with Bulgarian reasons from `bg.ts`, names and the acknowledgement message; a raw row has codes and account ids.
- **Polling covers networks that block WebSockets** (some workplaces, mobile networks), so the alert always arrives, just a few seconds later (D7).
- Realtime alone would silently show nothing when it fails; polling alone would be slower and cost more requests.

**What we give up:**
- Every event costs one extra API request.
- Two mechanisms to explain and test (`realtime.test.ts`, with fake timers).

**We would reconsider if:** never for the alert page; the fallback is what makes D7 reliable.

### Safety poll every 10 s even while Realtime is connected (vs trusting Realtime alone)  (status: in use (`SAFETY_POLL_INTERVAL_MS` in `src/lib/realtime.ts`, fix of 6 Nov))

**Used for:** while the channel is `SUBSCRIBED`, the page still re-reads our API when its last load is 10 s old; it also re-reads right after `SUBSCRIBED` and when the tab becomes visible or the network returns.

**Alternatives we considered:** stopping polling at `SUBSCRIBED` (our first version); polling every 5 s all the time; re-subscribing the channel every few minutes.

**Why this one:**
- **It fixed a real miss.** In the W2-01 live check the family's answer once did not reach grandma's phone within 15 s. Polling had stopped at `SUBSCRIBED`, so an event lost after that (e.g. sent while the database side of the subscription was still starting) was never re-checked. `SUBSCRIBED` does not promise that every event arrives.
- With the safety poll the worst case is about 10 s, and in the normal case Realtime still brings the change in about a second. Live after the fix: 5/5 round trips.
- Half the requests of polling every 5 s all the time; re-subscribing would not catch an event lost in between.
- "One load at a time" (a doorbell during a load causes exactly one more load) keeps the extra loads from racing each other.

**What we give up:**
- One small request every 10 s per open page, even when nothing happens.
- Slightly more logic to test (`realtime.test.ts`, 10 tests with fake timers).

**We would reconsider if:** many family pages were open at once and the requests counted against a free-tier limit; then a longer safety interval (e.g. 30 s).

### One Realtime channel for all the family's people (vs one channel per person)  (status: in use (`watchChecksOfPersons()`, W2-03))

**Used for:** `/family/alerts` watches the checks of everybody the family member looks after with one channel that has one `postgres_changes` filter per person plus one for new `alerts` rows.

**Alternatives we considered:** one channel (and one `watchPersonChecks()`) per person; one channel on all of `checks` without a filter (RLS would still limit it).

**Why this one:**
- **One connection state for the page** („Връзка на живо“ or polling), one place where polling starts and stops, one list sorted by `newestFirst()`.
- Fewer channels on the free tier's connection limits; most families watch one or two people anyway.
- Filters per person keep the events to what the page shows; RLS stays the real lock.

**What we give up:**
- Any change of any of the people re-reads **all** their lists (one `GET /api/checks?personId=…` per person, in parallel).
- A new person is picked up only when the page reloads.

**We would reconsider if:** a family member looked after many people; then one API route for "all my people's newest checks".

### Own Realtime client with an `accessToken` function (vs `setAuth` on the browser client)  (status: in use (`src/lib/realtime.ts`, W2-03))

**Used for:** the page's Realtime connection gets the user's token from `GET /api/realtime/token` through a function supabase-js calls on every heartbeat; it is refreshed 60 s before it expires.

**Alternatives we considered:** `client.realtime.setAuth(token)` on the normal browser client (the Session E plan).

**Why this one:**
- **`setAuth` alone fails:** supabase-js asks the client for a token on every heartbeat, and a browser client without a session (our cookies are HttpOnly) answers with the publishable key, replacing our token. RLS then sees a guest and delivers nothing.
- With `accessToken`, supabase-js always asks **our** function, which also renews the token before it expires, so a page open for hours keeps working.
- This client only listens; all reads and writes still go through our API.

**What we give up:**
- A second Supabase client in the browser bundle (the same library, so little extra size).

**We would reconsider if:** `@supabase/ssr`'s browser client could take an external token source.

### `Promise.all` for the alert sends (vs one after the other, vs a background job)  (status: in use (`fanOut()`, `notifyVerdict()`, W2-05/W2-06))

**Used for:** every (family member, channel) send starts at once and the fan-out waits for all of them (`Promise.all`, like Python's `asyncio.gather`); the rows still go into one INSERT.

**Alternatives we considered:** a `for` loop with `await` (the W2-03 version); a background job or queue.

**Why this one:**
- Brevo and the push services each have a 5 s timeout. One after the other, 2 family members × 2 slow channels could hold grandma's phone for 20 s; in parallel the slowest single send decides.
- Every channel already catches its own errors into a `failed` row, so one failure can't reject the whole `Promise.all`.
- A queue would be another service (D11) and more to explain for a handful of messages.

**What we give up:**
- The phone's answer still waits for the slowest send (up to about 5 s when a service hangs).
- Many sends at the same moment (not a problem for one family).

**We would reconsider if:** families got large or sends slow; then a background job (`pg_cron` or a queue).

### Web Push with VAPID through `web-push` 3.6.7 (vs hand-written encryption, vs Firebase FCM)  (status: in use (W2-05 backend and opt-in card with iPhone hint; real-phone test pending))

**Used for:** a notification on the family member's phone even when Scamly isn't open (`src/server/notifications/pushSender.ts`, `pushChannel.ts`, `public/sw.js`).

**Alternatives we considered:** writing the encryption (RFC 8291) and the VAPID signature ourselves with Node's `crypto`; the Firebase Cloud Messaging SDK; SMS; Viber/Telegram bots (stretch goal).

**Why this one:**
- **VAPID web push is an open web standard**; it works in Chrome, Firefox, Edge and Safari (iOS after home-screen install) without an extra account. Chrome uses Google's push service underneath, but we need no Firebase project or SDK.
- **`web-push` does the hard part**: the message encryption with the browser's keys and the signed VAPID token. Hand-written crypto is easy to get subtly wrong and hard to defend; the library is the standard Node choice, small, and we wrap it in one function (`createWebPushSender`) so tests pass a fake.
- **FCM** would mean a Firebase project, its SDK in the browser and a second set of keys, and Safari/Firefox still need web push.
- **Free**, unlike SMS. Licence MPL-2.0, compatible with GPL-3.0; used unchanged from npm (`THIRD_PARTY_LICENSES.md`).

**What we give up:**
- iPhone support needs iOS 16.4+ and "Add to Home Screen" (risk R2), which is why Realtime is primary.
- Delivery isn't guaranteed (phone offline, battery saving); TTL 10 min means a late phone gets nothing rather than an old alert.
- One more dependency (with a few small sub-dependencies) to keep updated.

**We would reconsider if:** we built a native app (then FCM/APNs directly).

### VAPID public key from a route (vs `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)  (status: in use (`GET /api/push/public-key`, W2-05))

**Used for:** the browser asks `GET /api/push/public-key` for `{ enabled, publicKey }` before subscribing.

**Alternatives we considered:** a `NEXT_PUBLIC_VAPID_PUBLIC_KEY` variable (copied into the JavaScript at build time); hard-coding the key.

**Why this one:**
- **Read at request time:** turning push off (`FEATURE_PUSH`) or changing the keys on Vercel works without a rebuild; with `NEXT_PUBLIC_` the old key would stay in the built JavaScript.
- **One variable, not two:** the server needs `VAPID_PUBLIC_KEY` anyway for signing; a copy under another name could drift.
- **`enabled` comes free:** the same answer tells the page whether to show „Включи известията“ at all.
- The public key is public by design, so an open GET route leaks nothing.

**What we give up:**
- One extra request before subscribing (only when someone taps the button).

**We would reconsider if:** never for this project.

### At most 1.5 s for the push unsubscribe at logout (vs waiting for it, vs skipping it)  (status: in use (`unsubscribeFromPushBeforeLogout()` in `src/lib/push.ts`, W2-05))

**Used for:** „Изход“ first switches web push off for this browser (server row and browser subscription), then logs out. It races the unsubscribe against a 1.5 s timer and ignores errors.

**Alternatives we considered:** waiting for the unsubscribe however long it takes; not unsubscribing at logout; unsubscribing after the logout.

**Why this one:**
- **A shared browser must not keep getting the old account's alerts** (names of the people it protects on the lock screen).
- **„Изход“ must never hang or fail**: a slow network or a stuck push service would otherwise block the button. 1.5 s is enough on a normal connection and short enough not to feel broken.
- It must happen **before** the logout, because deleting the server row needs the login.

**What we give up:**
- On a very slow network the unsubscribe may not finish; a later push to that browser then still reaches it until the subscription expires (a 404/410 deletes the row, 3.29), or until the next account subscribes the same browser (409 → fresh subscription).

**We would reconsider if:** we saw stale subscriptions in practice; then a server-side cleanup of a user's subscriptions at logout.

### Brevo free tier behind an `EmailProvider` interface  (status: in use (D5, W2-06 backend); real test e-mail pending a Brevo account)

**Used for:** alert emails to family members (third channel); possibly sign-up confirmation emails (Q8).

**Alternatives we considered:** Resend, SendGrid, Gmail SMTP, Supabase's built-in email, no email.

**Why this one:**
- **Brevo's free tier allows sending from one verified sender address, with no domain of our own** (we haven't bought a domain, Q13). There's a daily sending limit; check current limits.
- **Resend** is nice for developers but needs **our own domain** to send to other people.
- **SendGrid's** free offer has changed over time; we couldn't rely on a lasting free plan (check current terms).
- **Gmail SMTP** would mean putting a personal Google account's credentials on our server, with low sending limits and a risk of the account being blocked.
- **The interface** (`EmailProvider`, like a Python abstract base class) lets us switch Brevo → Resend → `noop` by changing one environment variable (`EMAIL_PROVIDER`); `createEmailProvider()` falls back to `noop` with a warning when Brevo's key or sender is missing.

**What we give up:**
- Emails from a single sender without our own domain are more likely to land in spam (risk R4).
- Another account with an API key to protect.

**We would reconsider if:** we buy a domain; then Resend (or Brevo with our domain) for better delivery.

### Plain `fetch` for Brevo (vs Brevo's Node SDK)  (status: in use (`brevoEmailProvider.ts`, W2-06))

**Used for:** sending one e-mail = one `POST https://api.brevo.com/v3/smtp/email` with the built-in `fetch` and a 5 s `AbortSignal.timeout`.

**Alternatives we considered:** Brevo's official SDK package; SMTP with a mail library.

**Why this one:**
- We use **one** endpoint; an SDK would add a dependency (and its licence and updates) for one request.
- **We control every error message:** only the HTTP status and Brevo's short error code are kept, never the key, the address or the text (they end up in `alerts.error` and logs).
- Tests pass a fake `fetch`, so no test ever sends real mail.
- The timeout is ours: a slow Brevo can't hold the alert longer than 5 s.

**What we give up:**
- We write the request body ourselves; if Brevo changes its API, we change it by hand.

**We would reconsider if:** we needed many Brevo features (templates, contact lists).

### Resend as a stub only  (status: in use (`resendEmailProvider.ts`, W2-06))

**Used for:** `EMAIL_PROVIDER=resend` gives a provider that always throws "Resend is not configured: it needs our own domain, see ADR 0003", so those rows are `failed` and the other channels still work.

**Alternatives we considered:** a full Resend sender; leaving `resend` out of `EMAIL_PROVIDER`.

**Why this one:**
- Resend sends to other people only from our own verified domain, which we don't have (Q13, D11). A real sender now would be code we can't run or test.
- Keeping the name in the interface (ADR 0003) shows where a second provider plugs in, and the error says exactly what is missing.

**What we give up:**
- A value of `EMAIL_PROVIDER` that doesn't send anything.

**We would reconsider if:** we buy a domain.

### No `alerts` row when nothing was sent (`noop`, `"skipped"`)  (status: in use (`"skipped"` in `alertService.ts`, W2-05/W2-06))

**Used for:** a channel answers `"skipped"` (no push subscription, e-mail alerts off, no real address, a verdict that is not red, `EMAIL_PROVIDER=noop`), and the fan-out writes no row for it.

**Alternatives we considered:** a `sent` row anyway; a new `skipped` value in the `alert_status` enum.

**Why this one:**
- **The `alerts` table is our evidence of who was told how.** A `sent` e-mail row with `noop` (nothing left the server) would be false.
- No migration: `alert_status` keeps its values, and "no row" already means "not sent on this channel".
- Every family member still has the realtime row, so they still see the alert on the page.

**What we give up:**
- We can't see in the table *why* a channel had nothing to send (only in tests and logs).

**We would reconsider if:** we needed a per-member delivery report (then a `skipped` status with a reason).

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

### Pure TypeScript function with weights + hard rules + stem/fuzzy matching  (status: in use (`src/engine/`, Session H))

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

### A deterministic pure function (no clock, no randomness, no I/O)  (status: in use (`analyseCall()`))

**Used for:** `analyseCall(input) → Verdict` and `redactPersonalData(text, names)`.

**Alternatives we considered:** an engine service that reads the weights and keywords from the database on every call; adding time-based rules ("calls at night are riskier") inside the engine.

**Why this one:**
- **Same input → same verdict, always.** The family sees the server's verdict, and the phone shows its own when the network is slow (BUILD_PLAN 4.9); both must agree.
- **Easy to test:** a test is just "input → expected output", like testing a Python function with no side effects. That's why 170 engine tests run in under a second.
- **Old verdicts stay explainable:** every check stores `engineVersion`, and the same version always gives the same answer.
- Moderator keywords still reach the engine, but as a parameter (`extraKeywords`) that the service passes in, not as a hidden database read.

**What we give up:**
- Anything that needs the outside world (time of the call, the caller's number on a block list) must be added by the service as an input field, not looked up by the engine.

**We would reconsider if:** never for the core; extra context would become new input fields.

### Prefix stems ("light stemming") vs a full Bulgarian stemmer  (status: in use (`src/engine/fuzzy.ts`, `dictionary.ts`))

**Used for:** matching word forms: the stem `хвърл` matches хвърлете, хвърли, хвърлям; `полиц` matches полицията, полицай.

**Alternatives we considered:** a full Bulgarian stemmer (e.g. the BulStem rules or a Snowball-style stemmer), a morphological dictionary (all word forms), exact words only.

**Why this one:**
- **Explainable in one sentence:** "a stem is the beginning of a word". A full stemmer is hundreds of suffix rules we couldn't explain or test in four weeks.
- Bulgarian articles and plurals are endings (-ът, -та, -то, -те, -ове), so a beginning covers them for free.
- **Short stems are stricter** (our refinement of BUILD_PLAN 4.4): a 3–4 letter stem must be the whole word or the word + an article/plural ending, a 1–2 letter one the whole word. Otherwise `нап` (НАП) would match „напомняме“ and `не` would match „нещо“.
- No extra library: the engine stays dependency-free and runs on the phone.

**What we give up:**
- Stems with a changing root (вода / води is fine, but e.g. „дай“ / „дадете“) need two entries; Roberta adds them as data.
- A long-enough beginning can still hide inside an unrelated word; tests guard the important cases.

**We would reconsider if:** the dictionary grew so much that writing stems by hand became the bottleneck.

### Transliterate first, then fuzzy-match one Cyrillic dictionary (vs a separate Latin dictionary)  (status: in use (`normalise.ts`, `signals.ts`))

**Used for:** finding `politsiyata`, `hvarlete parite` and mixed texts like „От полицията сме, dayte pari“ with the same Cyrillic stems.

**Alternatives we considered:** a second dictionary with Latin spellings of every stem; matching Latin text directly with very loose fuzzy matching.

**Why this one:**
- **One dictionary to maintain.** A Latin copy would double Roberta's work and drift out of sync.
- People write шльокавица in many ways (`sh`/`6`, `ch`/`4`, `ya`/`q`); transliteration rules handle the spelling, fuzzy matching then absorbs the one-letter leftovers (`a` for ъ: `хварлете` ≈ `хвърл`).
- The dictionary's own Latin entries (`politsiya`, `pari`, `cvv`) go through the same normalisation, so they still work and don't need special code.

**What we give up:**
- A few spellings are ambiguous (`ia` → я turns `policia` into `полиця`); the dictionary lists such variants as data.

**We would reconsider if:** tests on real reports showed many Latin texts that transliteration gets wrong.

### One weights table + "each category counts once" (max of answer and text, vs summing every hit)  (status: in use (`src/engine/scoring.ts`))

**Used for:** the score: `WEIGHTS` holds three numbers per category (firm answer, unsure answer, text); a category adds the larger of its answer and text weight; the total is capped at 100.

**Alternatives we considered:** adding a weight for every matched word; adding answer and text weights together; weights spread over several files.

**Why this one:**
- **No double counting:** "money: yes" and „пари“ in the text are the same fact. Summing would turn one fact into 65 points, and a scammer who repeats „пари“ five times isn't five times more suspicious.
- **Predictable thresholds:** the BUILD_PLAN 4.7 worked examples (60 = red, 45 = yellow) only hold with max-per-category; they are tests now.
- **One table** is easy to show on a slide, to tune, and to test (a test compares it with BUILD_PLAN 4.5).

**What we give up:**
- More evidence of the same kind doesn't raise the score; combinations that matter are handled by hard rules instead.

**We would reconsider if:** real reports showed that repeated evidence really predicts scams; then we'd add a small, capped bonus.

### Hard rules as data objects (id + condition + explanation)  (status: in use (`src/engine/hardRules.ts`))

**Used for:** HR1–HR6 (D10): each is `{ id, explanationBg, categories, script, fires(signals) }`, and `firedHardRules()` keeps those whose `fires` returns true.

**Alternatives we considered:** a long `if … else if …` block inside the verdict code; very high weights instead of rules.

**Why this one:**
- **Reads like the table in BUILD_PLAN 4.6:** each condition is one line, e.g. `isFirm(s, "identity_police") && isFirm(s, "money")`.
- **Each rule is tested on its own** (fires on answers and on text, never on "unsure"), as D10 requires.
- The explanation, the evidence words and the linked script live next to the condition, so adding a rule touches one place.
- High weights could still be outvoted by the thresholds; a rule always forces red.

**What we give up:**
- A function inside a data object is a new idea for Python readers (it's like a dict with a lambda); the file has comments for that.

**We would reconsider if:** moderators needed to add rules without code; then rules would move to the database as data and the engine would interpret them.

### Typed dictionary and scenario data (status: in use; all 51 scenarios run and pass)

**Used for:** `DICTIONARY` in `src/engine/dictionary.ts` and `SCENARIOS` in `src/engine/__tests__/scenarios.ts`.

**Alternatives we considered:** keywords embedded in scoring functions, an untyped JSON file, and a second temporary matcher built just for Roberta's tests.

**Why this one:**
- Shared `DictionaryEntry` and `EngineScenario` types catch spelling mistakes in category names before runtime, like checking a Python TypedDict.
- Bulgarian stems cover inflections; explicit spelling variants document Latin ambiguity and frequent errors. Ordered phrases keep words such as courier or account from independently becoming high-risk evidence.
- Legitimate calls and uncertain answers are recorded alongside scams so the final engine must demonstrate both detection and restraint.
- Data-contract tests check coverage and consistency; since Session H, `scenarios.test.ts` also runs every scenario through the real engine (51/51 pass).

**What we give up:**
- Types and data checks cannot prove detection accuracy. Alex must connect the real runner and investigate failures with Roberta.
- Stem matching does not understand negation or quotations in general; hard-rule context and false-positive cases need careful review rather than more generic keywords.

**We would reconsider if:** real evaluated examples show that a stem is too broad or a phrase misses common wording; adjust the data together with regression scenarios.
### Damerau-Levenshtein distance for typos (vs plain Levenshtein)  (status: in use (`src/engine/fuzzy.ts`))

**Used for:** matching words with typos to dictionary stems (`хварлете` ≈ `хвърл`).

**Alternatives we considered:** plain Levenshtein, exact matching only, a full spell-checker, phonetic algorithms (Soundex).

**Why this one:**
- Like Levenshtein, but **a swap of two neighbouring letters counts as one edit**, which is a very common typing mistake on small phone keyboards.
- Easy to explain and to code ourselves (a dynamic-programming table, like in a Python algorithms class). We use the "optimal string alignment" version: plain Levenshtein + one extra case for a swapped pair, about 10 more lines. The full Damerau-Levenshtein needs an extra alphabet table and only differs for edits on already swapped letters, which never matters for 5–12 letter stems.
- Plain Levenshtein would count `хврълете` vs `хвърлете` as 2 edits, so a 5–8 letter stem (1 edit allowed) would miss the most common phone typo.
- The tolerance depends on word length (0 edits for short stems), which avoids false matches.
- Soundex-style algorithms are designed for English names, not Bulgarian.

**What we give up:**
- It's slower than exact matching (fine: our texts are at most 2000 characters).
- Fuzzy matching can create rare false matches; we test for them.

**We would reconsider if:** tests showed too many false matches; then we'd tighten the tolerance.

### Own transliteration for шльокавица (Latin-script Bulgarian)  (status: in use (`src/engine/transliterate.ts`))

**Used for:** turning `politsiya`, `hvarlete parite ot terasata` and `ne ka6ete` into Cyrillic before matching.

**Alternatives we considered:** the official Bulgarian transliteration standard only, a library, separate Latin keyword lists.

**Why this one:**
- People type шльокавица in many ways (`sh`, `6`, `w`, `q` for я...), not by the official standard (which is meant for Cyrillic → Latin, the other direction).
- Our own rules (longest match first) are small, tested, and we can explain each one.
- One Cyrillic dictionary instead of two keyword lists to keep in sync.

**What we give up:**
- Some spellings are ambiguous (`a` for `ъ`, `y` for `ъ` or `й`); fuzzy matching covers part of that, not all.

**We would reconsider if:** we found a maintained library that handles real-world шльокавица better than our rules.

### The same engine on the phone as an offline fallback  (status: in use (Q6; `src/components/protected/CallCheck.tsx` + `upload.ts`, W2-01))

**Used for:** if `PUT /api/checks/:id/answers` fails or takes more than 4 s, the phone runs `analyseCall()` itself, shows that verdict at once with the note „Резултатът е изчислен на телефона — семейството може още да не е уведомено.“, and keeps sending the answers in the background (after 2, 4, 8, 15 and 30 s).

**Alternatives we considered:** server-only verdict (wait, then show an error when offline); an error with a „Опитай отново“ button; a service worker that queues the request (Background Sync); computing the verdict only on the phone.

**Why this one:**
- The red „Затворете телефона.“ must never depend on Wi-Fi: on a bad connection the person sees it in under 5 s anyway.
- It costs almost nothing because the engine is pure TypeScript with no dependencies; the phone and the server compute the same verdict from the same answers.
- The server verdict stays the official one: the family sees only what the server computed, and a late server answer replaces the local one on the phone.
- Plain retries in the page are easy to explain and to test with fakes (`upload.test.ts`); Background Sync works only in some browsers and needs the service worker (W2-09).
- An error screen would leave a frightened person with nothing at the worst moment.

**What we give up:**
- The engine code is visible in the browser (fine: it holds no secrets).
- If the page is closed before a retry gets through, the answers are lost (the family was still alerted by the big button, if that request arrived); the note says the family may not know yet.

**We would reconsider if:** the engine needed secret data (it doesn't), or a real phone showed many lost answers; then Background Sync in the service worker.

### Green verdict never says "safe"  (status: in use (D9; `verdict.ts` uses `bg.verdict.green`, tested word for word; the `Verdict` component and the call-check screen also take the words only from `bg.verdict`))

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

### Rolling 7- and 28-day windows for scam waves (vs calendar weeks)  (status: in use (`mapStatsService.ts`, W3-01))

**Used for:** the "scam wave" rule (Q10): ≥ 5 approved reports of one script in a district in the **last 7 days**, and at least 2× the weekly average of the **28 days before**. Both come from `get_map_stats(1)` and `get_map_stats(5)` minus it; `unknown` never forms a wave.

**Alternatives we considered:** calendar weeks (Monday–Sunday, the `week_start` rows of `get_map_stats`); a new SQL function only for waves; a moving average over 12 weeks.

**Why this one:**
- **A calendar week resets every Monday:** on a Monday "this week" has 1 day of reports, so a real wave would disappear from the map for days. A rolling window always looks at the full last 7 days.
- **No migration:** `get_map_stats` already counts a rolling window (`occurred_on > current_date - 7 × weeks`), so (5 weeks) − (1 week) is exactly the 28 days before. Nothing to apply in the SQL Editor.
- **Whole numbers:** `last × 4 ≥ 2 × previous` instead of `last ≥ 2 × previous / 4`, so no rounding edge cases; a pure function tested at the exact edges.
- **`unknown` is "we couldn't tell"**, not a script; „вълна от схемата Неизвестна“ would help nobody.

**What we give up:**
- Three database calls per map request instead of one (fine with the 60 s CDN cache).
- The calls run a moment apart; a report approved (or midnight passing) in between can shift the difference by one (we clamp it to ≥ 0).

**We would reconsider if:** the map got so many visitors that one SQL function returning the wave flags directly became worth a migration.

---

### Moderator keywords attach to an existing scenario category (vs new weights, vs editing `dictionary.ts`)  (status: in use (`src/server/services/moderatorKeywords.ts`, W3-05))

**Used for:** a moderator adds word stems (e.g. „томбол“) to a published scam card in `/moderator/scripts`. The check service passes them to `analyseCall()` as `extraKeywords`; each stem joins the scenario category of its card (`police` → `scenario_police`, `relative_in_trouble` → `scenario_relative`, `fake_official` → `scenario_official`, `courier` → `scenario_courier`; `unknown` is skipped).

**Alternatives we considered:** letting the moderator choose a weight per keyword; letting the moderator pick any category (also `money` or `handover`, which can fire hard rules); a new "moderator" category with its own weight; changing `dictionary.ts` in code and redeploying.

**Why this one:**
- **The scoring stays explainable and tested.** The weights in `scoring.ts` and the hard rules (D10) are covered by 51 scenario tests; a weight typed into a form would bypass all of them. A keyword can only add evidence to a category that already exists, at most once (each category counts once), so it can raise a score by at most that category's weight (10–15).
- **No accidental red.** Scenario categories don't fire hard rules on their own, so a careless keyword can't force a red verdict for normal calls.
- **No deploy needed.** New scammer phrases appear every month; a moderator teaches them in a minute without a developer.

**What we give up:** a moderator can't teach a new *kind* of signal (e.g. a new hard rule); that still needs a code change and tests. The phone's offline fallback runs the engine without the moderator keywords, so offline it can be slightly lower (the server verdict stays the official one).

### Education cards in the database (vs hard-coded pages, vs Markdown files)  (status: in use (`scam_scripts`, migration `20261109000001`, `/kak-raboti`, W3-05))

**Used for:** the four „Как работи измамата“ cards and the moderator's keywords live in the `scam_scripts` table; `/kak-raboti` reads the published rows at request time.

**Alternatives we considered:** texts in `bg.ts` with one page per script; Markdown files in the repo; a headless CMS.

**Why this one:**
- **Moderators can change them** without a developer, a commit or a deploy (brief 5.2 F: "script library editor"), with RLS deciding who may write (moderators insert/update, only admins delete) and an audit line for every change.
- **One place for the card and its keywords:** publishing a card also switches its keywords on for the engine, and unpublishing switches them off.
- **Starter cards come with the schema** (a migration with `on conflict (slug) do nothing`), so every new database, the test database included, has them, and running it twice changes nothing.

**What we give up:** the card texts are not in `bg.ts`, so the proofreading of W4-06 must also read the migration and the live rows; a CMS would have rich text and image upload, which we don't need.

### 60-second in-memory cache for the moderator keywords (vs a query per check, vs `"use cache"`, vs build-time)  (status: in use (`createKeywordCache`, W3-05))

**Used for:** the stems of all published cards are read at most once per 60 seconds per server instance (module-level variable), with the cookie-less public client.

**Alternatives we considered:** reading them on every check; Next.js `"use cache"` with `cacheLife`; reading them once at `next build`; no keywords at all when the database is slow.

**Why this one:**
- **The check is the most important request** of the app; one tiny extra query per minute is nothing, one per check would add a round trip to grandma's 30 seconds.
- **Plain and testable:** a function with a clock passed in (like `functools.lru_cache` with an expiry), unit-tested with a fake clock, no framework magic in a service.
- **Never blocks a check:** a failure keeps the last good stems (or none) and the engine still has its own dictionary; a failure is also cached for 60 s, so an outage doesn't add a slow failing query to every check.
- **Never frozen:** a moderator's new keyword works within a minute; a build-time list would wait for the next deploy.

**What we give up:** on Vercel each server instance has its own cache, so for up to a minute two instances can use different keyword lists. For a teaching feature that is fine.

### Admin statistics counted in TypeScript (vs a SQL function like `get_map_stats`, vs a view)  (status: in use (`adminStats.ts`, `adminService.getStats()`, W3-06))

**Used for:** `GET /api/admin/stats`. The server reads three columns of `checks` and of `reports` for the period (1000 rows per request, at most 20 pages per table), and the pure function `shapeStats()` counts them by Sofia calendar day, level, script type, district and status.

**Alternatives we considered:** a new SQL function (`GROUP BY` in PostgreSQL, like `get_map_stats`, 5.10); a database view; Supabase's aggregate functions in PostgREST.

**Why this one:**
- **No migration:** nothing to run in the SQL Editor before a push, no new pgTAP tests, no risk to the live database three weeks before the deadline.
- **RLS still applies:** the rows are read with the admin's own user client, so the database checks the admin role; a `SECURITY DEFINER` function would have to repeat that check itself.
- **Pure and unit-tested:** Sofia days (a check at 00:30 Sofia time belongs to that day, not to the UTC day before), zero days and the top 10 are exact edge cases in `adminStats.test.ts`.
- Our numbers are small (tens of checks a day); 20,000 rows per table is far above what the tournament will produce.

**What we give up:**
- More data over the network than a `GROUP BY` answer; slower with many rows.
- Above 20,000 rows the numbers are incomplete; the page then says so („… числата може да не са пълни…“) instead of hiding it.

**We would reconsider if:** a real launch brought thousands of checks a day; then a SQL function with `GROUP BY date_trunc('day', started_at AT TIME ZONE 'Europe/Sofia')`.

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

### Dependency-injected fakes in unit tests (vs `vi.mock`, vs a live Supabase)  (status: in use (`pairingService`, `authService`, `loadActor`, rate limiter, and the Week 2 check, alert, push, e-mail, person, contact and invite services))

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

### Preview pages without the role guard for the browser tests (vs a test login, vs component tests)  (status: in use (W2-07: `/dev/family`, `/dev/family/new`, `/dev/family/person`; W2-01: `/dev/protected`; W2-03: `/dev/family/alerts`; W3-06: `/dev/admin`))

**Used for:** testing the family dashboard in a real browser in CI, where there is no database.

**Alternatives we considered:** a real test account in a test Supabase project; a "test mode" switch that lets the role guard accept a fake user; Playwright component testing (`@playwright/experimental-ct-react`).

**Why this one:**
- The real `/family` pages need a real login (the proxy and `requirePageRole` ask Supabase). The preview pages render the same components without that frame, and `page.route()` answers their API calls, so the tests cover the real UI.
- Safe: the previews contain no data; every API call still needs a login, so on the real site they only show „Моля, влезте в профила си.“ A "test mode" switch in the role guard would be a dangerous back door.
- No new tool: the same Playwright set-up and the same idea as `/dev/ui` and the auth form tests.

**What we give up:**
- The previews don't test `FamilyGate` itself (that is `auth-guards.spec.ts`) or the real API (unit tests and the live check do).
- Three extra public addresses (marked `noindex`).

**We would reconsider if:** we had a test Supabase project in CI; then one end-to-end test with a real login (W2-11).

### pgTAP for database and RLS tests  (status: in use (9 test files, 171 assertions))

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

**Used for:** on every push to `main`: lint, type check, format check, unit tests with coverage, production build, Playwright tests, and database/RLS tests (`.github/workflows/ci.yml`). A second workflow keeps Supabase awake (`keep-alive.yml`, section 9).

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

### Vercel Hobby (free)  (status: decided; `vercel.json` ready, Vercel project pending (W1-13, Mon 9 Nov))

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

### Region Frankfurt (Supabase `eu-central-1`, Vercel `fra1`)  (status: in use for Supabase; Vercel: set in `vercel.json`, applies from the first deploy)

**Used for:** where our database and server functions run. The Vercel part is one line in `vercel.json`: `"regions": ["fra1"]`.

**Alternatives we considered:** the default US regions (new Vercel projects default to Washington, D.C., `iad1`), other EU regions; for *how* to set it: Next.js's `export const preferredRegion` in each route, or the setting in the Vercel dashboard.

**Why this one:**
- **GDPR:** personal data of Bulgarian users stays in the EU.
- **Low latency to Bulgaria**, and the database and functions are in the same city, so each query is fast. With the default `iad1`, every database query from a function would cross the Atlantic and back.
- **`vercel.json` instead of `preferredRegion`:** `preferredRegion` is deprecated in Next.js 16 and on Vercel only accepts `auto`, `global` or `home` (Next.js docs in `node_modules/next/dist/docs/`). `vercel.json` is Vercel's project-wide setting, lives in git (so it can't be forgotten in a dashboard) and the `$schema` line lets editors check it.
- On Hobby, functions run in exactly **one** region, which is what we set.

**What we give up:**
- Visitors far from Europe get slower answers (not our users).
- `vercel.json` is Vercel-specific; another host would ignore it.

**We would reconsider if:** a Bulgarian or closer region became available on the free tier.

### Health check on a public table with the publishable key (vs the service-role key)  (status: in use (`GET /api/health`, `src/server/services/healthService.ts`))

**Used for:** `/api/health` proves the database answers by reading one row of the public `districts` table, as a guest (user client, no login cookie, publishable key only). 200 `{ok:true, db:true, time}` or 503 `{ok:false, db:false}`, never cached, 5 s timeout.

**Alternatives we considered:** the admin client with the service-role key (BUILD_PLAN 2.4 had listed it); `select 1` through a database function; returning `{ok:true}` without touching the database; Supabase's own status endpoints.

**Why this one:**
- **Least privilege:** the route is public and called by machines. With the service-role key a bug here could read or change everything (RLS bypassed); with the publishable key the worst case is reading the 28 district names, which are public anyway.
- **A real query through PostgREST and RLS** is what keeps the free project awake and also proves our whole path works (URL, key, network, database). `{ok:true}` without a query would keep Vercel busy but let Supabase pause.
- `districts` already exists and is readable by `anon` (migration 4), so no new database function or migration is needed. `select 1` would need an RPC function just for this.
- The error answer has no details, so the public endpoint can't leak hosts or settings; the reason goes to the server log.

**What we give up:**
- It proves that *reading* works, not that writing or Auth works. That is enough for "is the site alive"; the e2e and smoke tests cover the rest.
- If someone removed the public read policy on `districts`, health would turn red (which we'd notice at once).

**We would reconsider if:** we needed a deeper check (e.g. Auth and e-mail too); that would be a separate, secret-protected endpoint.

### Cookie-less public client + 60 s CDN cache for the map (vs the user client, vs no cache, vs a static page)  (status: in use (`src/server/supabase/publicClient.ts`, `GET /api/map/stats`, W3-01))

**Used for:** `GET /api/map/stats` reads `get_map_stats` with a client that has only the publishable key and **no cookies** (always a guest), and answers with `Cache-Control: public, max-age=0, s-maxage=60`.

**Alternatives we considered:** the user client (cookies); the admin client; no caching (`no-store`); building the numbers once at `next build`; a longer cache.

**Why this one:**
- **The same answer for everybody**, so the CDN may share it: at most one database round per minute however many people open the map (protects the free tier, D11). A client that reads cookies could make the answer depend on the visitor, and sharing that would be unsafe.
- **Least privilege:** guest rights are enough (`get_map_stats` is open to `anon`); the service-role key isn't needed (like the health check above).
- **60 s, browsers 0:** a moderator's approval shows on the map within a minute; browsers always ask the CDN again, so nobody looks at an hour-old map.
- **Never built at `next build`** (`await connection()`): otherwise the map would show the numbers of the deploy day for ever.

**What we give up:**
- Up to 60 s delay after an approval.
- A cache is one more thing to explain; errors are not cached (`no-store`), so a short database problem doesn't stick for a minute.

**We would reconsider if:** moderators needed to see their decision on the map at once (then a shorter `s-maxage`, or a purge after approval).

### Keep-alive: GitHub Actions schedule (vs Vercel cron, vs only an external uptime monitor)  (status: in use (`.github/workflows/keep-alive.yml`); `HEALTH_URL` secret pending the first deploy)

**Used for:** a GitHub Actions scheduled job (`cron: "17 */12 * * *"`, plus a manual *Run workflow* button) calls `/api/health`, which touches the database, every 12 hours, so the free Supabase project never pauses (risk R1). It reads the URL from the repository secret `HEALTH_URL`; while that is empty it prints a notice and stays green.

**Alternatives we considered:** a Vercel cron job (`crons` in `vercel.json`); only an external uptime monitor; upgrading Supabase; hoping someone visits the site.

**Why this one:**
- The rules say the site must be online for the whole judging period (risk R1).
- **Vercel Hobby cron jobs run at most once a day** (risk R13) and their timing is not exact; once a day would still beat the ~7-day limit, but it gives no run history we can show and it runs *inside* Vercel, so it can't tell us when the whole deployment is broken. It would also need a `CRON_SECRET` check.
- **Only an uptime monitor** (UptimeRobot etc.) depends on a third-party account staying active and its free terms; its settings live outside our repo. We still plan one (next entry) for alerts, but the keep-alive itself is code in git that anyone can read.
- **GitHub Actions schedules are free**, the schedule is a file in our repo, and every run is listed in the Actions tab (evidence for the jury). `curl --fail` turns a 503 into a red run.
- Every 12 hours is far more often than needed, so a few delayed or skipped runs don't matter.

**What we give up:**
- GitHub may delay scheduled runs, and it **disables scheduled workflows in public repos after 60 days without commits** (not a risk during the competition); we check the dashboard daily from 29.11 to 6.12.
- Someone must set the `HEALTH_URL` secret once after the first deploy, or the job pings nothing (it says so in its log).

**We would reconsider if:** Supabase changed its pausing rules (check current limits), or we moved to a paid plan that never pauses.

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

### Local TypeScript demo seed with tsx 4.23.15 (status: tooling in use; live apply pending)

**Used for:** executing `scripts/seed.ts` on a computer, with existing typed service imports and a scoped CLI config.

**Alternatives we considered:** copying pairing into a standalone JavaScript script, Node type stripping alone, and globally enabling the React server condition.

**Why this one:**
- tsx (MIT) resolves the existing aliases and extensionless service imports without duplicating business logic. Node stripping alone cannot resolve all existing imports.
- A CLI-only config handles `server-only` for this trusted local process without weakening browser builds; the global React server condition breaks Next navigation imports.
- The default is an offline preview. Applying requires an exact target, local password and empty Auth/user tables, with no automatic reset or cleanup.
- The service-role key stays local and is used for demo setup; ordinary role sessions create the person and exercise the existing pairing service. Internal device credentials are never published.

**What we give up:**
- One pinned development dependency and a CLI config to maintain. The setup is not transactional across Supabase Auth and PostgreSQL; failures require inspection before retrying.
- Fixtures and offline tests do not prove live login or delivery. Real demo-account checks and pairing need the approved database. A CLI session does not log a physical browser in.

**We would reconsider if:** the service import structure changes enough that Node alone can execute the same shared logic without a runner.
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

### `.catch()` fallback for optional environment variables (vs failing fast for every variable)  (status: in use (`src/lib/env.ts`: `EMAIL_PROVIDER`, `EMAIL_FROM`, `SITE_URL`, `VAPID_SUBJECT`))

**Used for:** a wrong value in an optional extra (e.g. `EMAIL_PROVIDER=gmail`, an `EMAIL_FROM` without `@`) logs `[env] NAME has an invalid value and is ignored; using the safe default.` and uses the safe value (`noop`, nothing, the default subject). Required values (Supabase keys, peppers) still stop with a clear error.

**Alternatives we considered:** failing fast for every variable (the earlier version); reading optional variables without Zod.

**Why this one:**
- `getServerEnv()` runs in almost every API route (admin client, rate limiter). With fail-fast, a typo in an **e-mail** setting would make those routes answer 500, including grandma's big button. An extra must at most switch itself off.
- The warning names the variable, never its value (same rule as the main check), so the mistake is still easy to find in the Vercel logs.
- Zod's `.catch()` keeps one schema and one type; no second hand-written check.

**What we give up:**
- A wrong optional value no longer stops the deploy; someone has to read the warning (`src/lib/env.test.ts` covers each fallback).

**We would reconsider if:** never for extras; required values stay fail-fast.

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

- 2026-11-03 · documented the local-only tsx seed runner, scoped server-only alias, explicit empty-target setup and limits of offline verification.
- 2026-11-04 · Session H (engine logic): new entries in section 7 (deterministic pure function, prefix stems vs a full stemmer, transliterate-then-fuzzy vs a Latin dictionary, weights table + max per category, hard rules as data objects); Damerau-Levenshtein entry explains OSA vs plain Levenshtein; redaction entry now compares regex + Luhn with an NLP library; statuses of the engine, dictionary/scenarios, Damerau-Levenshtein, transliteration, D9 wording and redaction moved to "in use"
- 2026-11-04 · Session I (W1-13 code): new entry "Health check on a public table with the publishable key (vs the service-role key)"; keep-alive entry rewritten as GitHub Actions vs Vercel cron vs only an uptime monitor, now in use; Frankfurt entry explains `vercel.json` `regions` vs the deprecated `preferredRegion`; Vercel Hobby status updated (project pending)
- 2026-11-04 · Week 2 backend (W2-02, W2-03, W2-04, W2-08): new entries in section 3 (server-side verdict; redact before storing; Realtime token endpoint vs readable cookies; contact list through one SQL function, SECURITY INVOKER, vs REST calls / upsert / more column rights / SECURITY DEFINER; invite tokens 256 bits + HMAC + 7 days; refusals don't burn invites) and section 5 (`AlertChannel` interface; Realtime as a doorbell + 5 s polling fallback; own Realtime client with `accessToken` vs `setAuth`); statuses updated for REST API, Supabase Realtime, server-only writes, HMAC, rate limiting, redaction, DI fakes, pgTAP
- 2026-11-04 · W2-05 web push + W2-06 e-mail (backend): Web Push entry now in use and compares `web-push` 3.6.7 with hand-written encryption and Firebase FCM; Brevo entry now in use (real e-mail pending a Brevo account); new entries: VAPID public key from a route vs `NEXT_PUBLIC_`, push endpoint allowlist (SSRF), push upsert = delete + insert vs an UPDATE grant, plain `fetch` vs Brevo's SDK, Resend as a stub, no `alerts` row when nothing was sent (`noop`, `"skipped"`), `Promise.all` for the alert sends, `.catch()` fallback for optional env vars vs failing fast; `AlertChannel`, rate limiting and DI-fakes statuses updated
- 2026-11-05 · W2-13 (D22): new entries in section 4: shared root layout for the header and footer (vs a header in every page), compact theme switch in the header (vs the full-width field, a select, a cycling button, a menu button), home page that explains the 3 steps; design-system entry points to the new switch
- 2026-11-05 · W2-07 family dashboard (Roberta): new entries in section 4 (Client Components that call our API vs Server Components that read the database; ↑ / ↓ buttons vs drag and drop; `qrcode` 1.5.4 in the browser vs our own QR code vs an online QR service) and section 8 (preview pages without the role guard for the browser tests vs a test login, a test mode, component tests)
- 2026-11-05 · logged-in header (Roberta): new entry in section 4 "Logged-in header menu read on the server inside `<Suspense>`" (vs `GET /api/me` in the browser, vs no `<Suspense>`, vs a bar per area); shared-root-layout entry no longer lists the missing logged-in menu
- 2026-11-05 · W2-01 call check (Roberta): new entries in section 4 "Call check: one question per screen (vs one long form)" and "Praise first on the red result (vs only the warning)"; "The same engine on the phone as an offline fallback" now in use (4 s, background retries, server verdict stays official; vs an error screen, Background Sync, phone-only verdict); D9 and preview-page entries updated
- 2026-11-06 · W2-03/W2-04/W2-05 UI/W2-10 (Alex): new entries in section 4 (`useSyncExternalStore` for `?check=` vs `useSearchParams` + `<Suspense>`; Web Audio beep vs a sound file; one sentence per tap vs continuous listening; `FEATURE_VOICE` read at request time vs at build time) and section 5 (10 s safety poll while Realtime is connected vs trusting Realtime alone, the fix of the missed family message; one Realtime channel for all people vs one per person; 1.5 s cap on the push unsubscribe at logout); Web Speech API entry now in use, compared with recording and sending audio, with the honest note that Chrome's recognition runs on the browser's speech service; Realtime, Web Push and preview-page entries updated.
- 2026-11-06 · W2-14 invite page + W2-06 wording (Roberta): new entries in section 3 "Invite page: send the token at once, remove it with `replaceState`, `no-referrer`" (vs a button, a server redirect, a lookup before redeeming) and "Safe `next` redirect after login" (vs an open redirect, no redirect, `sessionStorage`, an allowlist); the invite-token entry's open point (page must POST at once, `no-referrer`) is now done
- 2026-11-06 · W2-09 PWA (Roberta): new entries in section 4 "Web app manifest via the Next.js file convention" (vs a static `manifest.json`, vs a PWA plugin), "Own app icons generated from SVG with Playwright's Chromium" (vs icon sets, online generators, `sharp`) and "Offline card only on failed page loads" (vs caching app pages, vs no offline support); the PWA entry is now in use and names the manifest as the iPhone push condition
- 2026-11-09 · W3-01 public reports API (Alex): new entries "Honeypot: a silent 201 (vs an error, vs a CAPTCHA)" and "Caller number stored only as an HMAC" (section 3), "Rolling 7- and 28-day windows for scam waves (vs calendar weeks)" (section 7), "Cookie-less public client + 60 s CDN cache for the map" (section 9); server-only writes now explain the missing `anon` INSERT policy on `reports`; HMAC and rate-limiting entries now in use for reports
- 2026-11-09 · W3-05 scam-script library (Roberta): new entries in section 7 "Moderator keywords attach to an existing scenario category", "Education cards in the database" and "60-second in-memory cache for the moderator keywords"
- 2026-11-10 · W3-02 report form + W3-06 admin area (Alex): new entries in section 3 "Off-screen honeypot field" (vs `display:none`, `type="hidden"`, a CAPTCHA), "Compare-and-set role change" (vs a plain UPDATE, a version column), "Admins can't change their own role" (vs only no self-demotion) and "Allow-listed audit summary" (vs raw JSON, a block-list); section 4 "Native `<select>` and date input on the report form" (vs a date-picker library) and "Hand-made bar charts from HTML and CSS", which replaces "Recharts for admin statistics" (Q9; no new dependency); section 7 "Admin statistics counted in TypeScript" (vs a SQL function); honeypot entry and preview-pages status updated
- 2026-11-10 · W3-03 map + W3-04 moderation API (Roberta): section 4 "Leaflet + OpenStreetMap" replaced by "Leaflet 1.9.4 without a base map" (vs OSM tiles, Google Maps / Mapbox, a hand-drawn SVG), new entry "Natural Earth district shapes, simplified by rounding" (vs OSM-derived, geoBoundaries; public domain, about 56 KB); section 3 new entries "Compare-and-set moderation" (vs a plain UPDATE, read-then-update, a lock) and "Repeat-caller count without showing the hash"
- 2026-11-10 · W3-04 moderation screen (Alex): section 4 new entries "One-click „Одобри“ vs a confirmation window for „Отхвърли“" (vs confirming both, vs undo), "Quick-pick reject reasons + a required free-text reason" (vs free text only, vs a fixed list) and "Repeat-number badge shows only the count" (vs the number, vs a link)

- 2026-11-11 · W3-08: nested help pages reuse the existing role layouts and one server-rendered guide component. Each role sees instructions for the controls it uses, and the steps remain readable without JavaScript.

- 2026-11-11 · Report form and moderation queue helper filenames use a Helpers suffix so TypeScript can resolve the component and helper imports on case-insensitive Windows filesystems.

- 2026-11-11 · W3-08 screenshots use the existing test previews with fictional data. The images match the current controls and the ordered text instructions remain available at every screen width.

- 2026-11-11 · W3-10: a browser print stylesheet lets the team maintain one copy of the card. The permanent pairing URL on the QR remains valid when an individual pairing code expires.
