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

## Demo accounts

| Role                               | Login            | Password         |
| ---------------------------------- | ---------------- | ---------------- |
| Близък (family member)             | coming in Week 1 | coming in Week 1 |
| Модератор (moderator)              | coming in Week 1 | coming in Week 1 |
| Администратор (administrator)      | coming in Week 1 | coming in Week 1 |
| Защитен (protected person, device) | coming in Week 1 | coming in Week 1 |

## Licence

Scamly is free software, released under the
[GNU General Public License v3.0](./LICENSE) (`GPL-3.0-only`). The licences of the libraries
and data we use are listed in [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md).

## Authors

- Alex Georgiev
- Roberta Hristova
