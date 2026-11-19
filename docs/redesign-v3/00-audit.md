# Redesign v3 „Ореол“: Phase 0 audit

Phase 0 records how the app looked before v3 and removes the v2 „Signal“ visual layer
(D26) from the working tree of the branch `redesign/scamly-v3`. Nothing new is designed
here; the new design system comes in Phase 1. Nothing was committed or pushed.

## 1. Baseline (before any deletion, at 7aaa1b5)

- `npm run check`: 708/708 tests green (lint, types, format, tests).
- `npm run build`: green (re-run once in Phase 0 to be sure).

## 2. Before-screenshots

Folder: `docs/evidence/redesign-v3/before/` — 124 files, 31 views × 4 variants, about 27 MB.

- Variants: `desktop` = 1440×900 viewport; `mobile` = Playwright's Pixel 5 (393 wide).
  Themes: `light` and `dark`, set the way the app does it (`localStorage["scamly-theme"]`,
  read by the inline head script that puts `data-theme` on `<html>`) plus the matching
  `colorScheme`. All are full-page shots.
- Server: `next start -p 4600` on the production build, without `NODE_USE_ENV_PROXY`, so
  the live database was never reached. Pages that read the database on the server show
  their error state. The `/dev/*` previews and `/karta` got realistic content from fake
  API answers copied from `tests/e2e/*.spec.ts` (admin, alerts, family, moderation,
  scripts, protected, map). Animations were switched off before each shot.
- Format: JPEG quality 80 (the PNGs were 214 MB because of the v2 grain texture). The
  mobile shots were scaled from 2.75× to 2× device pixels (786 px wide) to keep the
  folder near 25 MB.
- Not shot: the real logged-in pages (`/protected`, `/family/*`, `/moderator/*`, `/admin`,
  `*/pomosht`) need a login; their screens are covered by the `/dev/*` previews.

| Route | Files | Notes |
| --- | --- | --- |
| `/` | `home__{desktop,mobile}__{light,dark}.jpg` |  |
| `/kak-raboti` | `kak-raboti__{desktop,mobile}__{light,dark}.jpg` | no DB: error state + rules |
| `/kak-raboti/politsai` | `kak-raboti-politsai__{desktop,mobile}__{light,dark}.jpg` | no DB: card load error state |
| `/signal` | `signal__{desktop,mobile}__{light,dark}.jpg` |  |
| `/karta` | `karta__{desktop,mobile}__{light,dark}.jpg` | mocked /api/map/stats (from map.spec.ts) |
| `/vhod` | `vhod__{desktop,mobile}__{light,dark}.jpg` |  |
| `/registratsia` | `registratsia__{desktop,mobile}__{light,dark}.jpg` |  |
| `/svarzhi` | `svarzhi__{desktop,mobile}__{light,dark}.jpg` |  |
| `/pokana` | `pokana__{desktop,mobile}__{light,dark}.jpg` |  |
| `/karta-za-hladilnik` | `karta-za-hladilnik__{desktop,mobile}__{light,dark}.jpg` |  |
| `/offline` | `offline__{desktop,mobile}__{light,dark}.jpg` |  |
| `/does-not-exist` | `404__{desktop,mobile}__{light,dark}.jpg` |  |
| `/403` | `403__{desktop,mobile}__{light,dark}.jpg` |  |
| `/dev/ui` | `dev-ui__{desktop,mobile}__{light,dark}.jpg` | component gallery |
| `/dev/protected` | `dev-protected__{desktop,mobile}__{light,dark}.jpg` | big button screen |
| `/dev/protected` | `dev-protected-verdict__{desktop,mobile}__{light,dark}.jpg` | after answering police + money → red verdict (real engine) |
| `/dev/family` | `dev-family__{desktop,mobile}__{light,dark}.jpg` | mocked people list |
| `/dev/family/person` | `dev-family-person__{desktop,mobile}__{light,dark}.jpg` | mocked person, contacts, device, checks |
| `/dev/family/alerts` | `dev-family-alerts__{desktop,mobile}__{light,dark}.jpg` | mocked alerts feed |
| `/dev/family/alerts?check=…0001` | `dev-family-alerts-red__{desktop,mobile}__{light,dark}.jpg` | focused red alert |
| `/dev/family/new` | `dev-family-new__{desktop,mobile}__{light,dark}.jpg` |  |
| `/dev/kak-raboti` | `dev-kak-raboti__{desktop,mobile}__{light,dark}.jpg` | mocked cards |
| `/dev/kak-raboti/karta?slug=politsai` | `dev-kak-raboti-karta__{desktop,mobile}__{light,dark}.jpg` | mocked card |
| `/dev/moderator` | `dev-moderator__{desktop,mobile}__{light,dark}.jpg` | hub, 2 pending reports |
| `/dev/moderator/reports` | `dev-moderator-reports__{desktop,mobile}__{light,dark}.jpg` | mocked queue |
| `/dev/moderator/scripts` | `dev-moderator-scripts__{desktop,mobile}__{light,dark}.jpg` | mocked list |
| `/dev/moderator/scripts/edit` | `dev-moderator-scripts-edit__{desktop,mobile}__{light,dark}.jpg` | mocked draft |
| `/dev/moderator/scripts/nova` | `dev-moderator-scripts-nova__{desktop,mobile}__{light,dark}.jpg` |  |
| `/dev/admin` | `dev-admin__{desktop,mobile}__{light,dark}.jpg` | users tab, mocked |
| `/dev/admin` | `dev-admin-stats__{desktop,mobile}__{light,dark}.jpg` | Статистика tab, mocked |
| `/dev/admin` | `dev-admin-audit__{desktop,mobile}__{light,dark}.jpg` | Дневник tab, mocked |

## 3. What was deleted (46 files, working tree only; all stay in git history)

- **Design system code:** `src/components/ui/` — Badge, BigChoice, Button, Card, Dialog,
  Divider, Field, Kbd, Notice, RiskMeter, SignalLine, Skeleton, States, Tabs, ThemeToggle,
  Toast, Toggle, Tooltip, Verdict, VerdictBadge (`.tsx`, 20 files).
- **Home sections:** `src/components/landing/CallDemo.tsx`, `FeatureGrid.tsx` (folder removed).
- **Frame:** `src/components/layout/Logo.tsx`, `SiteFooter.tsx`, `SiteHeader.tsx`.
- **v2 design docs:** `docs/redesign/` — `00-audit.md`, `01-component-research.md`,
  `02-motion-decisions.md`, `03-design-system.md`, `LICENSES.md`.
- **Images:** `public/help/{admin,family,moderator,protected}.jpg`;
  `public/icons/{apple-touch-icon,badge-72,icon-192,icon-512,icon-maskable-512}.png`;
  `src/app/opengraph-image.png` and its `opengraph-image.alt.txt` (the alt text belongs to
  the deleted picture); `src/app/favicon.ico`; `src/app/icon.svg`;
  `scripts/icons/{icon,icon-maskable,badge}.svg`.

**Emptied (file kept so imports still resolve):**

- `src/app/globals.css`: only `@import "tailwindcss";` and the same `@theme` block that
  switches Tailwind's defaults off (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`,
  `--ease-*`, `--font-*` set to `initial`). Header: "Ореол v3 tokens are added in Phase 1."
  Gone with it: all colour tokens, light/dark rules, type scale, radii, shadows, motion,
  grain, grid lines, print colours and every component rule.
- `src/components/map/map.css`, `src/app/karta-za-hladilnik/fridgeCard.css`: header
  comment only. Note: the fridge card's `@page { size: A5 portrait; margin: 10mm }`
  print rule went too and must come back with the new card.

**Changed (values or comments only, no logic):**

- `src/config/pwa.ts`: theme/background colours → `#ffffff` / `#000000` placeholders,
  marked `// TODO Ореол Phase 1`.
- `src/lib/offlinePage.ts`: the two `:root` colour lines → black/white placeholders,
  marked `TODO Ореол Phase 1`; the "Signal tokens" comment rewritten.
- `scripts/icons/generate.mjs`: kept; a TODO says it needs new SVG sources (it reads
  `icon.svg`, `icon-maskable.svg`, `badge.svg` and `src/app/icon.svg`).
- Comments naming the v2 design: `src/components/auth/forms.tsx`,
  `src/components/auth/InviteAccept.tsx`, `src/app/dev/ui/page.tsx` (header line),
  `src/config/securityHeaders.ts` (comment "the signal line" removed; the CSP itself is
  unchanged, D27).

## 4. What survived and why

- **Logic, untouched:** `src/app/api/**`, `src/server/**`, `src/engine/**` (its
  `Signal`/`SignalMap` types are scam *signals* of the engine, not the design),
  `src/schemas/**`, `src/lib/**` (except the colours above), `src/proxy.ts`,
  `src/types/**`, `supabase/**`, `public/sw.js`, `public/geo/**`, `src/i18n/bg.ts`.
  The product word „сигнал“ (reports), the route `/signal`, `ROUTES.report`, `bg.reportForm`
  and the API names are product words and stay.
- **Non-visual helpers:** `src/components/ui/cn.ts`, `src/components/layout/accountLinks.ts`
  (+ test), and the helper/test files next to the screens (`*.ts`, `*.test.ts` in admin,
  education, family, map, moderator, protected, report).
- **Fonts:** `src/fonts/*` (Sofia Sans, Sofia Sans Semi Condensed, JetBrains Mono, with
  their OFL licences) and `src/app/fonts.ts`: self-hosted, kept per the brief.
- **`src/config/inlineScripts.ts`:** the theme head script (`scamly-theme` key) is part of
  the CSP set-up and was not touched; its comment still points to the deleted
  `ThemeToggle.tsx`.
- **`src/app/tokens.test.ts`:** left for Phase 1, where it is rewritten for the v3 tokens.
  It now fails (it reads the v2 tokens from `globals.css`).

## 5. Files that now fail to compile (58)

`npx tsc --noEmit`: 173 errors in 58 files — 155 "cannot find module" plus 18 follow-on
"implicitly any" errors in event handlers of the lost components. `RoleHelp.tsx` also
imports the 4 deleted `public/help/*.jpg` (TypeScript does not report this; the bundler
will). Expected on this branch until Phase 1 restores the primitives. Unit tests: 691/691
pass; only the `tokens.test.ts` file fails. Build and e2e are red.

Phase column: **1** = shared frame and gallery, rebuilt with the design system;
**2–6** = screens, rebuilt in the screen phases (exact split per the v3 plan). Other
screens that import nothing deleted (e.g. `signal/`, `vhod/` pages, which render the
broken components) also change look in those phases.

| File | Lost imports | Phase |
| --- | --- | --- |
| `src/app/403/page.tsx` | ui/Button, ui/SignalLine | 1 |
| `src/app/_auth-placeholders/RoleGate.tsx` | ui/Skeleton | 1 |
| `src/app/dev/ui/page.tsx` | ui/Badge, ui/BigChoice, ui/Button, ui/Card, ui/Dialog, ui/Divider, ui/Field, ui/Kbd, ui/Notice, ui/RiskMeter, ui/SignalLine, ui/Skeleton, ui/States, ui/Tabs, ui/Toast, ui/Toggle, ui/Tooltip, ui/Verdict, ui/VerdictBadge | 1 |
| `src/app/layout.tsx` | layout/SiteFooter, layout/SiteHeader, ui/Toast | 1 |
| `src/app/not-found.tsx` | ui/Button, ui/SignalLine | 1 |
| `src/app/page.tsx` | landing/CallDemo, landing/FeatureGrid, ui/Button, ui/SignalLine | 2–6 |
| `src/app/pokana/page.tsx` | ui/Skeleton | 2–6 |
| `src/app/svarzhi/page.tsx` | ui/Skeleton | 2–6 |
| `src/components/admin/AdminGate.tsx` | ui/Skeleton | 2–6 |
| `src/components/admin/AdminHub.tsx` | ui/Tabs | 2–6 |
| `src/components/admin/AuditPanel.tsx` | ui/Button, ui/Notice, ui/Skeleton, ui/States | 2–6 |
| `src/components/admin/Charts.tsx` | ui/Badge, ui/Verdict | 2–6 |
| `src/components/admin/StatsPanel.tsx` | ui/Notice, ui/Skeleton, ui/States | 2–6 |
| `src/components/admin/UsersPanel.tsx` | ui/Badge, ui/Button, ui/Dialog, ui/Field, ui/Notice, ui/Skeleton, ui/States | 2–6 |
| `src/components/auth/AuthPage.tsx` | ui/SignalLine | 2–6 |
| `src/components/auth/InviteAccept.tsx` | ui/Button, ui/Notice, ui/Skeleton | 2–6 |
| `src/components/auth/forms.tsx` | ui/Button, ui/Field, ui/Notice | 2–6 |
| `src/components/education/Loading.tsx` | ui/Skeleton | 2–6 |
| `src/components/education/PrintButton.tsx` | ui/Button | 2–6 |
| `src/components/education/ScriptCard.tsx` | ui/Badge, ui/Button | 2–6 |
| `src/components/education/ScriptList.tsx` | ui/Badge, ui/States | 2–6 |
| `src/components/family/AlertsPage.tsx` | ui/Badge, ui/Button, ui/Notice, ui/Skeleton, ui/States, ui/VerdictBadge | 2–6 |
| `src/components/family/CheckHistory.tsx` | ui/Button, ui/Notice, ui/Skeleton, ui/States, ui/VerdictBadge | 2–6 |
| `src/components/family/ContactsEditor.tsx` | ui/Badge, ui/Button, ui/Tooltip | 2–6 |
| `src/components/family/CreatePersonForm.tsx` | ui/Button | 2–6 |
| `src/components/family/DevicesList.tsx` | ui/Badge, ui/Button, ui/Dialog, ui/States | 2–6 |
| `src/components/family/FamilyGate.tsx` | ui/Skeleton | 2–6 |
| `src/components/family/FamilyHome.tsx` | ui/Button | 2–6 |
| `src/components/family/InviteForm.tsx` | ui/Button, ui/Field | 2–6 |
| `src/components/family/PairingPanel.tsx` | ui/Button | 2–6 |
| `src/components/family/PeopleList.tsx` | ui/Button, ui/Notice, ui/SignalLine, ui/Skeleton | 2–6 |
| `src/components/family/PersonDashboard.tsx` | ui/Button, ui/Notice, ui/Skeleton | 2–6 |
| `src/components/family/PersonSettings.tsx` | ui/Button, ui/Dialog | 2–6 |
| `src/components/family/PushOptIn.tsx` | ui/Badge, ui/Button, ui/Card, ui/Skeleton | 2–6 |
| `src/components/family/fields.tsx` | ui/Badge, ui/Field | 2–6 |
| `src/components/help/RoleHelp.tsx` | public/help/*.jpg (4 screenshots), ui/Button | 2–6 |
| `src/components/map/DistrictMap.tsx` | ui/Badge | 2–6 |
| `src/components/map/ScamMap.tsx` | ui/Badge, ui/Skeleton, ui/States | 2–6 |
| `src/components/moderator/KeywordChips.tsx` | ui/Badge, ui/Button, ui/Field | 2–6 |
| `src/components/moderator/ModeratorGate.tsx` | ui/Skeleton | 2–6 |
| `src/components/moderator/ModeratorHub.tsx` | ui/Button | 2–6 |
| `src/components/moderator/PendingReportsCard.tsx` | ui/Badge, ui/Button, ui/Skeleton | 2–6 |
| `src/components/moderator/RejectDialog.tsx` | ui/Button, ui/Field, ui/Notice | 2–6 |
| `src/components/moderator/ReportQueue.tsx` | ui/Badge, ui/Button, ui/Notice, ui/Skeleton, ui/States, ui/Tabs | 2–6 |
| `src/components/moderator/ScriptEditor.tsx` | ui/Button, ui/Field, ui/Skeleton, ui/States, ui/Toggle | 2–6 |
| `src/components/moderator/ScriptLibrary.tsx` | ui/Badge, ui/Button, ui/Skeleton, ui/States | 2–6 |
| `src/components/protected/CallContactButton.tsx` | ui/Button | 2–6 |
| `src/components/protected/CallerText.tsx` | ui/Button, ui/Field | 2–6 |
| `src/components/protected/CheckHome.tsx` | ui/Button, ui/SignalLine | 2–6 |
| `src/components/protected/CheckResult.tsx` | ui/Button, ui/Notice, ui/Verdict | 2–6 |
| `src/components/protected/ProtectedGate.tsx` | ui/Skeleton | 2–6 |
| `src/components/protected/QuestionWizard.tsx` | ui/BigChoice, ui/Button | 2–6 |
| `src/components/protected/VoiceInput.tsx` | ui/Button | 2–6 |
| `src/components/protected/answerIcons.tsx` | ui/BigChoice | 2–6 |
| `src/components/protected/questions.ts` | ui/BigChoice | 2–6 |
| `src/components/pwa/InstallPrompt.tsx` | ui/Button, ui/Card | 2–6 |
| `src/components/pwa/IosInstallSteps.tsx` | layout/Logo | 2–6 |
| `src/components/report/ReportForm.tsx` | ui/Badge, ui/BigChoice, ui/Button, ui/Field | 2–6 |

Leftover v2 class names (`bg-surface-1`, `border-line`, `grid-lines`, `appear`,
`check-list`, `map-*` …) in these files now style nothing; they go when each screen is
rebuilt.

## 6. Leftovers check (after the deletion)

Grep over `src/`, `scripts/`, `tests/`, `public/` (and docs for `docs/redesign/`):

| Pattern | Still found in | Why it stays |
| --- | --- | --- |
| `3de6f0` | `scripts/og/og.html` | Source of the deleted OG picture; not in the Phase 0 list. Delete or redo in Phase 1 with the new OG image (open question). |
| `SignalLine` | `app/page.tsx`, `app/not-found.tsx`, `app/403/page.tsx`, `app/dev/ui/page.tsx`, `auth/AuthPage.tsx`, `protected/CheckHome.tsx`, `family/PeopleList.tsx` | Imports/JSX in screen code; screens are rebuilt in Phases 1–6. |
| `surface-1` | 12 screen files + `app/tokens.test.ts` | Class names in screen code; the test is rewritten in Phase 1. |
| `hairline` | header comments of 16 screen files (admin, education, moderator, family, pwa) | They describe the v2 look of code that still exists; changing them now would make the comments wrong. Rewritten with each screen. |
| `design system "Signal"` | `src/app/tokens.test.ts` line 1 | Left for Phase 1 with the whole test. |
| `docs/redesign/` | `docs/WHY_WE_CHOSE.md`, `docs/PROJECT_BRIEF.md` (D26), `docs/CHANGES.md`, `docs/HOW_IT_WORKS.md` | History and docs; they get updated in the Phase 1 code commit (no docs-only commits). |
| `public/icons/*`, `/icons/…png` | `public/sw.js`, `src/app/manifest.ts`, `src/app/layout.tsx`, `tests/e2e/pwa.spec.ts` | Paths to icons that Phase 1 regenerates; `sw.js` is logic and was not touched. |

## 7. Phase 1 follow-up: brand assets (19 Nov)

- **Interim app icons (done in Phase 1):** our own halo mark (three rings in the halo
  gradient closing around a light dot, on the „Night“ colour `#05060A`) as new SVG
  sources `scripts/icons/{icon,icon-maskable,badge}.svg` and `src/app/icon.svg`;
  `npm run icons` regenerated `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon,badge-72}.png`
  and `src/app/favicon.ico`. `tests/e2e/pwa.spec.ts` is green again. Logged in
  `THIRD_PARTY_LICENSES.md` as our own work (GPL-3.0).
- **Phase 2 refines the brand assets:** the final logo (`layout/Logo.tsx`, still the
  CSS `HaloMark`), the app icons above and the **OG image**. `src/app/opengraph-image.png`
  stays deleted for now: nothing in the build or the tests needs it (pages simply have
  no share picture until Phase 2). `scripts/og/og.html` still holds the v2 colour
  `3de6f0` and is redone with the new OG image in Phase 2.
- The `docs/redesign/` references in `WHY_WE_CHOSE.md`, `PROJECT_BRIEF.md` (D26),
  `CHANGES.md` and `HOW_IT_WORKS.md` were updated in Phase 1 (D28 replaces D26).
