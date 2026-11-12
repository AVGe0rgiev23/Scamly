# Redesign v2 · 00 · Project audit

Written before any change. Branch `redesign/scamly-v2`, cut from `fb812d9`.

## 1. Baseline (does it work before we touch it?)

| Check                                           | Result                                             |
| ----------------------------------------------- | -------------------------------------------------- |
| `npm ci` (Node 22.23)                           | OK                                                 |
| `npm run check` (lint, types, Prettier, Vitest) | OK: 74 test files, 679 tests pass                  |
| `npm run build` (Next.js 16.4.4, Turbopack)     | OK: every route builds (static or partial prerender) |

Existing problems found (not caused by us):

- `tests/e2e/layout.spec.ts` expects the dark page colour `rgb(11, 16, 32)` and `tests/e2e/ui.spec.ts` expects `rgb(16, 35, 33)`. The two browser tests contradict each other, so the e2e suite was already red after the last two restyles. Both are colour assertions of the old themes and are rewritten for the new tokens.
- The theme is applied in a `useEffect`, so a saved dark theme flashes light on first paint.
- `src/lib/offlinePage.ts` and `scripts/icons/*.svg` carry their own copies of old hex colours.
- Emoji are used as icons (answer tiles, call button, family message). The new direction forbids emoji icons.
- `public/help/*.jpg` are screenshots of the old design.

## 2. Stack and versions

| Area       | What is used                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16.4.4, App Router, Cache Components (`cacheComponents`, `partialPrefetching`), `src/proxy.ts` |
| Bundler    | Turbopack, with `@tailwindcss/turbopack` as the CSS loader                                           |
| UI runtime | React 19.3.1 (Server Components by default, small Client Components)                                 |
| Language   | TypeScript 5.9, strict                                                                               |
| CSS        | **Tailwind CSS 4.3.4 is installed**, but almost unused: the old UI is 2 510 lines of hand-written class rules in `src/app/globals.css` plus `fridgeCard.css` |
| UI library | **None.** No shadcn/ui, no Radix, no icon package, no animation library                              |
| State      | Local React state only; no store                                                                     |
| Data       | Supabase (Postgres + RLS, Auth, Realtime) through our own `/api/*` route handlers; Zod 4 schemas     |
| Other      | Leaflet 1.9 (district map), `qrcode`, `web-push`                                                     |
| Tests      | Vitest 5 (unit), Playwright 1.63 (e2e on desktop Chrome + Pixel 5), pgTAP (database)                 |
| i18n       | One file, `src/i18n/bg.ts`. **The UI is Bulgarian only** (`<html lang="bg">`)                        |

Decision: build on what exists. Tailwind 4 becomes the styling layer (semantic tokens mapped into `@theme`), with our own primitives in `src/components/ui`. No second framework and no component library is added. One small dependency is added for icons (see `03-design-system.md`).

## 3. Sitemap

Public:

| Route                 | Purpose                                                        | Components                                     |
| --------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `/`                   | Landing page: what Scamly does, 3 steps, rules, entry links    | `pwa/InstallPrompt`                            |
| `/vhod`               | Login (family, moderator, admin)                               | `auth/AuthPage`, `auth/forms`                  |
| `/registratsia`       | Create a family account                                        | `auth/AuthPage`, `auth/forms`                  |
| `/svarzhi`            | Pair the older person's phone with a 6-digit code              | `auth/AuthPage`, `auth/forms`                  |
| `/pokana?t=`          | Accept an invite to become a trusted contact                   | `auth/AuthPage`, `auth/InviteAccept`           |
| `/kak-raboti`         | Education: list of published scam scripts                      | `education/EducationIntro`, `ScriptList`       |
| `/kak-raboti/[slug]`  | One education card (how it starts, what they say, what to do), printable | `education/ScriptCard`, `ScriptList`, `PrintButton` |
| `/karta-za-hladilnik` | Printable A5 fridge card with a QR code to `/svarzhi`          | `education/PrintButton`, `family/QrCode`       |
| `/signal`             | Anonymous scam report form (honeypot, field errors)            | `report/ReportForm`                            |
| `/karta`              | Scam map: 28 districts, approved reports, scam waves, table    | `map/ScamMap`, `map/DistrictMap`               |
| `/403`, 404           | No access / not found                                          | `auth/AuthPage`                                |
| `/offline`            | Offline card served by the service worker (self-contained HTML) | `lib/offlinePage.ts`                           |

Older person's phone (role `protected`):

| Route                | Purpose                                                              | Components                                                                 |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/protected`         | The call check: big button → questions → optional text/voice → verdict | `protected/CallCheckPage`, `CallCheck`, `CheckHome`, `QuestionWizard`, `CallerText`, `VoiceInput`, `CheckResult`, `CallContactButton`, `help/RoleHelp` |
| `/protected/pomosht` | Help                                                                 | `help/RoleHelp`                                                            |

Family (role `family`):

| Route                | Purpose                                                           | Components                                                                                        |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/family`            | People I protect, push opt-in, install prompt                     | `family/FamilyHome`, `PeopleList`, `PushOptIn`, `pwa/InstallPrompt`                               |
| `/family/new`        | Add a protected person                                            | `family/CreatePersonPage`, `CreatePersonForm`, `fields`                                           |
| `/family/[personId]` | One person: check history, pairing code + QR, devices, call order, invite, settings, delete | `family/PersonDashboard`, `CheckHistory`, `PairingPanel`, `QrCode`, `DevicesList`, `ContactsEditor`, `InviteForm`, `PersonSettings` |
| `/family/alerts`     | Live alerts with "I am calling her now"                           | `family/AlertsPage`                                                                               |
| `/family/pomosht`    | Help                                                              | `help/RoleHelp`                                                                                   |

Moderator (roles `moderator`, `admin`):

| Route                                      | Purpose                                               | Components                                           |
| ------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| `/moderator`                               | Hub: scripts card, report queue card with pending count | `moderator/ModeratorHub`, `PendingReportsCard`     |
| `/moderator/scripts`                       | Script library (drafts + published)                   | `moderator/ScriptLibrary`                            |
| `/moderator/scripts/nova`, `/scripts/[id]` | Script editor with keyword chips                      | `moderator/ScriptEditor`, `KeywordChips`             |
| `/moderator/reports`                       | Report queue: tabs, approve, reject with reason       | `moderator/ReportQueue`, `RejectDialog`              |
| `/moderator/pomosht`                       | Help                                                  | `help/RoleHelp`                                      |

Admin (role `admin`):

| Route            | Purpose                                             | Components                                                           |
| ---------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `/admin`         | Tabs: users and roles, statistics charts, audit log | `admin/AdminHub`, `UsersPanel`, `StatsPanel`, `Charts`, `AuditPanel` |
| `/admin/pomosht` | Help                                                | `help/RoleHelp`                                                      |

Test previews (no data of their own, used by Playwright): `/dev/ui`, `/dev/protected`, `/dev/family/*`, `/dev/moderator/*`, `/dev/admin`, `/dev/kak-raboti/*`. They render the same components without the role guard and stay.

## 4. What is deleted and what must survive

Deleted (the old visual layer):

- All rules and colour variables in `src/app/globals.css`; `src/app/karta-za-hladilnik/fridgeCard.css`.
- Old primitives in `src/components/ui/` (`Button`, `Card`, `BigChoice`, `Verdict`, `VerdictBadge`, `ConfirmDialog`, `ThemeToggle`): rebuilt, not restyled.
- The markup and class names of every screen component (the JSX is rewritten against the new primitives).
- `LogoMark` (shield + phone), the old icon SVGs and PNGs, the old `public/help/*.jpg` screenshots, the old colours in `config/pwa.ts` and `lib/offlinePage.ts`, every emoji icon.

Survives untouched (logic):

- `src/app/api/**`, `src/server/**`, `src/engine/**`, `src/schemas/**`, `src/lib/**` (except the colours inside `offlinePage.ts`), `src/proxy.ts`, `src/types/**`, `supabase/**`, `scripts/**` (except icon sources), `public/sw.js`, `public/geo/**`.
- Every non-visual helper next to the components: `family/api.ts`, `alerts.ts`, `alertSound.ts`, `format.ts`, `pushState.ts`, `qr.ts`, `preview.ts`; `protected/questions.ts`, `upload.ts`, `sendAnswers.ts`, `voice.ts`, `callContact.ts`, `acknowledgement.ts`; `moderator/scriptForm.ts`, `reportQueueHelpers.ts`; `report/reportFormHelpers.ts`; `map/mapData.ts`; `admin/adminFormat.ts`; `education/text.ts`; `layout/accountLinks.ts`.
- Inside each screen component: state, effects, API calls, realtime subscriptions, focus management, ARIA live regions, form validation. Only the returned JSX changes.
- Route files, role gates, `Suspense` boundaries, metadata.
- All unit tests. Browser tests keep their behaviour assertions; only assertions about old colours and old class names are updated.
- `src/i18n/bg.ts`: every existing key keeps its text. New keys are added for the new landing sections.

Hooks used by browser tests that the new markup keeps: `.contact-list > li`, `.pairing-code`, `.check-list > li`, `.verdict-badge`, `.voice-input`, `.verdict-reasons li`, `#report-website`, `.report-trap`, `path[data-code]` + `map-level-N`, `.map-legend`, `.map-tooltip`, `.map-panel`, `.alert-new`, `.alert-focused`, `.alerts > [role=status]`, `#alert-<id>`, `.admin-day`. These stay as plain hook classes with no styling of their own attached in CSS unless noted.

## 5. Real features (the only things the new design may show)

1. **Call check in about 30 seconds** on the older person's paired phone: one large button, 4 to 5 questions (who is calling, money, how to hand it over, rushing, secrecy), optional free text.
2. **Voice input** for the free text (browser speech recognition, no audio stored).
3. **Three-level verdict** with plain-language reasons: red "ТОВА Е ИЗМАМА.", amber "Внимание!", green "Няма типични признаци на измама." Green never says "safe" (D9).
4. **Six hard rules** that always force red (police asks for money, hand-over to a stranger, secrecy + money, asks for codes, "safe account", relative in trouble).
5. **Detection engine** that also runs on the phone when the network is slow or offline (local verdict after 4 s).
6. **Instant family alert** when a check starts: live alerts page (realtime), web push, e-mail.
7. **"Обаждам ѝ се сега"**: a family member confirms they are calling; the older person's phone shows who is calling back.
8. **One-tap call** to the first trusted contact from the older person's phone.
9. **Pairing without a password**: 6-digit code valid 10 minutes, or QR code.
10. **Family dashboard**: people, ordered call list (up to 5), invites by link, paired devices, check history with details.
11. **Education cards** for four scam scripts (police, relative in trouble, fake official, courier), printable; **A5 fridge card**.
12. **Anonymous report form** and **public district map** of approved reports with "scam waves".
13. **Moderation**: report queue, script editor, keywords that feed the engine.
14. **Administration**: roles, statistics, append-only audit log.
15. **PWA**: installable, offline card, light and dark theme.
16. Principles stated in the product: free software (GPL-3.0), no ads, no tracking, personal data in reports is redacted, caller numbers stored only hashed.

Not in the product, so never shown: user counts, "calls blocked" numbers, testimonials, partner or press logos, pricing, AI claims (the AI second opinion is switched off), automatic call blocking or caller-ID.

Where a design element would need a number or quote we do not have, it is left out. The only illustrative content is the simulated call in the hero and the mini-UIs in the feature grid; their sample names and texts live in one clearly marked file, `src/content/placeholders.ts`.

## 6. Real copy

All visible text is in `src/i18n/bg.ts` (about 1 190 lines, 30 sections), in literary Bulgarian. It is kept as is. The landing page reuses: `app.tagline`, `home.*` (problem, steps, rules, advice), `verdict.*`, `engine.hardRules.*`, `engine.reasons.*`, `education.home*`, `reportForm.home*`, `map.home*`, `protectedCheck.*`, `alerts.callNow`, `layout.footer*`. New landing copy (section headings, feature descriptions, FAQ) is added under a new `bg.landing` section and describes only the features listed above.

## 7. Language and layout consequences

- Bulgarian only, Cyrillic. Fonts must have a designed Cyrillic set (not a fallback), including „“ quotes, №, and the letters ѝ and й.
- Bulgarian words are about 20–30 % longer than English ones. Buttons and nav items are sized for text like „Регистрация за близки“ and „Обаждам ѝ се сега“; no fixed-width buttons, headings may wrap to two lines.
- No all-caps styling for labels: uppercase Cyrillic is hard to read for older people (the red verdict title is written in capitals in the copy itself and stays that way).
- The older person's screens keep very large text and targets (existing tests require ≥ 64 px buttons and ≥ 22 px base text there).
