# Release check 27 Nov 2026: live smoke test and screenshots

Live site: https://scamly-ag777.vercel.app (deployed commit `e9444a0`, the same as `origin/main` at the time of the check). Read-only: only `GET`/`HEAD` requests, nothing written to the live database.

## Pages and API (27 Nov 2026, about 00:58 UTC)

| Address | Expected | Answer | Time |
| --- | --- | --- | --- |
| `/api/health` | 200, `{"ok":true,"db":true}` | **200** `{"ok":true,"db":true,…}` | 0.61 s |
| `/` | 200 | **200** (hero „Гласът може да е фалшив. Близкият ти — не.“) | 1.23 s |
| `/kak-raboti` | 200 | **200** | 0.65 s |
| `/karta` | 200 | **200** | 0.49 s |
| `/karta-za-hladilnik` | 200 | **200** | 0.53 s |
| `/poveritelnost` | 200 | **200** | 0.59 s |
| `/vhod` | 200 | **200** | 0.44 s |
| `/svarzhi` | 200 | **200** | 0.54 s |
| `/dev/ui` | 404 (preview pages off in production, P-02) | **404** | 0.44 s |
| `/dev/protected` | 404 | **404** | 0.43 s |

## Security headers on `/`

| Header | Present |
| --- | --- |
| `Content-Security-Policy` (`default-src 'self'; script-src 'self' 'unsafe-inline'; …`, D27) | ✅ |
| `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | ✅ |
| `X-Content-Type-Options: nosniff` | ✅ |
| `X-Frame-Options: DENY` | ✅ |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy: camera=(), microphone=(self), …` | ✅ |
| `Cross-Origin-Opener-Policy: same-origin` | ✅ |

Also: `npm audit --omit=dev` 0 vulnerabilities; secret scan of the tracked files 0 findings.

## Local checks (same day, working tree on top of `e9444a0`)

| Check | Result |
| --- | --- |
| `npm run check` (lint, types, format, unit tests) | ✅ 823 tests in 89 files |
| `npm run test:db` (pgTAP on local PostgreSQL 16) | ✅ 13 files, 239 assertions |
| `npm run build` | ✅ |
| `npm run e2e` (desktop Chrome + Pixel 5) | ✅ 299 passed, 1 skipped (150 tests × 2 screens) |

## Screenshots in this folder

Made with Playwright on a local production build with `SCAMLY_DEV_PAGES=1`: the `/dev` preview pages with made-up API answers (no live data), reduced motion (the landing scene opens on its final frame). Pixel 5 (393 × 851) and 1440 × 900; Night (`dark`) and Porcelain (`light`); JPEG quality 80. 24 files:

- `landing-hero__{pixel5,1440}__{night,porcelain}.jpg`: landing hero, final frame of the two-phone scene.
- `protected-1-big-button`, `protected-2-first-question`, `protected-3-tiles`, `protected-4-waiting`, `protected-5-not-me` (`__pixel5__night`, `__pixel5__porcelain`; plus `protected-4-waiting__1440__night`, `protected-5-not-me__1440__porcelain`).
- `family-answer__pixel5__night.jpg`, `family-answer__1440__porcelain.jpg`: „Ти ли си?“ with „Не съм аз — обаждам ти се сега!“.
- `family-person-tab1__{1440__night,1440__porcelain,pixel5__night}.jpg` („Кой е истинският“), `family-person-tab2__1440__porcelain.jpg` („Настройки“).
- `map__1440__night.jpg`, `map__pixel5__porcelain.jpg`: the scam map with made-up numbers.

The help pictures `public/help/protected.jpg` (800 × 1000) and `public/help/family.jpg` (1600 × 1000) were made in the same run (Night).

## Still manual (only Alex and Roberta can do these)

- After the push: check the deploy and `/api/health` again; open `/protected/pomosht` and `/family/pomosht` and see the new pictures.
- P-01 push on real phones (Android + iPhone with the installed PWA).
- P-12 rehearse the juror demo kit twice on two real phones against the live site; P-09 numbers after the rehearsals.
- W4-05 test with real families; W4-09 registration (deadline 29.11); W4-08 tag `v1.0.0` (both); Week 5.
