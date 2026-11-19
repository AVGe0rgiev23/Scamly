# Redesign v3 „Ореол“: motion (Phase 1A)

Rules: motion only in small `"use client"` islands; only `transform`, `opacity`,
`filter` and `clip-path` are animated (colours change with short CSS transitions);
every effect can be explained in two sentences. Library: `motion` 14.14.0 (MIT,
motion.dev), used only where a spring or a shared layout is needed (Tabs,
DynamicIsland, NumberTicker). Everything else is CSS in `src/app/globals.css`.

Tokens: `--ease-out cubic-bezier(.16,1,.3,1)`, `--ease-in-out cubic-bezier(.65,0,.35,1)`;
`--dur-micro` 150 ms, `--dur-ui` 300 ms, `--dur-hero` 900 ms; springs
`SPRING_UI {380, 30}`, `SPRING_LARGE {120, 20}` (`src/components/ui/motion.ts`).

| Animation | Where | How | Why it exists |
| --- | --- | --- | --- |
| Press scale 0.97 | `.btn`, `.pressable`, `.choice-tile` | transform, 150 ms | a finger feels the press, even on a slow phone |
| Magnetic hover | `Button`, `ButtonLink` (primary, secondary) | `--mag-x/y` translate ≤ 6 × 4 px, 300 ms ease-out; desktop mouse only, never within 12 px of the screen edge | the main action notices the pointer, which invites the click |
| Icon disc slide | primary pill `.btn-disc` | arrow leaves right, copy enters from left; disc moves 3 px | says "this goes forward" without words |
| Halo spinner | `HaloSpinner` (loading buttons) | two rings rotate at 0.9 s / 1.4 s | waiting is shown in the brand, inside the button that waits |
| Choice selected | `BigChoice` | halo border appears, check scales 0.5 → 1 with opacity, 300 ms | the chosen answer is unmistakable (ring + tick, never colour alone) |
| Switch thumb | `Switch` | translateX with overshoot `cubic-bezier(.34,1.56,.64,1)`, 420 ms | feels like a physical switch snapping into place |
| Checkbox tick | `Checkbox` | scale + opacity, 300 ms | confirms the tick without a jump |
| Segmented thumb | `Segmented`, `ThemeToggle` | translateX(i × 100 %), 380 ms ease-out | the plate slides to the choice, so the change is followed by the eye |
| Tab pill | `Tabs` | motion shared layout (`layoutId`), SPRING_UI | shows where the content came from when switching tabs |
| Field focus glow | `.field-control` | border colour + 6 px ring glow, 150/300 ms | the active field is obvious for older eyes |
| Dialog / sheet enter | `.dialog`, `.dialog-sheet` | `@starting-style` 8 px rise + 0.96 → 1 scale (sheet: from below on phones), 300–350 ms; backdrop fades + blurs | the window comes from the page, not from nowhere |
| Toast | `.toast` | 16 px rise + 0.98 scale + fade, 350 ms | appears from the edge it lives on, then leaves by itself |
| Tooltip | `.tooltip-bubble` | 400 ms hover delay, 150 ms fade + 4 px; instant on keyboard focus | does not flash while the mouse passes |
| Skeleton shimmer | `.skeleton::after` | a wide light band, translateX, 1.8 s in-out | shows that loading is in progress |
| Spotlight | `GlassPanel spotlight` | a radial light follows the mouse (`--spot-x/y`), opacity 300 ms | the glass reacts to the pointer like real glass to a torch |
| Appear | `.appear` | 8 px rise + fade, 300 ms | a result after an action arrives softly |
| Verdict reveal | `Verdict` (`.verdict-reveal`) | opacity 600 ms; translateY 16 px, scale .98, blur 6 → 0 over 900 ms | the most important moment gets a calm, weighty entrance |
| Risk needle | `RiskMeter` (`.risk-needle`) | rotate from −90° to the score, 1100 ms ease-out; follows edits | the score is "measured", not just printed |
| Number ticker | `NumberTicker` | motion `animate()` from the old to the new value, 0.9 s | a changing score is easy to follow; screen readers get the final value at once |
| Dynamic island | `DynamicIsland` | motion `layout` (SPRING_UI) pill ↔ card; body fades in after 80 ms | a live status can grow into detail without a page jump |

## Reduced motion (`prefers-reduced-motion: reduce`)

Not a switch-off: movement goes, short fades stay, so every change is still visible.

- Dialog, sheet, toast, appear, verdict: only a 150 ms linear opacity fade (no rise,
  scale or blur).
- Magnetic hover, cursor spotlight, disc slide, press scale: off.
- Switch, Segmented and risk needle: jump to the end state.
- Tabs pill and DynamicIsland: `duration: 0` / 150 ms linear (`REDUCED`); NumberTicker
  shows the new number at once.
- Skeleton: a still tone (no shimmer). Spinners: slowed to 2.4 s.
