// Tests for the static halo's ring layouts: right colours per state, one shield ring.

import { describe, expect, it } from "vitest";
import { HALO_CSS_COLOURS, RING_LAYOUTS } from "./ringLayout";

describe("RING_LAYOUTS", () => {
  it("danger is exactly one bright closed ring in the danger colour", () => {
    expect(RING_LAYOUTS.danger).toHaveLength(1);
    expect(RING_LAYOUTS.danger[0]?.colour).toBe(HALO_CSS_COLOURS.danger);
    expect(RING_LAYOUTS.danger[0]?.opacity).toBe(1);
  });

  it("caution rings are all amber and tighter than idle", () => {
    for (const ring of RING_LAYOUTS.caution) expect(ring.colour).toBe(HALO_CSS_COLOURS.caution);
    const lastCaution = RING_LAYOUTS.caution.at(-1)?.radius ?? 0;
    const lastIdle = RING_LAYOUTS.idle.at(-1)?.radius ?? 0;
    expect(lastCaution).toBeLessThan(lastIdle);
  });

  it("caution spacing is uneven, idle spacing is even", () => {
    const gaps = (radii: number[]) => radii.slice(1).map((r, i) => r - (radii[i] ?? 0));
    const idleGaps = gaps(RING_LAYOUTS.idle.map((ring) => ring.radius));
    const cautionGaps = gaps(RING_LAYOUTS.caution.map((ring) => ring.radius));
    expect(new Set(idleGaps).size).toBe(1);
    expect(new Set(cautionGaps).size).toBeGreaterThan(1);
  });

  it("idle uses the aurora colours, inside to outside", () => {
    expect(RING_LAYOUTS.idle[0]?.colour).toBe(HALO_CSS_COLOURS.halo1);
    expect(RING_LAYOUTS.idle.at(-1)?.colour).toBe(HALO_CSS_COLOURS.halo3);
  });

  it("every colour has a fallback value and every ring fits in the box", () => {
    for (const colour of Object.values(HALO_CSS_COLOURS))
      expect(colour).toMatch(/^var\(--[a-z0-9-]+, #/);
    for (const rings of Object.values(RING_LAYOUTS)) {
      for (const ring of rings) expect(ring.radius + ring.width / 2).toBeLessThanOrEqual(100);
    }
  });
});
