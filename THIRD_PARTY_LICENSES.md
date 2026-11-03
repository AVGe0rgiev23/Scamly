# Third-party licences

Scamly is released under the [GNU General Public License v3.0](./LICENSE) (`GPL-3.0-only`).
It is built on the free and open-source software listed below. Every licence here is
compatible with GPL-3.0.

The versions and licences are read from each package's own `package.json` in
`node_modules`. Update this file whenever a dependency is added, removed or upgraded.

## Runtime dependencies

These are part of the app that runs on the server and in the browser.

| Package               | Version | Licence | What we use it for                                              |
| --------------------- | ------- | ------- | --------------------------------------------------------------- |
| @supabase/ssr         | 0.12.7  | MIT     | Keeps the Supabase login session in cookies (server and proxy)  |
| @supabase/supabase-js | 2.118.0 | MIT     | Talks to our Supabase database, Auth and Realtime               |
| next                  | 16.4.4  | MIT     | Web framework (pages, API routes, build)                        |
| react                 | 19.3.1  | MIT     | User-interface library                                          |
| react-dom             | 19.3.1  | MIT     | Draws React components in the browser                           |
| server-only           | 0.0.1   | MIT     | Makes the build fail if browser code imports a server-only file |
| zod                   | 4.6.7   | MIT     | Checks input data and environment variables                     |

## Development dependencies

These are only used while writing, checking, testing and building the code.

| Package                | Version | Licence    | What we use it for                                        |
| ---------------------- | ------- | ---------- | --------------------------------------------------------- |
| @playwright/test       | 1.63.0  | Apache-2.0 | End-to-end tests in a real browser                        |
| @tailwindcss/turbopack | 4.3.4   | MIT        | Lets the Next.js bundler process Tailwind CSS             |
| @types/node            | 22.20.5 | MIT        | TypeScript types for Node.js                              |
| @types/react           | 19.3.0  | MIT        | TypeScript types for React                                |
| @types/react-dom       | 19.3.0  | MIT        | TypeScript types for React DOM                            |
| @vitest/coverage-v8    | 5.1.0   | MIT        | Test coverage reports                                     |
| eslint                 | 9.39.5  | MIT        | Finds bugs and bad patterns in the code                   |
| eslint-config-next     | 16.4.4  | MIT        | Next.js, React and TypeScript lint rules                  |
| eslint-config-prettier | 10.1.8  | MIT        | Stops ESLint and Prettier from fighting                   |
| prettier               | 3.9.10  | MIT        | Formats the code the same way for everyone                |
| tailwindcss            | 4.3.4   | MIT        | Utility CSS classes for styling                           |
| tsx                    | 4.23.15 | MIT        | Runs the local TypeScript demo seed with existing imports |
| typescript             | 5.9.3   | Apache-2.0 | Type checking                                             |
| vite                   | 8.3.5   | MIT        | Build tool that Vitest runs on                            |
| vitest                 | 5.1.0   | MIT        | Unit tests                                                |

## Notable indirect dependencies

Packages that our dependencies install for us, worth knowing about:

| Package                                                                         | Licence           | Comes with            | Note                                                                               |
| ------------------------------------------------------------------------------- | ----------------- | --------------------- | ---------------------------------------------------------------------------------- |
| sharp / @img/sharp-\*                                                           | Apache-2.0        | next                  | Image optimisation                                                                 |
| @img/sharp-libvips-\*                                                           | LGPL-3.0-or-later | next                  | Image library used by sharp; LGPL is compatible with GPL-3.0                       |
| caniuse-lite                                                                    | CC-BY-4.0         | next                  | Browser-support data (a dataset, not code)                                         |
| @supabase/auth-js, postgrest-js, realtime-js, storage-js, functions-js, phoenix | MIT               | @supabase/supabase-js | The parts of the Supabase client (login, database, live updates, files, functions) |
| cookie                                                                          | MIT               | @supabase/ssr         | Reads and writes cookie headers                                                    |
| iceberg-js                                                                      | MIT               | @supabase/supabase-js | Part of the storage client (we don't use it)                                       |
| tslib                                                                           | 0BSD              | @supabase/\*          | TypeScript helper functions; 0BSD is compatible with GPL-3.0                       |

The seed runner tsx also uses esbuild (MIT) for TypeScript transformation.

## Data and assets

| Item                  | Licence | Status                                                                                                           |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| Fonts                 | none    | We use the device's built-in system fonts, so no font files are shipped                                          |
| District shapes (map) | ODbL    | OpenStreetMap data for the 28 districts will be added in Week 3. Required credit: "© OpenStreetMap contributors" |
