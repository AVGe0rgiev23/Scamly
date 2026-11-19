# Redesign v3 „Ореол“: Phase 1A design system

Mood (decided by Alex): **„Night aurora“** is the base (dark, default), **„Porcelain“**
is the light theme, „Instrument glass“ comes later for the moderator/admin areas.

Depth comes from **light**, not from lines: every raised surface has a thin highlight
on its top edge (`inset 0 1px 0`), a fill that is a little lighter at the top and a
soft long shadow under it. Glass always has a light source (a soft spot of light in
its top-left corner). The **halo gradient** (iris → azure → mint) is the brand and is
used sparingly: the logo, the hero field, one headline word, focus rings, check
progress and selected states. Never body text, never large flat areas.

All tokens live in `src/app/globals.css`. Tailwind's default palette, type scale,
radii, shadows and easings stay switched off (`initial`); components use only these
semantic tokens. `src/app/tokens.test.ts` checks every text/surface pair for WCAG AA
in both themes (including glass laid over the page), 3 : 1 for control borders, the
focus ring and the halo used as display text, and that both copies of the light
theme are equal.

## 1. Colour tokens

| Token | Night (dark, default) | Porcelain (light) | Use |
| --- | --- | --- | --- |
| `--bg` | `#05060A` | `#F6F5F1` | the page (`bg-canvas`) |
| `--bg-elevated` | `#0B0D14` | `#FFFFFF` | Stage, dialogs (`bg-elevated`) |
| `--surface-1/2/3` | `#0B0D14` / `#11131B` / `#181B25` | `#FFFFFF` / `#FBFAF7` / `#EEEDE7` | opaque panels, skeletons |
| `--glass-1` | `rgb(255 255 255 / .04)` | `rgb(255 255 255 / .62)` | glass fill (bottom) |
| `--glass-2` | `rgb(255 255 255 / .07)` | `rgb(255 255 255 / .82)` | glass fill (top), hover |
| `--glass-border` | `rgb(255 255 255 / .10)` | `rgb(10 12 20 / .06)` | edges of raised surfaces |
| `--border` | `rgb(255 255 255 / .10)` | `rgb(10 12 20 / .08)` | quiet dividers (`border-line`) |
| `--border-strong` | `#5D6376` | `#828795` | control borders (≥ 3 : 1) |
| `--text` | `#F3F4F8` | `#0B0D12` | main text |
| `--text-muted` | `#A3A8B8` | `#474C59` | secondary text |
| `--text-subtle` | `#868CA0` | `#5B606D` | hints (tuned up from `#7C8296` for AA on surface-3) |
| `--primary` / `--on-primary` | `#F4F5F8` / `#05060A` | `#0B0D12` / `#FFFFFF` | the primary pill |
| `--primary-hover` | `#FFFFFF` | `#262A35` | |
| `--halo-1/2/3` | `#8B7BFF` → `#4CC9FF` → `#6EF3C5` | `#5B4BFF` → `#0EA5E9` → `#10B981` | brand gradient (`--halo`) |
| `--halo-ink-1/2/3` | same as halo | `#5B4BFF` → `#0277B6` → `#047857` | halo as text / under a tick (≥ 3 : 1) |
| `--ring` | `#4CC9FF` | `#5B4BFF` | focus ring |
| `--accent-bg` | `#15142C` | `#EEECFF` | selected tint |
| `--on-toggle` | `#05060A` | `#FFFFFF` | tick / thumb on the halo |
| `--overlay` | `rgb(3 4 8 / .62)` | `rgb(20 24 40 / .32)` | dialog backdrop (+ 10 px blur) |

Verdict meanings, each with `-solid / -on / -fg / -bg / -border`:

| Meaning | Night solid / on / fg / bg / border | Porcelain solid / on / fg / bg / border |
| --- | --- | --- |
| danger (red) | `#FF4D5E` `#05060A` `#FF7884` `#200A0F` `#6E2531` | `#D42A3D` `#FFFFFF` `#B01828` `#FCECEE` `#EFB3BA` |
| caution (amber) | `#FFB547` `#05060A` `#FFC56F` `#1F1708` `#6A4C19` | `#FFB547` `#1E1300` `#8A5300` `#FFF3DC` `#E8C47C` |
| no typical signs (green, `safe`) | `#3DDC97` `#05060A` `#5FE3AA` `#081D17` `#1B5E45` | `#0B7A55` `#FFFFFF` `#0A6347` `#E4F4EC` `#98D3B8` |
| info | `#8EA2FF` `#05060A` `#A8B7FF` `#0D1129` `#3A4683` | `#4453D4` `#FFFFFF` `#3342B4` `#ECEEFF` `#B3BCF2` |

`safe` is only the internal name; its words never say „безопасно“ (D9).

Tailwind colour names: `canvas, elevated, surface-1..3, glass-1, glass-2, glass-line,
line, line-strong, fg, fg-muted, fg-subtle, primary, primary-hover, on-primary,
halo-1..3, ring, overlay, {danger,caution,safe,info}-{solid,on,fg,bg,line}`. The v2
names `accent, accent-hover, on-accent, accent-bg, accent-line` are kept as aliases
(accent = the primary pill colour) so the screens render until Phases 2–6 rebuild them.

**Film grain:** our own SVG noise as a `data:` URL (the CSP's `img-src` allows
`data:`), one fixed layer over the page at 4 % (dark) / 3 % (light), `overlay` blend,
never takes a click, hidden in print.

## 2. Light, depth and glass utilities

| Utility | What it is |
| --- | --- |
| `surface-raised` | surface-1 + top-lighter gradient + glass border + highlight + near & long shadow |
| `glass` | see-through glass: top-left light spot, top-lighter gradient, highlight, long shadow, 18 px backdrop blur |
| `aurora` | the „aurora horizon“: three soft halo-coloured radial glows from the top edge |
| `halo-line` | a 1 px halo hairline that fades at both ends |
| `halo-word` | one emphasised display word: weight 700, filled with `--halo-ink` (CanvasText in forced colours) |
| `halo-mark` (class) | halo conic ring with an empty middle (`--halo-hole`) |
| `halo-ring` / `.choice-tile:has(:checked)` | selected state: a halo gradient border |
| `shadow-raised`, `shadow-overlay`, `shadow-highlight` | the depth shadows as Tailwind classes |
| `eyebrow` | tiny caps label (the only all-caps Cyrillic) |
| `shell` | the content column, max 1240 px |

Dark: highlight `inset 0 1px 0 rgb(255 255 255/.08)`, long shadow
`0 30px 60px -30px rgb(0 0 0/.7)`. Light: highlight `rgb(255 255 255/.9)`, long
shadow `0 30px 60px -30px rgb(20 24 40/.18)`, borders `1px rgb(10 12 20/.06)`.

## 3. Typography

Fonts stay self-hosted (`src/fonts`, `src/app/fonts.ts`): Sofia Sans (body), Sofia
Sans Semi Condensed (headings, `font-display`), JetBrains Mono (only codes, phones,
timestamps, numbers).

| Token | Size | Line height | Notes |
| --- | --- | --- | --- |
| `text-display` | `clamp(3rem, 2rem + 5vw, 7.5rem)` | 0.95 | weight 300, tracking −0.035em; one word in `halo-word` |
| `text-h1` | `clamp(2.375rem, 1.5rem + 3.6vw, 4.5rem)` | 1 | Semi Condensed 600, −0.022em |
| `text-h2` | `clamp(1.875rem, 1.35rem + 2.1vw, 3.25rem)` | 1.04 | |
| `text-h3` | `clamp(1.25rem, 1.12rem + .55vw, 1.625rem)` | 1.2 | |
| `text-2xl` / `text-xl` | 28 / 22 px | 1.3 / 1.45 | protected screens |
| `text-lg` / `text-base` | 18 / 17 px | 1.6 | body, weight 400 |
| `text-sm` / `text-xs` | 15 / 13 px | 1.55 / 1.45 | |

## 4. Shape, spacing, motion tokens

- Radii: `rounded-sm` 12, `rounded-md` 18, `rounded-lg` 24, `rounded-xl` 32,
  `rounded-full`. Buttons, badges, tabs, toasts, the header are pills.
- 8-point grid; content max 1240 px (`shell`); Stage inset 12 px (16 px from md).
- Easing: `--ease-out cubic-bezier(.16,1,.3,1)`, `--ease-in-out cubic-bezier(.65,0,.35,1)`.
- Durations: `--dur-micro` 150 ms, `--dur-ui` 300 ms (250–350), `--dur-hero` 900 ms
  (600–1200). Springs in `src/components/ui/motion.ts`: UI `{stiffness 380, damping 30}`,
  large `{stiffness 120, damping 20}`.
- Reduced motion: see `02-motion.md`.

## 5. Components (`src/components/ui/`)

| Component | Variants / props | Notes |
| --- | --- | --- |
| `Button`, `ButtonLink`, `buttonClass` | primary (white/ink pill + icon disc), secondary (glass), ghost, danger; sm 44 / md 48 / lg 56 / xl 64 / icon 48; `loading`, `disc`, `magnetic` | disc only when the label has no icon of its own; magnetic on desktop mouse only, never near the screen edge |
| `HaloSpinner` | | two concentric halo rings (until HaloRings) |
| `Card` | default (raised), raised (glass), flat; `as`, `padded` | Server Component |
| `GlassPanel` | `spotlight` | cursor spotlight on desktop |
| `Stage` | `field` slot, `aurora` | full-bleed 32 px hero frame; `field={<HaloFieldLazy state=… />}` for the live halo |
| `HaloField`, `HaloFieldLazy`, `HaloRings` | `state` idle / calm / caution / danger | live WebGL halo (lazy client island) and still SVG rings; see `halo-field.md` |
| `BigChoice` | normal (≥ 80 px), large (≥ 96 px, one per row); icons | native radios; selected = halo ring + check |
| `Field`, `Input` (`mono`), `Textarea`, `Select` | md 48 / lg 64 | sunken glass well, ring glow on focus |
| `Checkbox`, `Switch` | | halo-ink fill, thumb with overshoot |
| `Segmented` | sm / md, icon-only segments | sliding thumb, native radios |
| `ThemeToggle` | system / light / dark | Segmented, `scamly-theme` key |
| `Tabs`, `TabPanel` | counts | glass row, sliding pill (motion `layoutId`) |
| `Dialog`, `Sheet`, `ConfirmDialog` | modal / sheet | native `<dialog>`, blur backdrop, bottom sheet on phones |
| `toast`, `Toaster` | statuses | glass pill with icon disc, live region |
| `Tooltip` | | glass bubble, CSS only |
| `Badge`, `StatusPill`, `StatusIcon`, `STATUS_TINT`, `STATUS_SOLID` | statuses, solid | pills |
| `Notice` | statuses, `title` | tinted, icon |
| `Skeleton`, `SkeletonText/Row/List/Card/Chart/Meter` | | soft shimmer |
| `EmptyState`, `ErrorState` | `visual` slot | default picture: small still `HaloRings` (`idle` 56 px / `danger` 48 px) |
| `HaloMark` | calm / alert | still concentric halo rings (the header logo) |
| `Verdict`, `VerdictBadge`, `LEVEL_STATUS` | red / yellow / green; heading 1 or 3 | verdict light from the top; `.verdict-badge`, `.verdict-reasons li` kept |
| `RiskMeter` | `showValue` | arc gauge, faint halo track, level-coloured value, needle, limits 30/60 |
| `NumberTicker` | `from`, `duration` | real numbers only, tabular, final value for screen readers |
| `CommandPalette` | `commands`, controlled or ⌘K / Ctrl K | combobox + listbox |
| `DynamicIsland` | `status`, md / lg, controlled or not | pill ↔ card (motion layout) |
| `AvatarStack` | `max` | initials with halo ring + tooltips, „+N“ |
| `Kbd`, `Divider` (`halo`/`signal`) | | |

Temporary frame (marked „Phase 2 rebuilds this“): `layout/Logo`, `layout/SiteHeader`
(floating glass pill), `layout/SiteFooter`, `landing/CallDemo` (same engine logic),
`landing/FeatureGrid`. `SignalLine` is gone; the screens that used it show a
`halo-line` until they are rebuilt. `RoleHelp` shows an empty glass frame where the
screenshot goes (Phase 7).
