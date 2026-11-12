# Lighthouse, 12 Nov 2026 (W4-04)

Lighthouse 13.6.0, default **mobile** profile (simulated mid-range phone on slow 4G, 4× CPU slowdown), Chromium 1243 headless. Three pages from the plan: the landing page, the older person's call check (the preview page `/dev/protected`, because `/protected` needs a paired phone) and the scam map.

## Before the fixes (live site, https://scamly-ag777.vercel.app)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 97 | 100 | 96 | 60 | 1.0 s | 0 | 200 ms |
| `/dev/protected` | 94 | 100 | 92 | 60 | 2.9 s | 0 | 130 ms |
| `/karta` | 100 | 97 | 96 | 60 | 0.9 s | 0 | 10 ms |

Problems found:

1. **`/favicon.ico` → 404** on every page (browsers ask for it by themselves) → console error.
2. **CSP violation on the call check**: Zod (input checks) tests whether `eval()` works; our policy forbids `eval()` (D27).
3. **Map: a link told apart by colour only** (the „Leaflet“ link in the map corner, WCAG 1.4.1).
4. **SEO 60: „Page is blocked from indexing“** from the header `x-robots-tag: noindex`. No code or setting in our project sends it; Vercel adds it at its edge on this `*.vercel.app` address. Locally the same pages score SEO 100. The preview page `/dev/protected` is also marked noindex by us on purpose.

## Fixes

| # | Fix | Where |
| --- | --- | --- |
| 1 | Real `favicon.ico` (48 × 48, our signal mark), made by `npm run icons` | `scripts/icons/generate.mjs`, `src/app/favicon.ico` |
| 2 | Zod `jitless` mode, set once in `src/lib/zod.ts`; every file imports `z` from there (an ESLint rule forbids importing `z` from "zod" directly) | `src/lib/zod.ts`, `eslint.config.mjs` |
| 3 | The map attribution link is underlined | `src/components/map/map.css` |
| 4 | Not fixable in code; needs a custom domain or a Vercel project setting. Not important for a school demo (we don't need Google to index it) | – |

## After the fixes (local production build, same settings)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 97 | 100 | 96* | 100 |
| `/dev/protected` | 97 | 100 | 100 | 60 (noindex on purpose) |
| `/karta` | 100 | 100 | 96* | 100 |

\* Local-only console errors: no database on the local build (the map's data request answers 500) and the CSP's `upgrade-insecure-requests` turning a `localhost` request into https. Neither happens on the live site.

## Known, accepted

- **Call check LCP 2.9 s (simulated slow 4G).** The largest element is the big button „Обаждат ми се за пари!“. The page reads the voice-input switch (`FEATURE_VOICE`) at request time, so the button arrives in the streamed part of the page, after the static shell. Measured without throttling it is about 0.8 s (time to first byte 0.33 s + render 0.5 s). Making it faster means reading the switch differently; not worth the risk before the release.
- **Unused JavaScript 59–115 KiB per page** (React, Next.js and Supabase code shared by all pages) and one render-blocking stylesheet of 12 KB: Lighthouse estimates 0.1–0.15 s; performance is already 94–100.
