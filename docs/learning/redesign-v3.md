# Redesign v3 „Ореол“: what you need to understand (Alex and Roberta)

Short notes for the defense. Details: `docs/redesign-v3/` and `docs/HOW_IT_WORKS.md` 3.7.

## 1. Tokens and themes

- A **token** is a named value, e.g. `--text: #f3f4f8;` in `src/app/globals.css`. Screens
  never write a colour; they use a class made from a token, e.g. `text-fg` or `bg-canvas`.
  Like constants in a Python `config.py`: change it once, every screen follows.
- Two themes: **„Night aurora“** (dark, default) and **„Porcelain“** (light). The dark
  values sit on `:root, [data-theme="dark"]`, the light ones on `[data-theme="light"]`
  and in `@media (prefers-color-scheme: light)` (the device setting).
- Because the selectors are `[data-theme=…]`, **any** element can switch theme for what is
  inside it. `/dev/ui` uses that to show both themes side by side.
- **No flash:** a tiny script in `<head>` (`THEME_SCRIPT` in `src/config/inlineScripts.ts`)
  reads the saved choice from `localStorage` before the page is painted.
- A unit test (`src/app/tokens.test.ts`) measures contrast (WCAG AA) for every text on
  every surface, in both themes, and checks that the shader's colours equal the tokens.

## 2. The shader in plain words

- A **shader** is a tiny program the graphics card runs once for every pixel, about 60
  times a second.
- Ours measures how far the pixel is from a centre point and feeds that distance into a
  wave (cosine). Equal distances get the same brightness, so we see **rings**. Adding a
  growing number to the wave makes the rings drift outward like sound.
- The four states (`idle`, `calm`, `caution`, `danger`) are just different numbers: ring
  count, speed, wobble, amber mix, red mix. When the state changes, the numbers are
  blended over about one second, so the picture changes smoothly.
- Danger: the rings fade and one bright red ring closes around the centre, a shield.
- Two sentences for the jury: "For every pixel the graphics card measures its distance
  from the centre and turns it into a wave, so equal distances make rings. We only
  change a few numbers per state and the card redraws the picture 60 times a second."

## 3. How `motion` works

- `motion` is a React animation library (MIT). We use it only for three things: the
  sliding Tabs pill, the DynamicIsland (pill grows into a card) and NumberTicker.
- **Springs** instead of fixed durations: the movement behaves like a weight on a spring
  (stiffness, damping in `src/components/ui/motion.ts`), so it stops naturally and can be
  interrupted.
- **Shared layout** (`layoutId`): two elements with the same id are treated as one, and
  motion animates it from the old place to the new one.
- It runs only in small `"use client"` files; everything else (buttons, dialogs, toasts)
  is plain CSS.

## 4. Reduced motion

- Some people turn on "reduce motion" on their phone (dizziness, migraines). The browser
  tells us with `prefers-reduced-motion: reduce`.
- We do **not** switch everything off: movement goes, short fades stay, so every change is
  still visible. Springs become a 150 ms fade (`REDUCED`), the HaloField draws one still
  frame, HaloRings stop.

## 5. The performance guard

- `decideRenderMode()` in `src/components/ui/halo/haloMath.ts` (unit-tested) decides:
  - no WebGL2 or a weak phone (≤ 4 cores or ≤ 4 GB memory) → the still SVG `HaloRings`;
  - reduced motion → one still frame;
  - otherwise → the live shader.
- While live: at most one real pixel per CSS pixel (a 3× phone screen would cost 9× the
  work for no visible gain), paused when scrolled away or when the tab is hidden, and the
  still rings if the graphics card drops the context.
- `HaloFieldLazy.tsx` loads the WebGL code only in the browser (`next/dynamic` with
  `ssr: false`), so other pages never download it; until it arrives the still rings show.

## For the defense

Both of you should be able to explain sections 1, 4 and 5 for your own screens; the
owner of the HaloField and `motion` code (see the status board) explains sections 2 and 3.
