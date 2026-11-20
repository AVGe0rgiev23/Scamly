# Redesign v3 „Ореол“: references

What we looked to for ideas, and what we take from each. We only **look**: no code,
colours, images, fonts or other assets are copied, and every component is written by us
with our own tokens (the jury's "original components" criterion; our GPL-3.0 repository
cannot hold paid code anyway). See `docs/WHY_WE_CHOSE.md`, entry "Studying paid
component libraries visually, but writing our own components".

> **Honest status (19 Nov, Phase 1):** the four sites below were taken from the
> descriptions in Alex's redesign brief. They have **not yet been studied live** in a
> browser. Phase 1 (tokens, primitives, HaloField) was built from the brief's words and
> our own design notes (`03-design-system.md`, `02-motion.md`, `halo-field.md`).
> **Phase 2 studies them live** for the landing page and adds what we saw (with dates)
> to this table.

## Studied component sites (ideas only)

| Site | What it is (per the brief) | What we want to learn from it | Licence of its code | Status |
| --- | --- | --- | --- | --- |
| getlayers.ai | Product site with layered glass panels and soft lighting | How glass, a light source and depth make a calm, premium surface | not ours to use (we copy nothing) | from the brief; live study in Phase 2 |
| vengenceui.com | Animated React component collection | Micro-interactions: press, hover, reveal timing | per its own terms (we copy nothing) | from the brief; live study in Phase 2 |
| skiper-ui.com | Animated sections and components, partly paid | Hero sections and "dynamic island" style status pills | paid parts forbid redistribution (we copy nothing) | from the brief; live study in Phase 2 |
| animmasterlib.dev | Animation library / examples | How springs and staggered reveals feel; what to keep subtle | per its own terms (we copy nothing) | from the brief; live study in Phase 2 |

## Mental references (well-known products, not studied for this document)

| Product | What we take as an idea |
| --- | --- |
| Linear | Dark-first calm, precise type, very little colour |
| Vercel | Strong contrast, a pill primary button, generous whitespace |
| Arc | Playful but controlled motion, soft gradients |
| Raycast | The command palette (⌘K / Ctrl K) and keyboard-first use |
| Apple (iOS) | The Dynamic Island, materials lit from above, reduced motion done well |
| Stripe | Gradients used sparingly as a brand mark, clear hierarchy |

## What we did with them in Phase 1

- Materials: raised surfaces and glass lit from one light source (`surface-raised`,
  `glass`, `GlassPanel spotlight`).
- Motion: springs only where they help (Tabs, DynamicIsland, NumberTicker), everything
  else short CSS; reduced motion keeps short fades.
- New primitives inspired by the product references: `CommandPalette` (Raycast),
  `DynamicIsland` (Apple), `AvatarStack`, `Stage` (hero frame).
- The halo motif itself (HaloField, HaloRings) is our own idea: a call is a sound wave
  that Scamly turns into a protective halo.

## Live study for the landing page (20 Nov, Phase 2A)

Each site was opened at 1440 × 900 for a few minutes and scrolled (screenshots kept
out of the repo; nothing copied). What we noted and what we did with it:

| Site | What we saw | What we took (as a principle) |
| --- | --- | --- |
| getlayers.ai | A rounded inset "stage" hero with a grainy light from one corner; a short, light headline whose last words are a quieter tone; one pill CTA with an icon disc; small outlined chips above section heads; bento cards with an inner, inset panel (a frame in a frame); lots of black between sections | Our hero `Stage` with one light source and a single bright pill; eyebrows above every section head; bento cells whose picture sits in its own inner panel; generous gaps |
| skiper-ui.com | A huge typographic statement with tiny labels above and below, nearly nothing else on screen | Section 2 „Затворете телефона.“ as a lone display statement |
| vengenceui.com | A split hero: text left, a framed line-art illustration right on a faint grid; mono sub-text | Our own line illustrations for the tools; mono only for numbers and codes |
| animmasterlib.dev | A glow rising from the hero's bottom edge; but all-caps, neon cyan everywhere | The aurora horizon from the bottom edge (in our halo colours, changing with the verdict); a reminder of what to avoid: all caps and one loud colour |
