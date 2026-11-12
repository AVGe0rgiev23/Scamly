# Redesign v2 · 03 · Design system "Signal"

The single source of truth is `src/app/globals.css` (tokens) and `src/components/ui/` (primitives). This file explains them.

## 1. Direction

Scamly tells real calls from fake ones. The product should feel like a precise measuring instrument: calm, sharp, confident, with a lot of space. Three things make it ours:

1. **The signal line.** A thin trace that is jagged when a call looks like a scam and settles into a steady line when nothing is wrong (`SignalLine`). Used sparingly: hero demo, verdict, risk meter, empty and error states, footer rule.
2. **Bulgarian letterforms.** Sofia Sans, drawn by the Bulgarian studio Lettersoup, with the Bulgarian Cyrillic shapes („българска кирилица“). It was chosen after a rendered specimen: Onest and Golos Text have no „ѝ“ glyph and fall back to another font; Sofia Sans has it.
3. **One accent, four meanings.** Signal Cyan is the only brand colour. Green, amber, red and slate-blue appear only when they mean safe, suspicious, scam and information.

What we deliberately do not do: gradients as decoration, glow blobs, glass panels, gradient text, emoji icons, pill-shaped everything, rows of identical icon cards, fake logos or numbers, all-caps Cyrillic labels, a hidden "hamburger" menu (older people do not look for hidden menus).

## 2. Colour tokens

Components use **only** these Tailwind classes. Tailwind's own palette is switched off in `@theme` (`--color-*: initial`), so `bg-blue-500` does not compile into anything.

| Class name part   | CSS variable       | Dark      | Light     | Use                                  |
| ----------------- | ------------------ | --------- | --------- | ------------------------------------ |
| `canvas`          | `--bg`             | `#080b0f` | `#f6f7f4` | Page background                      |
| `surface-1`       | `--surface-1`      | `#0d1218` | `#ffffff` | Panels, inputs                       |
| `surface-2`       | `--surface-2`      | `#121a22` | `#eef0eb` | Panel inside a panel, hover          |
| `surface-3`       | `--surface-3`      | `#19232d` | `#e4e7e0` | Selected item, skeleton              |
| `line`            | `--border`         | `#1f2a35` | `#d5d9d1` | Hairlines, dividers                  |
| `line-strong`     | `--border-strong`  | `#5b6b7a` | `#7b8580` | Borders of controls (3:1 contrast)   |
| `fg`              | `--text`           | `#eaf1f5` | `#0e161c` | Main text                            |
| `fg-muted`        | `--text-muted`     | `#a8b5c0` | `#44515b` | Secondary text                       |
| `fg-subtle`       | `--text-subtle`    | `#8a98a5` | `#56636d` | Meta text, placeholders              |
| `accent`          | `--accent`         | `#3de6f0` | `#006d78` | Primary action, focus ring, active   |
| `accent-hover`    | `--accent-hover`   | `#7af0f7` | `#00565f` | Hover of the primary action          |
| `accent-bg`       | `--accent-bg`      | `#0b2a31` | `#dcf1f2` | Chosen tile                          |
| `accent-line`     | `--accent-border`  | `#1b6871` | `#8cc7cc` | Border of an accent tint             |
| `on-accent`       | `--accent-fg`      | `#03181b` | `#ffffff` | Text on the accent                   |
| `ring`, `overlay` |                    |           |           | Focus outline, dialog backdrop       |

Status colours, each with five variants (`-solid`, `-on` = text on solid, `-fg` = text on tint, `-bg` = tint, `-line` = border):

| Status    | Meaning                | Dark solid | Light solid |
| --------- | ---------------------- | ---------- | ----------- |
| `safe`    | no typical signs       | `#34d399`  | `#0b7a55`   |
| `caution` | suspicious             | `#f5b93b`  | `#f2b132`   |
| `danger`  | scam, destructive, error | `#ff5468` | `#c8102e`   |
| `info`    | neutral information    | `#7c9cbf`  | `#3f648f`   |

Rules:

- Engine level → status: `red` → `danger`, `yellow` → `caution`, `green` → `safe` (`LEVEL_STATUS` in `Verdict.tsx`). Never any other mapping.
- A status is never shown by colour alone: always icon + words (`StatusPill`, `Verdict`, `Notice`).
- One solid status block per screen at most (the verdict headline). Everything else uses the tint.
- A green verdict never says "safe" (D9).
- Contrast is tested: `src/app/tokens.test.ts` reads `globals.css` and fails if any text token is under 4.5:1 on any surface, or if the two copies of the light theme differ.

Theme: `<html data-theme="system|light|dark">`. Dark is the default; "system" follows the device; the choice is saved in `localStorage` (`scamly-theme`) and applied before first paint by a small inline script in `layout.tsx`.

Texture: a tiled SVG `feTurbulence` grain on `body` (our own, generated, about 5 % strength) and two utilities, `grid-lines` and `dot-lines`, for instrument panels. No gradients.

## 3. Typography

| Role     | Family                    | Class          | Use                                          |
| -------- | ------------------------- | -------------- | -------------------------------------------- |
| Display  | Sofia Sans Semi Condensed | `font-display` | `h1`–`h3` (automatic), big numbers, verdicts |
| Text     | Sofia Sans                | `font-sans`    | Body and controls (default)                  |
| Data     | JetBrains Mono            | `font-mono`    | Phone numbers, codes, scores, times, counts (with `tabular`) |

All three are self-hosted variable `woff2` files in `src/fonts/`, subset to Latin + Cyrillic (45–59 kB each), loaded with `next/font/local` (fallback metrics, no layout jump). SIL Open Font License 1.1.

Scale (Tailwind's default sizes are switched off; only these exist):

| Class          | Size                         | Use                            |
| -------------- | ---------------------------- | ------------------------------ |
| `text-display` | 44 → 80 px fluid, lh 0.94    | Landing hero only              |
| `text-h1`      | 36 → 64 px fluid, lh 1.0     | Page title                     |
| `text-h2`      | 28 → 44 px fluid, lh 1.05    | Section title                  |
| `text-h3`      | 20 → 24 px fluid, lh 1.2     | Panel title                    |
| `text-xl`      | 24 px                        | Older person's screens, leads  |
| `text-lg`      | 20 px                        | Lead paragraphs                |
| `text-base`    | 17 px, lh 1.6                | Body (default)                 |
| `text-sm`      | 15 px                        | Hints, meta                    |
| `text-xs`      | 14 px                        | Badges, mono labels (smallest) |

Rules: body text never under 16 px; the older person's screens use `text-xl` and `size="xl"`/`"lg"` controls; headings are left-aligned, tracking −0.02 em, `text-wrap: balance`; line length under about 65 characters (`max-w-[60ch]`); no all-caps styling; no eyebrow label above every heading.

## 4. Layout

- 8 px rhythm: spacing in multiples of 8 (Tailwind `2`, `4`, `6`, `8`, `12`, `16`, `24`); 4 px only inside small controls.
- `shell` utility: the page column, max 1200 px, gutter 16 px (phone) / 32 px.
- 12-column grid (`grid md:grid-cols-12 gap-x-6`), asymmetric: text usually spans 5–7 columns, starting at the left edge; the second column holds a panel or stays empty.
- Sections are separated by space (`py-16 md:py-24`) and hairlines, not by boxes.
- Radius: `rounded-sm` 6 px (badges, small controls), `rounded-md` 10 px (buttons, inputs), `rounded-lg` 16 px (panels). `rounded-full` only for dots and the switch.
- Elevation: borders first. `shadow-raised` and `shadow-overlay` exist for floating things only (dialog, toast, tooltip).
- One primary button per view. Everything else is `secondary` or `ghost`.
- Breakpoints checked: 360, 768, 1024, 1440.

## 5. Primitives (`src/components/ui/`)

| File              | Exports                                                                 | Notes |
| ----------------- | ----------------------------------------------------------------------- | ----- |
| `Button.tsx`      | `Button`, `ButtonLink`, `buttonClass`                                   | `variant` primary/secondary/ghost/danger; `size` sm 44 / md 48 / lg 56 / xl 64 px; `loading` (the only spinner) |
| `Field.tsx`       | `Field`, `Input`, `Textarea`, `Select`, `CONTROL`                       | Label always visible; error linked by id; `size="lg"` for older users; `mono` for codes |
| `Toggle.tsx`      | `Checkbox`, `Switch`                                                    | Native inputs; whole row is the tap area |
| `BigChoice.tsx`   | `BigChoice`, `ChoiceOption`                                             | Radio tiles; `size="large"` for the call check |
| `Badge.tsx`       | `Badge`, `StatusPill`, `StatusIcon`, `STATUS_TINT`, `STATUS_SOLID`, `Status` | Status always with icon + words |
| `Notice.tsx`      | `Notice`                                                                | Inline message; pass `role="alert"` or `role="status"` |
| `Card.tsx`        | `Card`                                                                  | `tone` default/raised/flat; `as` |
| `Dialog.tsx`      | `Dialog`, `ConfirmDialog`                                               | Native `<dialog>`; `variant="sheet"` slides up on phones |
| `Tabs.tsx`        | `Tabs`, `TabPanel`                                                      | Arrow keys; instant switch |
| `Toast.tsx`       | `toast()`, `Toaster`                                                    | Short confirmations only |
| `Tooltip.tsx`     | `Tooltip`                                                               | CSS only; for icon-only controls |
| `Skeleton.tsx`    | `Skeleton`, `SkeletonText`, `SkeletonRow`, `SkeletonList`, `SkeletonCard`, `SkeletonChart`, `SkeletonMeter` | Shapes match the real content |
| `States.tsx`      | `EmptyState`, `ErrorState`                                              | Every async view has both |
| `SignalLine.tsx`  | `SignalLine`, `signalForLevel`                                          | States alert/caution/calm/idle |
| `RiskMeter.tsx`   | `RiskMeter`                                                             | 0–100 ruler with the engine's limits 30 and 60 |
| `Verdict.tsx`     | `Verdict`, `LEVEL_STATUS`                                               | The result of a check |
| `VerdictBadge.tsx`| `VerdictBadge`                                                          | Verdict in lists |
| `ThemeToggle.tsx` | `ThemeToggle`                                                           | Three radios in the header |
| `Kbd.tsx`, `Divider.tsx`, `cn.ts` | `Kbd`, `Divider`, `cn`                                  | |

Icons: `lucide-react` (ISC licence), stroke icons at `size-5`, always `aria-hidden` next to words, or with an `aria-label` on the control. No emoji.

## 6. Loading, empty and error states

Every view that loads data has three designed states:

- **Loading**: a skeleton with the shape of the real content, plus a `role="status"` text for screen readers („Зареждане…“). No spinners outside buttons. Skeletons reserve the size of the content, so nothing jumps.
- **Empty**: `EmptyState` with a sentence that says what will appear here and one action.
- **Error**: `ErrorState` (or a `Notice` next to a form) that says what failed and offers „Опитай отново“.

Route level: `loading.tsx` / `<Suspense>` around the parts that wait for the server (role gates, feature switches).

## 7. Accessibility

- WCAG AA contrast (tested), visible focus ring (2 px accent, 3 px offset) on everything focusable.
- Touch targets at least 44 px; 48 px for navigation; 64 px and more on the older person's screens.
- Semantic HTML first: one `h1` per page, landmarks (`header`, `nav`, `main`, `footer`), lists, tables with captions, `fieldset`/`legend`, native `dialog`, native inputs. ARIA only for live regions, tabs and the meter.
- All text in `src/i18n/bg.ts`. Works at 200 % zoom and at 360 px without sideways scrolling.

## 8. Motion

See `02-motion-decisions.md`. Short version: only `transform` and `opacity`; `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` for things that enter, `--ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)` for things that move on screen; under 300 ms for interface changes; nothing loops except the skeleton sweep and the button spinner (both are "waiting" indicators); nothing animates on page load; reduced motion keeps short fades and removes movement.

## 9. Page recipe (for every screen)

```tsx
<main className="shell py-10 md:py-16">
  <header className="mb-10 max-w-[60ch]">
    <h1 className="text-h1">Заглавие</h1>
    <p className="mt-4 text-lg text-fg-muted">Въведение.</p>
  </header>
  <section aria-labelledby="…" className="border-t border-line py-8">
    <h2 id="…" className="text-h3">…</h2>
    …
  </section>
</main>
```

- Lists of records are hairline-separated rows, not a stack of boxes. A panel (`Card`) is used when the content is one object with its own actions.
- Forms: one column, max 32 rem wide, `Field` for every control, errors next to the field and a `Notice role="alert"` summary, the submit button is the only primary button.
- Data (codes, phone numbers, times, counts): `font-mono tabular`.
