# Scamly

> Scamly – уеб приложение, което помага на възрастните хора да разпознаят телефонна измама за 30 секунди и предупреждава близките им.

Scamly is a web app (PWA) that helps older people in Bulgaria recognise phone scams. During or
right after a suspicious call, the person answers a few big-button questions and gets a clear
verdict in about 30 seconds, while their family is alerted at once. Guests can read about
current scam scripts, see a map of reported scams by district and report a scam themselves.

The full project description is in [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md), and the
build plan is in [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md).

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router) with [React](https://react.dev/) 19 and
  TypeScript (strict mode)
- [Tailwind CSS](https://tailwindcss.com/) 4 for styling
- [Zod](https://zod.dev/) for checking data and environment variables
- [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Auth, Realtime), EU region
- [Vitest](https://vitest.dev/) for unit tests, [Playwright](https://playwright.dev/) for
  end-to-end tests
- ESLint + Prettier, GitHub Actions for CI, hosted on Vercel

All services we use are free. All libraries are free and open source (see
[`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)).

## Setup

You need [Node.js](https://nodejs.org/) 22 (see `.nvmrc`) and git.

```bash
git clone https://github.com/AVGe0rgiev23/Scamly.git && cd Scamly
npm ci
cp .env.example .env.local
npm run dev
```

Then open <http://localhost:3000>. Fill in `.env.local` with your own keys when a feature needs
them; each variable is explained in [`.env.example`](./.env.example).

## npm scripts

| Command                 | What it does                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Starts the app in development mode on port 3000                                                                                             |
| `npm run build`         | Builds the app for production                                                                                                               |
| `npm run start`         | Starts the production build (run `build` first)                                                                                             |
| `npm run lint`          | Checks the code with ESLint                                                                                                                 |
| `npm run typecheck`     | Checks the TypeScript types                                                                                                                 |
| `npm test`              | Runs the unit tests once (Vitest)                                                                                                           |
| `npm run test:watch`    | Runs the unit tests again on every file change                                                                                              |
| `npm run test:coverage` | Runs the unit tests and writes a coverage report to `coverage/`                                                                             |
| `npm run e2e`           | Builds the app and runs the browser tests (Playwright)                                                                                      |
| `npm run test:db`       | Runs the database and RLS tests (pgTAP) on a throwaway local PostgreSQL 16 with pgTAP installed (Linux; CI uses `supabase test db` instead) |
| `npm run format`        | Formats all files with Prettier                                                                                                             |
| `npm run format:check`  | Checks that all files are formatted                                                                                                         |
| `npm run check`         | `lint` + `typecheck` + `format:check` + `test`: run before push                                                                             |

With the Supabase CLI and Docker you can also run `supabase db start` and `supabase test db`.

The first time you run `npm run e2e` on your own computer, install the browser with
`npx playwright install chromium`.

## Demo accounts and seed

`npm run seed` prints an offline plan and makes no database connection. To create demo data, first agree with Alex which **empty** Supabase database to use and apply all migrations. Put its keys and peppers in your ignored `.env.local`, plus a local `SEED_DEMO_PASSWORD` of 12–72 characters. Never paste that password or keys into a chat or commit.

Then run the write command with that database public URL:

```sh
npm run seed -- --apply --target https://APPROVED-PROJECT.supabase.co
```

The target must match `NEXT_PUBLIC_SUPABASE_URL`. The script refuses existing Auth users or rows in user-data tables and never resets or deletes them. If a step fails after writes began, it stops; inspect the demo database with Alex before retrying. This is initial setup for an empty database, not a reset command.

| Role                           | Login                                                   | Password                                               |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Близък (family owner)          | `family@demo.scamly.invalid`                            | Local `SEED_DEMO_PASSWORD`                             |
| Втори близък (trusted contact) | `contact@demo.scamly.invalid`                           | Local `SEED_DEMO_PASSWORD`                             |
| Модератор                      | `moderator@demo.scamly.invalid`                         | Local `SEED_DEMO_PASSWORD`                             |
| Администратор                  | `admin@demo.scamly.invalid`                             | Local `SEED_DEMO_PASSWORD`                             |
| Защитен човек (device)         | No email/password entry; pair the browser at `/svarzhi` | Random internal credentials are never printed or saved |

The human accounts are confirmed automatically. The seed creates one protected person, two linked contacts (the owner plus another family member), one paired device using the existing pairing service, two sample checks and two reports. Check verdicts are synthetic fixtures marked `demo-fixture-1`; they are not detection-engine results.

A CLI-created device session cannot become a cookie in your browser. Pair the actual demo phone separately using a fresh code and `/svarzhi`. The family code-generation screen is still planned; the owner-only API is `POST /api/persons/:id/pairing-codes`. Seed application and real-account browser verification have not yet been performed on Roberta's computer.

## Deployment (Vercel)

Free Vercel Hobby plan, Frankfurt region. Done once by Alex (task W1-13).

1. On [vercel.com](https://vercel.com/), **Add New → Project** and import this GitHub repo.
   The framework (Next.js) is detected automatically; keep the default build settings.
2. Region: `vercel.json` already pins the functions to **`fra1`** (Frankfurt). Check it under
   Project → Settings → Functions after the first deploy.
3. Under **Environment Variables**, add these 5 (values from the Supabase dashboard and from
   `openssl rand -hex 32`; see [`.env.example`](./.env.example)):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `PAIRING_PEPPER`, `HASH_PEPPER`. Never put them in git or in a chat.
4. **Deploy.** Then open `https://<project>.vercel.app/api/health`: it must answer
   `{"ok":true,"db":true,…}`. (After changing a variable, redeploy: Vercel applies variables to new
   deployments only.)
5. On GitHub: Settings → Secrets and variables → Actions → **New repository secret**
   `HEALTH_URL` = the full URL from step 4. Then Actions → **Keep-alive** → Run workflow, and check
   that the run is green. From then on it runs every 12 hours and keeps the free Supabase project
   from pausing.
6. In Supabase: **Authentication → URL Configuration → Site URL** = the production URL
   (`https://<project>.vercel.app`), so links in sign-up e-mails point to the live site.

## Licence

Scamly is free software, released under the
[GNU General Public License v3.0](./LICENSE) (`GPL-3.0-only`). The licences of the libraries
and data we use are listed in [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md).

## Authors

- Alex Georgiev
- Roberta Hristova
