# Where the redesign ideas came from

No source code, colours or assets were copied; every component was re-implemented from scratch against Scamly's tokens. This file records where each idea came from.

Licences were read on 12.11.2026. "Unverified" means the licence text could not be read.

## Patterns

| Pattern we adapted | Inspired by (name + URL) | Upstream license (exact name + URL of license text) | What we took | What we did NOT take |
| --- | --- | --- | --- | --- |
| Spotlight border | Magic UI "Magic Card" (https://magicui.design/docs/components/magic-card); React Bits "Spotlight Card" (https://reactbits.dev/components/spotlight-card) | Magic UI: MIT License (https://github.com/magicuidesign/magicui/blob/main/LICENSE.md). React Bits: MIT + Commons Clause License Condition v1.0 (https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | The idea of a radial gradient on the border that follows the pointer, and of moving it to the focused element | Code, the purple-pink colours, the `motion` library, flare and ambient modes |
| Bento grid | Magic UI "Bento Grid" (https://magicui.design/docs/components/bento-grid) | MIT License (https://github.com/magicuidesign/magicui/blob/main/LICENSE.md) | Uneven column spans and a background slot per cell | Code, shadows, hover lift, the hover-only call to action |
| Fade-rise entrance | Magic UI "Blur Fade" (https://magicui.design/docs/components/blur-fade) | MIT License (https://github.com/magicuidesign/magicui/blob/main/LICENSE.md) | A small one-time rise with fade when content enters the screen | Code, the blur filter, the `motion` library |
| Number ticker | Magic UI "Number Ticker" (https://magicui.design/docs/components/number-ticker); React Bits "Counter" and "Count Up" (https://reactbits.dev/components/counter) | Magic UI: MIT License (URL above). React Bits: MIT + Commons Clause License Condition v1.0 (URL above) | Counting up once, fixed-width digits, a real value kept for screen readers | Code, spring physics, the `motion` library |
| Live alert list | Magic UI "Animated List" (https://magicui.design/docs/components/animated-list); React Bits "Animated List" (https://reactbits.dev/components/animated-list) | Magic UI: MIT License (URL above). React Bits: MIT + Commons Clause License Condition v1.0 (URL above) | New items entering at the top; arrow-key navigation | Code, the demo timer, scale-from-zero, backdrop blur |
| Signal line | Magic UI "Animated Beam" (https://magicui.design/docs/components/animated-beam) | MIT License (URL above) | An SVG path drawn between two measured elements | Code, the endless travelling gradient, the orange-purple colours. The waveform shape is our own |
| One-lap border beam | Magic UI "Border Beam" and "Shine Border" (https://magicui.design/docs/components/border-beam) | MIT License (URL above) | A light travelling along a masked border ring | Code, the endless loop, the two-colour gradient |
| Skeleton shimmer | Magic UI "Animated Shiny Text" (https://magicui.design/docs/components/animated-shiny-text) | MIT License (URL above) | A narrow highlight band moving across a muted surface | Code, use on text, the endless loop outside loading |
| Switch | Uiverse, switch by gharsh11032000 (https://uiverse.io/gharsh11032000/brave-pug-20) | MIT License (https://github.com/uiverse-io/galaxy/blob/main/LICENSE) | Keeping the native checkbox in the DOM; sizing from one value | Code, colours, sizes |
| Checkbox | Uiverse, checkbox by lenin55 (https://uiverse.io/lenin55/black-dragon-46) | MIT License (https://github.com/uiverse-io/galaxy/blob/main/LICENSE) | Native input kept, large hit area, focus halo idea | Code, Material colours, the ripple |
| Input with focus line | Uiverse, inputs by adamgiebl (https://uiverse.io/adamgiebl/hot-cat-14) and alexruix (https://uiverse.io/alexruix/slippery-frog-10) | MIT License (https://github.com/uiverse-io/galaxy/blob/main/LICENSE) | A line that grows on focus; a reserved border so focus does not shift layout | Code, colours, the width animation, placeholder-as-label |
| Bar loader | Uiverse, loader by satyamchaudharydev (https://uiverse.io/satyamchaudharydev/red-cow-21) | MIT License (https://github.com/uiverse-io/galaxy/blob/main/LICENSE) | A thin horizontal indeterminate bar | Code, colours, the width animation |
| Tabs with sliding indicator | Aceternity UI "Animated Tabs" (https://ui.aceternity.com/components/tabs) | Aceternity License, proprietary (https://ui.aceternity.com/licence). Whether free components have separate terms: unverified | The idea of one indicator that moves to the active tab (docs description only; source was not read) | Code (never seen), the filled pill look, the `motion` library |
| Stepper | React Bits "Stepper" (https://reactbits.dev/components/stepper) | MIT + Commons Clause License Condition v1.0 (https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | `aria-current="step"`, a polite live region, a highlight that slides between steps | Code, styling, icons |
| Dot grid and grain | Magic UI "Dot Pattern", "Grid Pattern", "Noise Texture" (https://magicui.design/docs/components/noise-texture) | MIT License (URL above) | SVG `<pattern>` backgrounds; grain generated with `feTurbulence` | Code, parameter values, the glowing dot variant |
| Tooltip | Uiverse, tooltip by gharsh11032000 (https://uiverse.io/gharsh11032000/spotty-zebra-83) | MIT License (https://github.com/uiverse-io/galaxy/blob/main/LICENSE) | A fast-out fade and small rise | Code, colours, the bounce |

## Sources studied but not used for any pattern

| Source | Licence found | Note |
| --- | --- | --- |
| Efferd (https://efferd.com) | Custom terms without a licence name (https://efferd.com/license): free blocks may be used commercially but not redistributed | Page structure studied only. Our FAQ uses native `<details>` |
| Hyperiux Vault (https://vault.hyperiux.com) | Free Core: Mozilla Public License 2.0. Pro: Hyperiux Pro License, proprietary (https://vault.hyperiux.com/docs/license) | Only their motion-risk checklist was used as a review list |
| Texturelabs (https://texturelabs.org) | Terms of Use for Textures (https://texturelabs.org/terms/): free also for commercial work, no credit required, no redistribution, no use for AI image training | No texture downloaded or used |
| styles.refero.design, superdesign.dev, neuform.ai, ilovecreatives.com, cosmos.so | Unverified (licence or terms pages not read) | Layout and type observations only. cosmos.co could not be reached |

## Fonts and textures

| Asset | Author | Licence | How we use it |
| --- | --- | --- | --- |
| Sofia Sans and Sofia Sans Semi Condensed | Lettersoup | SIL Open Font License 1.1 | Self-hosted subset, Latin + Cyrillic |
| JetBrains Mono | JetBrains | SIL Open Font License 1.1 | Self-hosted subset |
| Lucide icons | Lucide contributors | ISC License | Through the `lucide-react` package |
| Grain texture | Scamly (our own) | No third-party licence | Generated SVG `feTurbulence` noise. No third-party asset; Texturelabs assets are not used |
