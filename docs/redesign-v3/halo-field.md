# Ореол (Halo): HaloField and HaloRings

The motif of Redesign v3: a phone call is a sound wave, and Scamly turns it into a
**halo**, soft rings around a person. When a call looks dangerous, the rings snap into
one bright red ring: a shield that closes.

## Files

| File | What it does |
| --- | --- |
| `src/components/ui/HaloField.tsx` | Live background (client component, WebGL2). |
| `src/components/ui/HaloFieldLazy.tsx` | Client island: loads HaloField only in the browser (`next/dynamic`, `ssr: false`), still HaloRings while loading. |
| `src/components/ui/HaloRings.tsx` | Static rings in SVG + CSS (works in Server Components). |
| `src/components/ui/halo/haloMath.ts` | Pure helpers: colours, numbers per state, blending, device check. |
| `src/components/ui/halo/haloShader.ts` | The GLSL shader text, with comments per step. |
| `src/components/ui/halo/haloRenderer.ts` | Compiles the shader and draws one frame (no React). |
| `src/components/ui/halo/ringLayout.ts` | Radius, width, colour of each SVG ring per state. |
| `src/app/globals.css` (`.halo-rings*`, `@keyframes halo-*`) | CSS and animation for HaloRings. Not a CSS module: our Turbopack rule passes every `*.css` file to Tailwind as global CSS, so module class names would not be made unique (found in Phase 1: the rings rendered as black discs). |
| `src/components/ui/halo/*.test.ts` | Unit tests for the pure helpers. |

## The four states

| State | Look |
| --- | --- |
| `idle` | Wide, slow, evenly spaced rings in the aurora colours (iris → azure → mint). |
| `calm` | Like idle, even wider and slower, a little brighter (e.g. after a green verdict). |
| `caution` | Rings get tighter, wobble, some brighter than others, all amber. |
| `danger` | The rings fade; one bright red ring closes around the centre; one shockwave runs out once. |

Colours: dark theme `#8B7BFF → #4CC9FF → #6EF3C5`, light theme `#5B4BFF → #0EA5E9 → #10B981`,
caution `#FFB547` (both themes), danger `#FF4D5E` (dark) / `#D42A3D` (light). HaloRings
reads them from the CSS variables `--halo-1`, `--halo-2`, `--halo-3`, `--caution`,
`--danger` (the last two are aliases of `--caution-solid` / `--danger-solid` in
`globals.css`, set on `:root` and on every `[data-theme]`, so a nested theme gets its
own colour; the dark values are the fallbacks). The shader cannot read CSS variables, so
the same values are in `HALO_PALETTE` in `haloMath.ts`; `src/app/tokens.test.ts` fails if
the two ever differ.

## How the shader works (plain words)

A shader is a tiny program the graphics card runs once **for every pixel**, about 60
times per second. Ours does seven steps:

1. **Distance:** how far is this pixel from the focal point (the "phone")?
2. **Wobble (caution only):** bend the distance a little depending on the angle, so the
   rings stop being perfect circles.
3. **Sine rings:** put the distance into a cosine wave. Where the wave is at its top we
   get a bright ring. Adding a growing number (`phase`) makes the rings travel outward.
4. **Falloff:** multiply by a bell curve so rings fade with distance, plus a soft glow in
   the middle.
5. **Shield (danger only):** draw one thin bright ring that shrinks from wide to tight as
   danger goes from 0 to 1, and one shockwave that runs outward once.
6. **Colour:** inner → middle → outer aurora colour by distance; then blend to amber
   (caution) or red (danger).
7. **Grain:** a tiny random change per pixel, so the soft gradients do not show steps.

The background stays transparent, so the halo sits on top of the page's own colour.

**For the defense (two sentences):** "For every pixel the graphics card measures its
distance from the centre and turns that distance into a wave, so equal distances make
rings. We only change a few numbers (ring count, wobble, colour mix) and the card redraws
the whole picture 60 times per second, so states blend smoothly."

## Changing state smoothly

Each state is a small set of numbers (`STATE_SHAPES` in `haloMath.ts`): ring count,
speed, reach, wobble, amber amount, danger amount, glow. When the `state` prop changes,
HaloField blends from the numbers on screen to the new ones over about one second
(`transitionMs`: 1100 ms, danger 850 ms), with an ease-in-out curve. The ring drift is
added up frame by frame, so changing the speed never makes the rings jump.

## Fallbacks and the performance guard

`decideRenderMode` (tested) picks one of three modes:

| Situation | What is shown |
| --- | --- |
| No WebGL2, or a weak device (`hardwareConcurrency <= 4` or `deviceMemory <= 4`) | `HaloRings` (static SVG), no canvas at all |
| The person asked for reduced motion | One still frame of the shader, then nothing runs |
| Otherwise | The live shader |

More guards inside HaloField:

- **At most 1 real pixel per CSS pixel** (and at most about 2 million pixels in total).
  A soft glow looks the same at 1×, and a 3× phone screen would cost 9× the work.
- **Pauses** when the halo is scrolled off-screen (`IntersectionObserver`) or the tab is
  hidden (`visibilitychange`).
- **Context lost** (the graphics card resets): switches to `HaloRings`.
- **Cleanup on unmount:** stops the frame loop, removes every listener, frees the
  graphics memory (`WEBGL_lose_context`).
- Only the canvas pixels change: no layout property is ever animated.
- `aria-hidden="true"`: the halo is decoration; screen readers skip it.

`HaloRings` animates only `transform` and `opacity` with CSS keyframes, and stops all
animation under `prefers-reduced-motion`.

## How to use it in a page

### HaloField (live)

Use the ready island `HaloFieldLazy` (same props; `className` defaults to
`absolute inset-0`). It works from Server Components too, and `Stage` has a slot for it:

```tsx
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";

<Stage field={<HaloFieldLazy state="idle" />}>…hero content…</Stage>
```

`/dev/ui` shows it in a hero with a state switcher and in both themes.

How the island is built (if you need another one): HaloField is a client component and
needs the browser, so it is loaded lazily and only on the client. `ssr: false` is not
allowed in a Server Component, so it sits in a small client file:

```tsx
// src/components/landing/HeroHalo.tsx
"use client";
import dynamic from "next/dynamic";
import type { HaloState } from "@/components/ui/halo/haloMath";

const HaloField = dynamic(() => import("@/components/ui/HaloField"), { ssr: false });

export function HeroHalo({ state }: { state: HaloState }) {
  return <HaloField state={state} className="absolute inset-0" />;
}
```

Then in the page, give the parent `position: relative` and a size:

```tsx
<section className="relative min-h-[80vh]">
  <HeroHalo state={demoState} />
  …text and buttons…
</section>
```

Props:

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `state` | `"idle" \| "calm" \| "caution" \| "danger"` | (required) | The mood. |
| `intensity` | number 0–1 | `1` | Overall strength. |
| `theme` | `"dark" \| "light" \| "auto"` | `"auto"` | `auto` reads the nearest `data-theme`, else the phone's setting. |
| `focus` | `{ x, y }` (0–1 from top left) | `{ x: 0.38, y: 0.5 }` | Where the rings start. |
| `className` | string |  | Size and position (e.g. `absolute inset-0`). |

### HaloRings (static)

Works anywhere, also in Server Components:

```tsx
import { HaloRings } from "@/components/ui/HaloRings";

<HaloRings state="danger" size={96} />
<HaloRings state="idle" size="40vmin" animated={false} />
```

Props: `state`, `size` (number = px, or any CSS size; default 160), `animated`
(default `true`), `className`, `style`.

## Tests

`npx vitest run src/components/ui/halo`:

- `haloMath.test.ts`: colours per theme, numbers per state (caution tighter and amber,
  danger red), intensity clamping, blending and easing, transition length, shockwave,
  the device decision (WebGL2 / weak device / reduced motion), theme choice, canvas size.
- `ringLayout.test.ts`: danger is exactly one ring; caution amber and uneven; idle even
  and aurora; every CSS colour has a fallback.
- `haloShader.test.ts`: the shader is WebGL2 and declares exactly the uniforms the
  renderer sends.
