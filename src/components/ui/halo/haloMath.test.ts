// Tests for the halo's pure helpers: state → shader numbers and colours, the
// "can this device animate?" decision, theme choice, blending and canvas size.

import { describe, expect, it } from "vitest";
import {
  HALO_PALETTE,
  MAX_PIXELS,
  STATE_SHAPES,
  canvasPixelSize,
  decideRenderMode,
  easeInOutCubic,
  haloUniforms,
  hexToRgb,
  isLowEndDevice,
  lerp,
  mixUniforms,
  resolveTheme,
  shockProgress,
  transitionMs,
} from "./haloMath";

describe("hexToRgb", () => {
  it("turns a hex colour into 0..1 numbers", () => {
    expect(hexToRgb("#FF0000")).toEqual([1, 0, 0]);
    const [r, g, b] = hexToRgb("#8B7BFF");
    expect(r).toBeCloseTo(0x8b / 255);
    expect(g).toBeCloseTo(0x7b / 255);
    expect(b).toBe(1);
  });
});

describe("haloUniforms", () => {
  it("uses the aurora colours of the chosen theme", () => {
    expect(haloUniforms("idle", "dark", 1).aurora1).toEqual(hexToRgb(HALO_PALETTE.dark.halo1));
    expect(haloUniforms("idle", "light", 1).aurora3).toEqual(hexToRgb(HALO_PALETTE.light.halo3));
    expect(haloUniforms("idle", "dark", 1).light).toBe(0);
    expect(haloUniforms("idle", "light", 1).light).toBe(1);
  });

  it("idle and calm are even aurora rings, no amber, no red", () => {
    for (const state of ["idle", "calm"] as const) {
      const u = haloUniforms(state, "dark", 1);
      expect(u.irregular).toBe(0);
      expect(u.caution).toBe(0);
      expect(u.danger).toBe(0);
    }
  });

  it("caution rings are tighter, uneven and amber", () => {
    const idle = haloUniforms("idle", "dark", 1);
    const caution = haloUniforms("caution", "dark", 1);
    expect(caution.freq).toBeGreaterThan(idle.freq);
    expect(caution.spread).toBeLessThan(idle.spread);
    expect(caution.irregular).toBe(1);
    expect(caution.caution).toBe(1);
    expect(caution.amber).toEqual(hexToRgb("#FFB547"));
  });

  it("danger is fully red and the tightest", () => {
    const danger = haloUniforms("danger", "dark", 1);
    expect(danger.danger).toBe(1);
    expect(danger.red).toEqual(hexToRgb("#FF4D5E"));
    expect(danger.spread).toBeLessThan(STATE_SHAPES.caution.spread);
  });

  it("keeps intensity between 0 and 1", () => {
    expect(haloUniforms("idle", "dark", 3).intensity).toBe(1);
    expect(haloUniforms("idle", "dark", -1).intensity).toBe(0);
    expect(haloUniforms("idle", "dark", Number.NaN).intensity).toBe(1);
    expect(haloUniforms("idle", "dark", 0.4).intensity).toBe(0.4);
  });
});

describe("blending", () => {
  it("lerp goes in a straight line", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it("easing starts at 0, ends at 1, is symmetric and clamps", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(-2)).toBe(0);
    expect(easeInOutCubic(5)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });

  it("mixUniforms blends every number and colour", () => {
    const a = haloUniforms("idle", "dark", 1);
    const b = haloUniforms("danger", "light", 0);
    expect(mixUniforms(a, b, 0)).toEqual(a);
    expect(mixUniforms(a, b, 1)).toEqual(b);
    const half = mixUniforms(a, b, 0.5);
    expect(half.danger).toBeCloseTo(0.5);
    expect(half.intensity).toBeCloseTo(0.5);
    expect(half.aurora1[0]).toBeCloseTo((a.aurora1[0] + b.aurora1[0]) / 2);
  });

  it("the change takes about one second, danger a bit faster", () => {
    expect(transitionMs("idle")).toBeGreaterThanOrEqual(800);
    expect(transitionMs("idle")).toBeLessThanOrEqual(1200);
    expect(transitionMs("danger")).toBeGreaterThanOrEqual(800);
    expect(transitionMs("danger")).toBeLessThan(transitionMs("caution"));
  });

  it("the shockwave runs once from 0 to 1", () => {
    expect(shockProgress(5, null)).toBe(1);
    expect(shockProgress(2, 2)).toBe(0);
    expect(shockProgress(2.7, 2)).toBeCloseTo(0.5);
    expect(shockProgress(100, 2)).toBe(1);
  });
});

describe("decideRenderMode", () => {
  const strong = { webgl2: true, reducedMotion: false, hardwareConcurrency: 8, deviceMemory: 8 };

  it("animates on a strong device", () => {
    expect(decideRenderMode(strong)).toBe("animated");
  });

  it("draws one still frame for reduced motion", () => {
    expect(decideRenderMode({ ...strong, reducedMotion: true })).toBe("still");
  });

  it("falls back without WebGL2", () => {
    expect(decideRenderMode({ ...strong, webgl2: false })).toBe("fallback");
  });

  it("falls back on weak devices (4 cores or 4 GB or less)", () => {
    expect(decideRenderMode({ ...strong, hardwareConcurrency: 4 })).toBe("fallback");
    expect(decideRenderMode({ ...strong, deviceMemory: 2 })).toBe("fallback");
    expect(decideRenderMode({ ...strong, reducedMotion: true, deviceMemory: 4 })).toBe("fallback");
  });

  it("does not call a device weak when the browser hides the numbers", () => {
    expect(isLowEndDevice({ webgl2: true, reducedMotion: false })).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("a fixed choice wins", () => {
    expect(resolveTheme("light", "dark", true)).toBe("light");
    expect(resolveTheme("dark", "light", false)).toBe("dark");
  });

  it("auto reads data-theme first, then the phone's setting", () => {
    expect(resolveTheme("auto", "light", true)).toBe("light");
    expect(resolveTheme("auto", "dark", false)).toBe("dark");
    expect(resolveTheme("auto", null, true)).toBe("dark");
    expect(resolveTheme("auto", "something", false)).toBe("light");
  });
});

describe("canvasPixelSize", () => {
  it("never goes above 1 real pixel per CSS pixel", () => {
    expect(canvasPixelSize(800, 600, 3)).toEqual({ width: 800, height: 600 });
    expect(canvasPixelSize(800, 600, 1)).toEqual({ width: 800, height: 600 });
  });

  it("uses fewer pixels on screens below 1×", () => {
    expect(canvasPixelSize(800, 600, 0.5)).toEqual({ width: 400, height: 300 });
  });

  it("caps very large canvases", () => {
    const size = canvasPixelSize(3840, 2160, 2);
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_PIXELS + 4000);
    expect(size.width / size.height).toBeCloseTo(3840 / 2160, 2);
  });

  it("is at least 1×1", () => {
    expect(canvasPixelSize(0, 0, 1)).toEqual({ width: 1, height: 1 });
  });
});
