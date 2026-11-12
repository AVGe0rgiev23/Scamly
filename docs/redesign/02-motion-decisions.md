# Redesign v2 · 02 · Motion decisions

Rules (Emil Kowalski's design-engineering principles): animate only when it explains a change of state, answers an action, or is the one memorable moment of a page. Only `transform` and `opacity`. Custom curves: `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` for things that appear, `--ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)` for things that move on screen. Interface changes under 300 ms. Never from `scale(0)`. Nothing animates on page load. Nothing loops except "still waiting" indicators. Keyboard-triggered changes (tabs, arrow keys in radio groups, theme switch) are instant.

Every animation in the product, and why it exists:

| What | Where | Values | Why it earns its place |
| --- | --- | --- | --- |
| Press feedback | `pressable` utility: every `Button`, `BigChoice` tile, demo scenario | `scale(0.97)`, 150 ms ease-out | Confirms the touch registered. Important for older users who press hard and wait. |
| Signal line settles | `SignalLine` (hero demo, verdict, empty/error states) | `scaleY` 700 ms ease-in-out + colour layers cross-fade 400 ms | The signature moment: when the visitor picks another sample call or edits the text, the trace visibly calms down or becomes agitated. It explains what the score change means. Runs only after the visitor's action, never on load. |
| Risk meter pointer | `RiskMeter` | `translateX` 500 ms ease-in-out | Shows the score moving from the old value to the new one, so the change is understood, not just noticed. |
| Result appears | `.appear`: check result, family message „Иван ще ви се обади веднага“, emergency advice, new live alert, report success | opacity + `translateY(8px)` 240 ms ease-out, via `@starting-style` | A new state replaces the previous screen; the short rise says "this is the answer to what you just did". |
| Dialog / sheet | `Dialog` (confirm delete, reject report, role change) | from `scale(0.96)` + opacity, 200 ms; sheet from `translateY(100%)` on phones; backdrop fades | Shows where the window comes from (centre for modals, bottom edge for sheets). Leaves instantly. |
| Toast | `Toaster` | `translateY(12px)` + opacity, 250 ms | Enters from the edge it lives on, so the eye finds it. |
| Tooltip | `Tooltip` | opacity + `scale(0.97)`, 125 ms after a 400 ms hover delay; instant on keyboard focus | The delay prevents accidental tooltips; keyboard users get it at once. |
| Checkbox tick, switch knob, radio dot | `Toggle`, `BigChoice` | `scale` / `translateX`, 150–200 ms | Confirms the new value of a control. |
| Skeleton sweep | `Skeleton` | `translateX` band, 1.6 s linear, loops | A "still loading" signal; it disappears as soon as content arrives. |
| Button spinner | `Button loading` | rotate 0.7 s linear, loops | The only spinner; says "your press is being processed". |

Deliberately not animated:

- Page transitions and section reveals on scroll: they delay reading and are seen many times a day.
- Hover effects on cards and rows: only a colour change, instant.
- Tabs (admin, report queue), the theme switch, keyboard navigation: used often and from the keyboard.
- Number tickers: the risk score and statistics change in place; counting up would make an older person wait for the real number.
- Marquees, floating blobs, parallax, glow pulses: decoration without a job.

Reduced motion (`prefers-reduced-motion: reduce`): movement is removed, not all feedback. Press scale, slides and the signal-line squeeze are off; results, dialogs and toasts still fade in over 150 ms so a change of state stays visible; the signal line switches colour state with a short fade; the skeleton shows a static tone; the button spinner turns slower.
