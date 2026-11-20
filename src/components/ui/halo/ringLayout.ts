// Which rings HaloRings draws for each state: radius, thickness, colour and opacity.
// Pure data (no React), so a test can check e.g. that danger is exactly one ring.
// The SVG uses a box from -100 to 100, so a radius of 90 almost touches the edge.

import type { HaloState } from "./haloMath";

// CSS colours with fallbacks: the real values come from globals.css; the second value
// is used only if that variable is missing.
export const HALO_CSS_COLOURS = {
  halo1: "var(--halo-1, #8B7BFF)",
  halo2: "var(--halo-2, #4CC9FF)",
  halo3: "var(--halo-3, #6EF3C5)",
  caution: "var(--caution, #FFB547)",
  danger: "var(--danger, #FF4D5E)",
} as const;

// A colour halfway between two others, mixed by the browser (like a paint palette).
function between(a: string, b: string): string {
  return `color-mix(in oklab, ${a}, ${b})`;
}

export type Ring = {
  radius: number;
  width: number;
  colour: string;
  opacity: number;
};

const C = HALO_CSS_COLOURS;

export const RING_LAYOUTS: Record<HaloState, Ring[]> = {
  // Wide, evenly spaced, aurora colours from the inside out.
  idle: [
    { radius: 30, width: 1.6, colour: C.halo1, opacity: 0.9 },
    { radius: 45, width: 1.4, colour: between(C.halo1, C.halo2), opacity: 0.75 },
    { radius: 60, width: 1.2, colour: C.halo2, opacity: 0.6 },
    { radius: 75, width: 1.1, colour: between(C.halo2, C.halo3), opacity: 0.45 },
    { radius: 90, width: 1, colour: C.halo3, opacity: 0.3 },
  ],
  // The same calm rings, a little wider apart and softer.
  calm: [
    { radius: 34, width: 1.6, colour: C.halo1, opacity: 0.85 },
    { radius: 52, width: 1.3, colour: C.halo2, opacity: 0.6 },
    { radius: 70, width: 1.1, colour: between(C.halo2, C.halo3), opacity: 0.45 },
    { radius: 88, width: 1, colour: C.halo3, opacity: 0.3 },
  ],
  // Tighter and uneven, all amber.
  caution: [
    { radius: 22, width: 2, colour: C.caution, opacity: 0.95 },
    { radius: 30, width: 1.4, colour: C.caution, opacity: 0.6 },
    { radius: 43, width: 1.8, colour: C.caution, opacity: 0.75 },
    { radius: 50, width: 1.1, colour: C.caution, opacity: 0.4 },
    { radius: 66, width: 1.3, colour: C.caution, opacity: 0.35 },
  ],
  // One bright closed ring: the shield.
  danger: [{ radius: 46, width: 6, colour: C.danger, opacity: 1 }],
};

// The soft light in the middle of each state.
export const CORE_COLOUR: Record<HaloState, string> = {
  idle: C.halo1,
  calm: C.halo2,
  caution: C.caution,
  danger: C.danger,
};
