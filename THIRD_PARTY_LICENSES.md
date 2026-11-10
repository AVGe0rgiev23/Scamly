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
| qrcode                | 1.5.4   | MIT     | Makes the QR code for pairing a phone, in the browser           |
| react                 | 19.3.1  | MIT     | User-interface library                                          |
| react-dom             | 19.3.1  | MIT     | Draws React components in the browser                           |
| server-only           | 0.0.1   | MIT     | Makes the build fail if browser code imports a server-only file |
| web-push              | 3.6.7   | MPL-2.0 | Encrypts, signs (VAPID) and sends web push notifications        |
| zod                   | 4.6.7   | MIT     | Checks input data and environment variables                     |

## Development dependencies

These are only used while writing, checking, testing and building the code.

| Package                | Version | Licence    | What we use it for                                        |
| ---------------------- | ------- | ---------- | --------------------------------------------------------- |
| @playwright/test       | 1.63.0  | Apache-2.0 | End-to-end tests in a real browser                        |
| @tailwindcss/turbopack | 4.3.4   | MIT        | Lets the Next.js bundler process Tailwind CSS             |
| @types/node            | 22.20.5 | MIT        | TypeScript types for Node.js                              |
| @types/qrcode          | 1.5.6   | MIT        | TypeScript types for qrcode                               |
| @types/react           | 19.3.0  | MIT        | TypeScript types for React                                |
| @types/react-dom       | 19.3.0  | MIT        | TypeScript types for React DOM                            |
| @types/web-push        | 3.6.4   | MIT        | TypeScript types for web-push                             |
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
| dijkstrajs, pngjs, yargs                                                        | MIT               | qrcode                | QR segment optimiser; PNG output and command line (not used in the browser bundle) |
| http_ece, asn1.js, bn.js, jws, jwa, https-proxy-agent, agent-base, minimist     | MIT               | web-push              | Message encryption, key handling, the VAPID signature, proxy support               |

The seed runner tsx also uses esbuild (MIT) for TypeScript transformation.

web-push uses the Mozilla Public License 2.0 (MPL-2.0). MPL-2.0 is compatible with
GPL-3.0 (its section 3.3 allows combining it with GPL code), and we use the library
unchanged from npm.

## Data and assets

| Item                  | Licence       | Status                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts                 | none          | We use the device's built-in system fonts, so no font files are shipped                                                                                                                                                                                                                                                                                                                                                            |
| App icons             | GPL-3.0       | Our own work (W2-09): `public/icons/*.png`, made from our SVG sources in `scripts/icons/` by `npm run icons`                                                                                                                                                                                                                                                                                                                       |
| District shapes (map) | Public domain | [Natural Earth](https://www.naturalearthdata.com/) 1:10m "Admin 1 – States, Provinces" v5.1.2 (`ne_10m_admin_1_states_provinces.geojson`, tag `v5.1.2` of github.com/nvkelso/natural-earth-vector). Simplified by `scripts/geo/build-districts.mjs` into `public/geo/bg-districts.json` (28 districts, about 56 KB). No credit is required; the map credits "Natural Earth" anyway. Not OpenStreetMap data, so no ODbL terms apply |
