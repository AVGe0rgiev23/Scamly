# Redesign v3 „Ореол“: motion (Phase 1A)

Rules: motion only in small `"use client"` islands; only `transform`, `opacity`,
`filter` and `clip-path` are animated (colours change with short CSS transitions);
every effect can be explained in two sentences. Library: `motion` 14.14.0 (MIT,
motion.dev), used only where a spring or a shared layout is needed (Tabs,
DynamicIsland, NumberTicker, the family's alert island). Everything else is CSS in
`src/app/globals.css` and the screens' own CSS files.

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
| Header spotlight | `SpotlightNav` (`.site-spot`) | one row-wide light cut to a link by `clip-path: inset(… round 999px)`, 420 ms ease-out; fades 150 ms; rests on the current page | the light follows where you point and returns to where you are |
| Header scroll state | `SiteHeader` (`.site-header-pill`, `.site-header-frost`) | CSS scroll timeline over the first 40 px: translateY −4 px + scale 0.975, frosted layer opacity 0 → 1 | the bar steps back and frosts once content runs under it, with no script while scrolling |
| Logo turn | `Logo` (`.brand-logo-mark`) | rotate −28° on hover, 700 ms ease-out | the halo "closes" around the dot when you reach for home |
| Dock press | `SiteDock` (`.site-dock-link`, `pressable`) | scale 0.97, 150 ms; colour/plate 150 ms linear | a tap on the bottom bar is felt; nothing grows under the finger |


### Landing page `/` (Phase 2A, `src/components/landing/landing.css`)

| Animation | Where | How | Why it exists |
| --- | --- | --- | --- |
| Hero entrance (the only one) | demo phone | rises 48 px, rotateX 16° → pose, fade, 1100 ms ease-out, once; the headline never moves | the product arrives as an object; text is readable from frame one |
| Phone tilt | hero stage (desktop mouse) | `--tilt-x/-y` ±6° + resting −6°/2° pose, 700 ms ease-out; reflection slides with `--glare` | the glass phone feels physical under the pointer |
| Halo state from the verdict | HaloField behind the hero | green → calm, yellow → caution, red → danger (rings snap shut, one shockwave), shader blend ~1 s | the signature moment: a scam call closes the shield |
| Horizon colour | `.landing-horizon` | three glow layers cross-fade by opacity, 900 ms | the aurora at the bottom turns amber/red with the risk |
| Phone edge + island dot | `.landing-phone[data-level]` | box-shadow glow 700 ms; red dot blinks 1.2 s | the danger is felt at the phone too, not only in the field |
| Gauge sweep | `RiskMeter` on the demo | `stroke-dasharray` 1100 ms ease-out (needle already turns) | the score is measured, not printed |
| Word reveal | „Затворете телефона.“ | per word opacity .12 → 1, blur 14 → 0 px, 0.18 em rise, 140 ms stagger, once on entering view | the one rule lands word by word, like being said |
| Sticky screens | „Как работи“ phone | the screen for the step at mid-window: fade + 16 px + blur 6 → 0, 450–600 ms | shows the product in the order the steps describe |
| Progress line | `.landing-steps::after` | `scaleY(--how-progress)` from scroll | shows how far through the story you are |
| Bento spotlight | bento cells (`GlassPanel spotlight`) | radial light follows the mouse | the glass reacts like glass |
| Map glow | drawn districts | blurred copies pulse opacity, 4.5 s, staggered | a living map, without inventing data |
| Voice rings | bento voice cell | three halo rings scale .4 → 1.15 and fade, 3 s, staggered | speech turning into a halo |
| Rule-card morph | hard-rules deck (desktop mouse) | name fades/lifts + blur, explanation fades in, numeral lifts, 450–600 ms on hover/focus | the name becomes its reason; on touch both are always shown |
| Island grows | family section | `DynamicIsland` opens once 450 ms after it is 60 % in view (motion layout spring) | the alert arrives the way it would on a phone |
| Illustration reveal | tool cards (desktop) | `clip-path` inset 12 px → 0, art scale 1.05, glow up, 700–900 ms | invites the click on the whole card |
| Accordion | FAQ `<details>` | `::details-content` block-size 0 → auto (`interpolate-size`), 400 ms; plus rotates 135° into a cross | the answer unfolds instead of jumping |

Reduced motion on the landing: no entrance (150 ms fade), no tilt, no blinking dot, no map pulse, still voice rings, screens/words/rule morph as 150 ms fades, gauge and accordion jump; the HaloField draws one still frame.

### Protected flow `/protected` (Phase 3, `src/components/protected/protected.css`)

| Animation | Where | How | Why it exists |
| --- | --- | --- | --- |
| Breathing halo | big round button (`.check-cta-halo`) | conic glow scale .94 → 1.06 + opacity .22 → .42, 6 s alternate; two rings scale 1.04 → 1.32 and fade, 7 s, half a cycle apart; still on weak phones | invites the press without alarming |
| Button press | `.check-cta.pressable` | scale .97, 150 ms | the finger feels the press |
| Halo dot | progress dots (`.check-dot`) | a new dot scales 0 → 1 (`@starting-style`), current dot scale 1.3, 300 ms | "you are here" and "one more question" are seen, not only read |
| Step slide | each question and the text step (`.check-step`) | translateX 24 px → 0 + fade, 380 ms ease-out; from the left when going back | shows the direction of travel |
| Voice rings | voice disc while listening (`.check-voice-rings`) | three rings scale 1 → 1.9 and fade, 1.5 s, staggered 0.5 s | the phone is listening |
| Voice blip | same (`.check-voice-blip`, new `key` per guess) | one ring scale 1 → 2.1, 700 ms, once per new words | the words were heard |
| Flood (red) | `.check-flood[data-level=red]` | `clip-path: circle(0 → 150 % at 50 % 25 %)`, 900 ms `cubic-bezier(.7,0,.2,1)` | the room turns red: unmistakable |
| Flood (amber) | `.check-flood[data-level=yellow]` | same circle, paler mix, 1.3 s in-out | a softer warning |
| Mint glow (green) | `.check-flood[data-level=green]` | opacity 0 → 1, 1.4 s | calm, no event |
| Shield closes | `.check-emblem-ring` | scale 2.4 → 1 + fade in, 700 ms, starts 120 ms | the halo becomes a shield |
| Shockwave | `.check-emblem-wave` | scale 1 → 2.6, opacity .85 → 0, 900 ms, once, starts 780 ms | the shield "locks" with one pulse |
| Glyph pop | shield / triangle / tick (`.check-emblem-glyph`) | scale .4 → 1 with small overshoot, 520 ms | the sign arrives after the ring |
| Uneven rings (amber) | `.check-emblem-arc` | rings arrive from scale 1.35, then waver rotate −6° ↔ 8°, 2.6 s, alternating | something is not right, but no alarm |
| Calm rings (green) | `.check-emblem-arc` | scale .97 ↔ 1.03, 7 s alternate | slow breathing = calm |
| Title lands | `.check-verdict-title` | from −16 px, scale 1.07, blur 8 px → place with 3 px settle, 760 ms, starts 300 ms | the verdict lands with weight |
| Rise waves | `.check-rise`, `-2`, `-3` | 14 px rise + fade, 520 ms, at 620 / 760 / 900 ms | the call button and advice follow the title, in order of importance |
| Reasons one by one | `.check-reason` | 14 px rise + fade, 460 ms, 1000 ms + 140 ms × position | each reason can be read as it arrives |
| Family island | `FamilyIsland` (`DynamicIsland`) | arrives as a pill, opens into a card after 450 ms (motion layout, SPRING_UI) | the family's answer arrives like a live notification |
| Vibration (not visual) | `CheckResult` | `navigator.vibrate([200, 100, 200])`, once per result, red only | felt even with the phone at the ear |

Reduced motion on the protected flow: the flood colour is there at once, no shockwave, no breathing or voice rings, no vibration; steps, title, rise waves and reasons are 150 ms fades; the island opens at once.

### Family area `/family/*` (Phase 4, `src/components/family/family.css`)

| Animation | Where | How | Why it exists |
| --- | --- | --- | --- |
| Alert island grows | `AlertsPage` (`.family-island`) | motion `layout` (SPRING_UI): pill → full card 450 ms after it arrives; body fades in 300 ms after 100 ms | a new alert arrives like a live notification and then demands attention |
| Island settles | same | the same layout spring shrinks the card to one calm line after „Обаждам ѝ се сега“; mint tick fades in | the emergency is visibly over, the page calms down |
| Live dot ping | `.family-island-dot::after` | scale 1 → 3.2 + fade, 1.4 s, loops while shown | "this is happening now", in the verdict's colour |
| Red halo pulse | `.family-island-pulse` (red only) | two rings scale .7 → 1.4 and fade, 2.4 s, half a cycle apart; plus `HaloRings` danger (closes once, then breathes) | the danger halo of the brand, around the risk arc |
| Risk arc | `RiskMeter` in the island | needle + arc 1100 ms ease-out, number ticks up (existing primitive) | the score is measured, not printed |
| Live icon blink | `.family-live-pill[data-live=on] svg` | opacity 1 ↔ .45, 2.4 s | the connection is alive |
| Card lift | `.family-person:hover` | translateY −3 px, halo hairline on the top edge fades in, arrow moves 3 px up-right, 300 ms | the whole card is the link |
| Push waves | `.family-push-wave` (off / on) | three circles scale .82 → 1.12 and fade, 3.6 s, 1.2 s apart | the phone "sends" an alert; mint when push is on |
| Bell swing | `.family-push-bell` (off) | rotate 12° / −10° / 5° in the last 30 % of a 4 s loop | a quiet nudge to switch push on |
| Tab pill | `Tabs` on the person page | existing shared-layout spring | shows which tab the content came from |
| Digit flip | `.family-digit` | rotateX −95° → 0 + fade, 640 ms ease-out, 70 ms apart; again for every new code | the code arrives like a split-flap display, a new code is noticed |
| Countdown bar | `.family-countdown > span` | scaleX(time left), 1 s linear per tick | the 10 minutes are seen, not only read |
| QR scan line | `.family-qr::after` | a soft halo band translateY −100 % → 600 %, 3.2 s in-out loop | "point a camera here" |
| Details chevron | `.family-chevron` | rotate 180°, 300 ms | open / closed at a glance |
| Progress halo | `.family-progress-value` | stroke-dasharray 0 → share, 600 ms ease-out | each valid step fills the ring |
| Step rail | `.family-step::before`, `.family-step-mark` | colour to the halo, 300 ms | a finished step is visibly done |
| Fridge card | `.family-fridge` | rotate −1.5° → 0 on hover, 900 ms | a paper card held by a magnet |

Reduced motion in the family area: the island opens and settles with a 150 ms fade (`REDUCED`); no pulse rings, ping, waves, bell, blink or scan line; digits fade in (150 ms) instead of flipping; no card lift; countdown bar, progress ring, chevron and fridge card jump.

## Reduced motion (`prefers-reduced-motion: reduce`)

Not a switch-off: movement goes, short fades stay, so every change is still visible.

- Dialog, sheet, toast, appear, verdict: only a 150 ms linear opacity fade (no rise,
  scale or blur).
- Magnetic hover, cursor spotlight, disc slide, press scale: off.
- Switch, Segmented and risk needle: jump to the end state.
- Tabs pill and DynamicIsland: `duration: 0` / 150 ms linear (`REDUCED`); NumberTicker
  shows the new number at once.
- Skeleton: a still tone (no shimmer). Spinners: slowed to 2.4 s.
- Header spotlight: jumps (opacity fade only). Header scroll state: off (the pill keeps its normal glass). Logo turn and dock press: off.
