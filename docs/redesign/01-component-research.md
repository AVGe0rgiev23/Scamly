# Component research for the "Signal" redesign

This file records which building-block patterns we studied before the redesign, and what we decided.
We install none of these libraries. We copy no code, colours or assets. We only study patterns and
then write our own version in plain React, Tailwind 4 and CSS, with zero new dependencies.

Research date: 12.11.2026.

## 1. How this research was done

Every row in the table below is based on something that was really read: source code, a docs page,
or the rendered text of a page. Where only a name or a props table was visible, the row says so.

| Site | What was accessed | How | Limits |
| --- | --- | --- | --- |
| [magicui.design](https://magicui.design) | Registry list (`registry.json`) and 31 component source files | Raw files from `github.com/magicuidesign/magicui` (`apps/www/registry/magicui/*.tsx`) | Live demos not viewed. Judged from source. |
| [reactbits.dev](https://reactbits.dev) | 38 component source files (text, cards, animations, backgrounds) | Raw files from `github.com/DavidHDev/react-bits` (`src/ts-tailwind/...`) | The site itself was not rendered. GitHub API was blocked, so file paths were guessed; two guesses returned 404. |
| [uiverse.io](https://uiverse.io) | Category pages for buttons, switches, checkboxes, loaders, inputs, cards, tooltips; 28 element sources | Category pages rendered with headless Chromium (plain fetch returned 403). Element code read from `github.com/uiverse-io/galaxy` | Only the first elements of each category were sampled, out of about 4 500. |
| [ui.aceternity.com](https://ui.aceternity.com) | Full component index (about 100 names), docs pages for Glowing Effect, Animated Tabs, Multi Step Loader, and the licence page | WebFetch | Source sits behind a "Code" tab that did not load. Only props and descriptions were visible. Rows marked "index only" were seen only as a name in the index. |
| [efferd.com](https://efferd.com) | Home page and licence page | WebFetch | Efferd sells whole page sections ("blocks"), not small components. Individual blocks were not opened. Only block categories and the page structure were seen. |
| [vault.hyperiux.com](https://vault.hyperiux.com) | Home page and `/docs/license` | WebFetch | Only five effects are named on the home page. No effect source was read. |
| [styles.refero.design](https://styles.refero.design) | Home page: 20 style cards with one-line descriptions, filter tags | WebFetch | A single style page (`/style/linear`, guessed URL) returned an empty shell. No colour or type values were read. |
| [superdesign.dev](https://superdesign.dev) | Home page text and computed styles | Headless Chromium (plain fetch returned only a title) | It is an AI design tool with a prompt gallery, not a component library. No components to evaluate. |
| [neuform.ai](https://neuform.ai) | Home page text and computed styles | Headless Chromium | Login wall after the hero. It is an AI landing-page builder. No components to evaluate. |
| [ilovecreatives.com](https://ilovecreatives.com) | Home page text and structure | WebFetch | Text only. Fonts and colours were not read. |
| [cosmos.co](https://cosmos.co) | Nothing | Connection reset by the proxy (also 503 in WebFetch) | **Not accessed.** The image-collection product at `cosmos.so` was read instead (text only), in case that was the site meant. |
| [texturelabs.org](https://texturelabs.org) | Terms of use page | Headless Chromium (plain fetch returned an empty page) | The texture catalogue itself was not browsed. No texture was downloaded. |

## 2. Evaluated components

"Skip" does not mean the component is bad. It means it does not fit Scamly: an older user, a
30-second task, restrained motion (only `transform` and `opacity`, under 300 ms, no looping
decoration), one accent colour, no new dependencies.

| Source | Component | Why it is premium | Where in Scamly it would be used | Adapt or skip |
| --- | --- | --- | --- | --- |
| Magic UI | [Magic Card](https://magicui.design/docs/components/magic-card) | The border is a `radial-gradient` painted on `border-box` at the pointer position, with a flat fill on `padding-box`. Only the border near the cursor lights up. It also resets on window blur and tab hide. | Family dashboard: person cards (desktop only) | Adapt: write pointer x/y into CSS variables, no motion library. One colour (Signal Cyan at low alpha) instead of the purple-to-pink default. Off on touch devices. |
| React Bits | [Spotlight Card](https://reactbits.dev/components/spotlight-card) | The light also moves to the element that has keyboard focus, wakes up when the pointer is near (not only inside), and stops under `prefers-reduced-motion`. The falloff uses 15 `color-mix` stops, so there is no visible banding. | Family dashboard: person cards; moderator report queue rows | Adapt: take the "follows focus too" idea and the soft falloff. Skip the flare and ambient drift modes, because they move without user input. |
| Aceternity UI | [Glowing Effect](https://ui.aceternity.com/components/glowing-effect) | Props show a dead zone in the centre (`inactiveZone`) and a `proximity` margin, so the glow only reacts near the edges. Source not visible. | nowhere | Skip: default variant is a multi-colour gradient glow. The useful part (proximity) is already covered by the two rows above. |
| Magic UI | [Bento Grid](https://magicui.design/docs/components/bento-grid) | A 3-column grid with fixed row height (`auto-rows-[22rem]`) and per-card column spans. Each card has a background layer slot behind the text. | Public home page: "how it works"; family dashboard overview | Adapt: keep the uneven spans and the background slot. Drop the hover lift of the text and the hidden call-to-action that only shows on hover: an older user on a phone never sees it. Each cell gets different content, not icon + heading + text. |
| React Bits | [Magic Bento](https://reactbits.dev/components/magic-bento) | Each cell holds a tiny live demo (drawn chart, typing caret, moving packet) driven by CSS keyframes with staggered delays. | nowhere | Skip: several endless animations per cell (caret blink, spinner, packet loop). 1 400 lines for decoration. |
| Magic UI | [Text Reveal](https://magicui.design/docs/components/text-reveal) | Words go from 20 % to full opacity as the page scrolls, inside a 200vh sticky section. | nowhere | Skip: it needs a tall sticky section, which is scroll-jacking in practice, and it hides text until the user scrolls. |
| Magic UI | [Blur Fade](https://magicui.design/docs/components/blur-fade) | Content enters once with a 6px offset, opacity 0 to 1 and a 6px blur, when it comes into view (`once: true`). Very small travel distance, so it feels calm. | Verdict screen: the reasons list; education cards | Adapt: keep the 6px rise and the one-shot trigger with `IntersectionObserver`. Remove the blur (`filter` is not allowed by our motion rules). 200 ms, our ease-out. |
| Magic UI | [Text Animate](https://magicui.design/docs/components/text-animate) | Splits text by character, word or line and staggers each piece (0.05 s). | nowhere | Skip: per-character splitting breaks screen readers unless handled, and long Bulgarian words wrap badly as inline-blocks. Blur Fade on whole lines is enough. |
| React Bits | [Blur Text](https://reactbits.dev/text-animations/blur-text) | Stagger can start from the start, end, centre or random, and exit is faster than enter (40 % of the delay). | nowhere | Skip: same reason as Text Animate, and it depends on `motion`. We keep one idea: exits faster than enters. |
| React Bits | [Split Text](https://reactbits.dev/text-animations/split-text) | Scroll-triggered split text. | nowhere | Skip: needs GSAP, ScrollTrigger and the GSAP SplitText plugin. |
| Magic UI | [Number Ticker](https://magicui.design/docs/components/number-ticker) | The value is written straight into `textContent` (no React re-render per frame), starts only when in view, and uses `tabular-nums` so the width does not jump. | Admin statistics; district map report counts | Adapt: a small `requestAnimationFrame` counter with ease-out, one run, max 600 ms. Format with `Intl.NumberFormat("bg-BG")`. Under reduced motion show the final number at once. |
| React Bits | [Counter](https://reactbits.dev/components/counter) | Each digit is its own rolling column, built from `Intl.NumberFormat` parts, so separators stay still while digits roll. | Admin statistics (headline numbers only) | Adapt: digit columns moved with `translateY` only. Used for 2 or 3 headline numbers, not every number. |
| React Bits | [Count Up](https://reactbits.dev/text-animations/count-up) | Keeps a hidden real number for screen readers and marks the rolling digits `aria-hidden`. | Admin statistics | Adapt: take the accessibility idea only (real value in the DOM, animation hidden from assistive tech). |
| Magic UI | [Marquee](https://magicui.design/docs/components/marquee) | Pure CSS: the content is repeated 4 times and moved with one keyframe; the gap is a CSS variable; hover pauses it. | nowhere | Skip: it loops forever and is the usual carrier for fake logo strips. Scamly has no content that should scroll past an older reader. |
| Magic UI | [Dock](https://magicui.design/docs/components/dock) | Icon size is a function of pointer distance, smoothed with a spring. | nowhere | Skip: magnification is a mouse-only toy, and moving targets are hard for older users. Our mobile nav is a fixed bottom bar with labels. |
| React Bits | [Dock](https://reactbits.dev/components/dock) | Has a real `role="menu"` with arrow-key, Home and End handling. | Moderator and admin area: keyboard handling of menus | Adapt: take only the keyboard model (arrows, Home, End) for our dropdown menus. Skip the dock itself and its backdrop blur. |
| Magic UI | [Animated Beam](https://magicui.design/docs/components/animated-beam) | An SVG path is drawn between two real DOM elements, measured with `ResizeObserver`, and a short gradient segment travels along it. | Device pairing screen: phone to family link; this is the base of our "signal line" | Adapt: draw our waveform trace between the two nodes. It runs once when pairing succeeds (jagged, then calm) and then stays still. No endless travelling gradient. Reveal with a `transform: scaleX` cover so only transform is animated. |
| Magic UI | [Border Beam](https://magicui.design/docs/components/border-beam) | A small gradient square travels along the border using `offset-path: rect(...)`, masked so only the border ring shows. | Verdict card, at the moment the verdict appears | Adapt: one lap, then stop, in the status colour (red, amber or emerald). Built as a rotating conic gradient under a ring mask, so only `transform` animates. Static border under reduced motion. |
| Magic UI | [Shine Border](https://magicui.design/docs/components/shine-border) | Uses `mask-composite: exclude` on a padded box to cut out a ring, and already uses `motion-safe:` so it stops under reduced motion. | nowhere | Skip: a 14-second endless background-position loop. We reuse the mask-ring technique for the row above. |
| React Bits | [Star Border](https://reactbits.dev/animations/star-border) | A canvas light runs around the border and pauses when off-screen. | nowhere | Skip: canvas for a border decoration, and it loops. |
| React Bits | [Electric Border](https://reactbits.dev/animations/electric-border) | A WebGL2 shader draws a noisy electric edge and handles context loss. | nowhere | Skip: WebGL for decoration. Too loud next to a red verdict. |
| Magic UI | [Shimmer Button](https://magicui.design/docs/components/shimmer-button) | A rotating conic gradient sits behind an inset backdrop, so a thin spark runs around the edge. `active:translate-y-px` gives a physical press. | nowhere (as a button) | Skip: endless loop on the main action, and a 100px pill radius. We keep the 1px press-down. |
| React Bits | [Shiny Text](https://reactbits.dev/text-animations/shiny-text) | A highlight sweeps across text, paused when off-screen. | nowhere | Skip: it is gradient text (`background-clip: text`), which our direction forbids. |
| React Bits | [Gradient Text](https://reactbits.dev/text-animations/gradient-text) | Animated conic gradient clipped to the text. | nowhere | Skip: gradient text. |
| Magic UI | [Animated Shiny Text](https://magicui.design/docs/components/animated-shiny-text) | A narrow highlight band moves across muted text. | Loading states only (see skeleton below) | Adapt into a skeleton: the same moving band, but over grey placeholder bars, moved with `translateX`. It runs only while data loads. Static under reduced motion. |
| Magic UI | [Animated List](https://magicui.design/docs/components/animated-list) | New items enter at the top with scale and opacity while the others shift down (layout animation); a spring with high damping, so no bounce. | Live alerts page; family dashboard recent checks | Adapt: new alert enters with `translateY` and opacity, 220 ms. Only real events trigger it, never a demo timer. The list is an `aria-live="polite"` region. No `scale(0)` start. |
| React Bits | [Animated List](https://reactbits.dev/components/animated-list) | `role="listbox"` with arrow-key selection and automatic scroll-into-view. | Moderator report queue | Adapt: arrow keys move through the queue, Enter opens a report. Skip the 20px backdrop blur frame. |
| Magic UI | [Dot Pattern](https://magicui.design/docs/components/dot-pattern) | An SVG of dots that takes `currentColor`, so one text-colour class themes it; `aria-hidden`. | Page canvas behind the check flow and the dashboard | Adapt: a static SVG `<pattern>` (not one element per dot) with a radial `mask-image` fade. No pulsing glow variant. |
| Magic UI | [Grid Pattern](https://magicui.design/docs/components/grid-pattern) | One SVG `<pattern>` tile, optional dashed lines, and a list of highlighted squares. | District map page background; admin statistics | Adapt: hairline grid at very low alpha. Highlighted squares are not used. |
| Magic UI | [Flickering Grid](https://magicui.design/docs/components/flickering-grid) | Canvas squares that randomly change opacity, paused when off-screen. | nowhere | Skip: endless flicker is looping decoration and is uncomfortable for some older users. |
| Magic UI | [Noise Texture](https://magicui.design/docs/components/noise-texture) | Inline SVG `feTurbulence` (frequency 0.4, 6 octaves) with a contrast slope, so the grain is generated, not an image file. | Whole-app grain layer | Adapt: our own `feTurbulence` SVG as a tiny data-URI background at 3 to 5 % opacity. Fewer octaves for speed. Fixed, never animated. |
| React Bits | [Noise](https://reactbits.dev/animations/noise) | Canvas grain redrawn every frame like film grain. | nowhere | Skip: animated grain costs battery on old phones. Static grain looks the same at our opacity. |
| React Bits | [Aurora](https://reactbits.dev/backgrounds/aurora) | A WebGL2 shader of soft moving colour bands. | nowhere | Skip: WebGL, endless motion, and it is exactly the "glow blob" look we avoid. |
| React Bits | [Tilted Card](https://reactbits.dev/components/tilted-card) | 3D tilt follows the pointer; the card is a real button with `aria-pressed` when it can flip. | nowhere | Skip: tilt animates on every hover and adds nothing to a safety tool. |
| React Bits | [Glass Surface](https://reactbits.dev/components/glass-surface) | Refraction through SVG displacement or WebGL, with a `backdrop-filter` fallback. | nowhere | Skip: glassmorphism, and 1 000 lines. |
| React Bits | [Click Spark](https://reactbits.dev/animations/click-spark) | Short canvas sparks at the click point; nothing runs when idle. | nowhere | Skip: celebration on click does not fit a scam check. Button feedback is the 1px press. |
| React Bits | [Magnet](https://reactbits.dev/animations/magnet) | The element moves toward the pointer. | nowhere | Skip: moving targets are harder to hit for older users. |
| React Bits | [Decrypted Text](https://reactbits.dev/text-animations/decrypted-text) | Characters scramble and settle; widths are measured on a canvas so the line does not jump. | nowhere | Skip: scrambled text reads as "hacker" and could frighten the user. It also delays reading the verdict. |
| Magic UI | [Hyper Text](https://magicui.design/docs/components/hyper-text) | Same scramble idea, triggered on hover or in view. | nowhere | Skip: same reason. |
| React Bits | [Stepper](https://reactbits.dev/components/stepper) | Each step has `aria-current="step"` and a label like "Step 2: title"; the content area is `aria-live="polite"`; a "glider" highlight slides between steps. | The check flow: question 1 of N | Adapt: big step counter plus a thin progress line that grows with `scaleX`. Keep the ARIA model. Labels come from `bg.ts`. |
| Aceternity UI | [Multi Step Loader](https://ui.aceternity.com/components/multi-step-loader) | Shows a list of named states one after another (`loadingStates`, 2 000 ms each). Source not visible. | nowhere | Skip: it advances on a timer and loops by default, so the steps are fake. Our check answers in well under a second. |
| Aceternity UI | [Animated Tabs](https://ui.aceternity.com/components/tabs) | The docs describe a background that animates to the clicked tab. Source not visible. | Family dashboard sections; moderator queue filters (new, approved, rejected) | Adapt: one indicator element moved with `translateX` and `scaleX` to the measured active tab, 180 ms. Real `role="tablist"` with arrow keys. Hairline underline, not a filled pill. |
| Aceternity UI | [Timeline](https://ui.aceternity.com/components/timeline) | Index only: not opened. | Check history (possible) | Skip for now: not enough evidence. Our history is a plain dated list with a status dot. |
| Aceternity UI | [World Map](https://ui.aceternity.com/components/world-map) and [GitHub Globe](https://ui.aceternity.com/components/github-globe) | Index only: not opened. | nowhere | Skip: Scamly's map is 28 Bulgarian districts with report counts. A world map or globe shows the wrong geography. |
| Magic UI | [Globe](https://magicui.design/docs/components/globe) | A WebGL globe (the `cobe` library) that auto-rotates and can be dragged. | nowhere | Skip: new dependency, WebGL, endless rotation. Our district map is a flat SVG where each district is a focusable shape. That is more useful and more accessible. |
| Magic UI | [Dotted Map](https://magicui.design/docs/components/dotted-map) | The map is a grid of SVG circles with markers placed by latitude and longitude; markers can pulse. | nowhere | Skip: needs `svg-dotted-map`, and dots cannot show district borders. Idea kept: one marker style, no legend clutter. |
| Magic UI | [Scroll Progress](https://magicui.design/docs/components/scroll-progress) | A fixed bar scaled with `scaleX` from the scroll position. Transform only. | nowhere | Skip: our pages are short. The check flow has its own step progress, and two progress bars would confuse. |
| Magic UI | [Animated Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler) | Uses the View Transitions API with a circular `clip-path` that grows from the button, with a fallback when the API is missing. | Settings (if we ship a light theme) | Skip the animation. A plain two-state switch is enough. A full-screen wipe is too much motion for our rules. |
| Magic UI | [Avatar Circles](https://magicui.design/docs/components/avatar-circles) | Overlap with negative margin and a border in the background colour, plus a "+N" counter. | Family dashboard: who receives alerts for this person | Adapt: initials in squares with our 6px radius, hairline ring, "+N" in mono. |
| Magic UI | [Animated Circular Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar) | Two SVG arcs driven by CSS variables and `stroke-dasharray`, with a small gap between them. | nowhere | Skip: the verdict is one of three states, not a percentage. A gauge would suggest a precision we do not have. |
| Magic UI | [File Tree](https://magicui.design/docs/components/file-tree) | A nested accordion with folder icons. | nowhere | Skip: needs Radix accordion; Scamly has no tree data. |
| Magic UI | [Terminal](https://magicui.design/docs/components/terminal) | Lines type out one after another when in view. | nowhere | Skip: a developer look that means nothing to our users. |
| Magic UI | [Highlighter](https://magicui.design/docs/components/highlighter) | A hand-drawn marker line under text. | nowhere | Skip: needs `rough-notation`; the sketchy look fights the "precise instrument" direction. |
| Magic UI | [Ripple](https://magicui.design/docs/components/ripple) | Concentric circles fading out under a gradient mask. | nowhere | Skip: endless pulse. A single ring on a new alert is covered by the Animated List row. |
| Magic UI | [Progressive Blur](https://magicui.design/docs/components/progressive-blur) | Stacked `backdrop-filter` layers with stepped masks, so blur grows smoothly toward the edge. | nowhere | Skip: several backdrop blurs are slow on old phones. We fade list edges with a `mask-image` gradient. |
| Uiverse | [Switch by gharsh11032000](https://uiverse.io/gharsh11032000/brave-pug-20) | Sized in `em`, so one `font-size` scales the whole control. The real checkbox stays in the DOM (opacity 0), so it is still focusable. | Push opt-in; settings | Adapt: a real `<input type="checkbox" role="switch">`, 56 by 32 px touch size, knob moved with `translateX`, a visible focus ring, and a text label "включено / изключено" next to it. |
| Uiverse | [Switch by mobinkakei](https://uiverse.io/mobinkakei/great-skunk-8) | Neumorphic: four layered shadows make the track look pressed in. The input is `display: none`. | nowhere | Skip: low contrast, and `display: none` removes keyboard access. |
| Uiverse | [Checkbox by lenin55](https://uiverse.io/lenin55/black-dragon-46) | Material style: the native input becomes a 40px circle behind the box and shows as a halo on hover and focus. | Report form and registration consent | Adapt: keep the native input and the large hit area. Draw the tick with a `scale` transition. The halo becomes our 2px focus ring. |
| Uiverse | [Checkbox by SelfMadeSystem](https://uiverse.io/SelfMadeSystem/calm-cat-84) | Sized in `em`, 0.25 s transition. | nowhere | Skip: hides the input with `display: none`, so no keyboard focus. |
| Uiverse | [Input by adamgiebl](https://uiverse.io/adamgiebl/hot-cat-14) | A thin underline grows from the left on focus, with the colours held in CSS variables. | "What did the caller say?" text field; login and registration | Adapt: full hairline box (underline-only fields are easy to miss), plus an accent line that grows with `scaleX`. A visible label above the field always; no placeholder used as a label. |
| Uiverse | [Search input by alexruix](https://uiverse.io/alexruix/slippery-frog-10) | The icon sits inside the field, and a transparent 2px border is reserved so focus does not shift the layout. | Admin users table search; audit log filter | Adapt: take the "reserve the border" idea for all fields. 48px height instead of 40px. |
| Uiverse | [Bar loader by satyamchaudharydev](https://uiverse.io/satyamchaudharydev/red-cow-21) | A 4px bar, one pseudo-element, 1 s cycle. Small and quiet. | Top of the verdict screen while the check is sent; page transitions | Adapt: a segment moved with `translateX` (the original animates `width`). Shown only after 300 ms of waiting. Has `role="progressbar"` and a text label. |
| Uiverse | [Dots loader by adamgiebl](https://uiverse.io/adamgiebl/thin-lionfish-5) | Five dots pulse with staggered negative delays, so the wave is already running on the first frame. | nowhere | Skip: also animates `box-shadow` and colour. One loader pattern is enough. |
| Uiverse | [Jumping square by alexruix](https://uiverse.io/alexruix/white-cat-50) | The square squashes on landing and its shadow shrinks in time. | nowhere | Skip: playful; wrong tone when someone fears they are being scammed. |
| Uiverse | [Button by cssbuttons-io](https://uiverse.io/cssbuttons-io/stale-rattlesnake-87) | Lifts 7px on hover with a coloured shadow, and comes back to 1px on press. | nowhere | Skip: pill shape, glow shadow, `transition: all`. Our buttons do not move on hover; they only press 1px. |
| Uiverse | [Letter-flip button by mrhyddenn](https://uiverse.io/mrhyddenn/tall-goose-46) | Each letter is its own box that flips to another letter on hover. | nowhere | Skip: text split into boxes is unreadable for screen readers; 0.8 s transitions. |
| Uiverse | [Tooltip by gharsh11032000](https://uiverse.io/gharsh11032000/spotty-zebra-83) | Colours are CSS variables and the easing is a fast-out curve, `cubic-bezier(0.23, 1, 0.32, 1)`. | Moderator keyword chips; district names on the map | Adapt: opens on focus as well as hover, `role="tooltip"` with `aria-describedby`, 120 ms fade plus 4px rise, never the only place for important text. No bounce. |
| Uiverse | [Notification card by kennyotsu](https://uiverse.io/kennyotsu/short-ape-5) | Status icon on the left, title, text, and two text actions in one row. | Live alerts page; push opt-in result | Adapt: the layout only. Status colour appears as a 2px left rule and an icon, never as colour alone. |
| Efferd | [FAQ blocks](https://efferd.com/blocks/faqs) | Category seen (8 blocks), and Efferd's own home page ends with an FAQ section. Individual blocks not opened. | Public pages: questions about how the check works | Adapt: native `<details>` and `<summary>`, hairline dividers, the chevron rotates with `transform`. No height animation. |
| Efferd | [Logo Cloud blocks](https://efferd.com/blocks/logo-cloud) | Category seen (11 blocks). Efferd's own page has a scrolling "Trusted by" strip. | nowhere | Skip: we have no partners to show, and a fake logo strip is on our avoid list. |
| Hyperiux Vault | [Scroll Distortion](https://vault.hyperiux.com) and [Parallax Slider](https://vault.hyperiux.com/effects/scroll-effects/parallax-slider) | Named on the home page as scroll-driven effects built on GSAP, Three.js and Lenis. Source not read. | nowhere | Skip: scroll-jacking and heavy dependencies. The useful part is their checklist (see section 4, note 9). |

## 3. Shortlist

These are the 16 patterns we will build ourselves. Each one uses our tokens, only `transform` and
`opacity`, a duration under 300 ms unless stated, and a static fallback under
`prefers-reduced-motion`.

1. **Spotlight border.** Family dashboard person cards and moderator queue rows. `pointermove` and
   `focusin` write `--x` and `--y`; a `radial-gradient` on the border layer reads them. Desktop only.
2. **Bento grid.** Public home page and dashboard overview. CSS grid with named spans; every cell has
   different content; nothing is hidden behind hover.
3. **Fade-rise entrance.** Verdict reasons and education cards. One `IntersectionObserver`, a class
   toggle, 6px `translateY` plus opacity, once.
4. **Number ticker.** Admin statistics and district counts. `requestAnimationFrame`, writes
   `textContent`, `tabular-nums`, `Intl.NumberFormat("bg-BG")`, real value kept for screen readers.
5. **Live alert list.** Alerts page. New items get an "enter" class; the list is `aria-live`.
6. **Signal line (from the animated beam).** Pairing screen and verdict header. Inline SVG path
   between two measured elements; jagged path cross-fades to a calm one; revealed once with a
   `scaleX` cover.
7. **One-lap border beam.** Verdict card. A conic gradient under a ring mask rotates once in the
   status colour, then stops.
8. **Skeleton shimmer.** History lists, admin tables. A gradient band moved with `translateX`, only
   while loading.
9. **Switch.** Push opt-in. Native checkbox with `role="switch"`, knob moved with `translateX`.
10. **Checkbox.** Report form and consent. Native input, 44px hit area, tick drawn with `scale`.
11. **Input with focus line.** Check text field, login, registration. Reserved border plus an accent
    line that grows with `scaleX`; label always visible.
12. **Bar loader.** Check submission. A segment moved with `translateX`, shown after 300 ms.
13. **Tabs with sliding indicator.** Dashboard sections and moderator filters. One indicator element
    positioned from `getBoundingClientRect`, moved with `translateX` and `scaleX`.
14. **Stepper.** Check flow. Step counter, `aria-current="step"`, a progress line scaled with
    `scaleX`.
15. **Dot grid and grain.** App canvas. One SVG `<pattern>` with a radial mask, plus our own
    `feTurbulence` noise as a data-URI. Both static.
16. **Tooltip.** Keyword chips and map districts. CSS only, opens on hover and focus,
    `aria-describedby`.

## 4. Layout, type and colour notes

1. **neuform.ai: near-black canvas with tiny mono labels.** Background `rgb(5, 5, 5)`, a light-weight
   (300) sans headline at about 37px with tight tracking, and uppercase JetBrains Mono labels at about
   9px with 2px letter-spacing, in a periwinkle accent. It even shows a "56 FPS" readout. This is close
   to our "Signal" idea, so it is the main look to stay away from. **We do the opposite on size and
   weight:** no label under 14px, body text 18px or more, headline weight 600, and our accent is cyan
   with a green cast, never periwinkle. Mono is for real data (codes, times, counts), not for
   decoration.
2. **superdesign.dev: a small headline.** Inter Variable everywhere, h1 only 30px at weight 600,
   body 16px, on an almost white `rgb(252, 252, 252)` page, with grey `rgb(113, 113, 122)` helper
   text. The prompt box is the hero. **We take the idea** that the main action is the hero (our "check
   a call" button), **but not the type:** Inter is the default of every AI-made site, and we need
   Cyrillic with character.
3. **superdesign.dev: gallery cards with two numbers.** Each prompt card shows a title and
   "remixes / views". **We do the opposite:** no vanity counters anywhere. The only numbers we show
   are real report counts per district and the admin statistics.
4. **uiverse.io: dark page, two sans families.** Background `rgb(8, 8, 8)`, Inter for text, Montserrat
   700 for headings, content column 1 184px, nav links with 6px radius. **We take** the narrow column
   idea (ours is narrower still for the check flow, about 560px) **and skip** the second sans. One
   grotesk family plus one mono is our whole type system.
5. **efferd.com: the standard SaaS page order.** Centred hero with two buttons, grid of category
   cards with counts, scrolling "Trusted by" logos, alternating feature sections, wall of tweets, FAQ,
   closing call to action. **We deliberately do the opposite:** left-aligned hero with one button, no
   logo strip, no testimonial wall. If our page can be described with this list, it is wrong.
6. **efferd.com: counts on category cards.** "Auth, 14", "Dashboard, 14". A plain number next to a
   label gives density without decoration. **We take it** for the district list beside the map
   (district name, count in mono, right-aligned).
7. **styles.refero.design: style names as a test.** Each site gets a one-line description, such as
   Linear "midnight precision instrument", Raycast "Midnight command center, coral neon", Vercel
   "Typeset terminal on white paper", Wise "deep moss with lime voltage". Two things follow. First,
   "precision instrument on a dark canvas" is already Linear's territory, so **we must add something
   they do not have:** the signal line, status colours with real meaning, and large type for older
   eyes. Second, **we take the test:** if we cannot describe Scamly in one such line, the direction is
   not clear yet.
8. **styles.refero.design: filter tags.** "Hairline grid rules", "Everything rounded", "Acid lime
   accent", "Quiet luxury". These are named clichés. **We take** hairline rules (they suit an
   instrument) **and reject** "everything rounded": our radii stay at 6, 10 and 16px, and nothing is a
   pill except the switch track.
9. **vault.hyperiux.com: motion risks as a checklist.** Their page lists "Dropped Frames, Motion
   Noise, Device Motion Off, Jank & Layout Shift, Hidden Bundle Size, Touch Devices, Memory Leaks",
   and the phrase "Motion identity, not decoration". **We take the checklist** as our review list for
   every animation. **We do the opposite on tools:** they build on GSAP, Three.js and Lenis; we use
   CSS transitions and one `IntersectionObserver`.
10. **cosmos.so: one example carries the hero.** (cosmos.co did not load; this note is from
    cosmos.so.) The hero is a sentence with one concrete example query, then six features. **We take
    the concrete example:** our hero shows one real scam sentence and its red verdict. **We skip** the
    six-feature grid and the client logo strip.
11. **ilovecreatives.com: maximal and playful.** Many sections on one page, emoji, decorative symbols
    (✹, ✦), jokes in the copy, lowercase brand voice. It works for a creative school. **We do the
    opposite:** one task per screen, no emoji, no decorative symbols, calm literary Bulgarian. Density
    is allowed only in the moderator and admin areas.
12. **texturelabs.org: real scanned textures.** Their terms allow commercial use but not
    redistribution, and a scanned texture is a large image file. **We do the opposite:** our grain is
    generated in SVG (`feTurbulence`), weighs a few hundred bytes and needs no licence.
