// Checks the colour tokens in globals.css (design system v3 „Ореол“):
//   - the two copies of the light theme are the same (device setting and choice);
//   - every text colour reaches WCAG AA contrast (4.5 : 1) on every surface it is
//     used on, in both themes, including see-through glass laid over the page;
//   - text on the primary pill and on each solid verdict colour is readable;
//   - control borders and the focus ring reach 3 : 1 (WCAG 1.4.11, non-text);
//   - the halo used as text (one display word) reaches 3 : 1 (large text);
//   - the shader's colour table (HALO_PALETTE) equals these tokens in both themes.
// It reads the CSS file as text, like Python's open(...).read().

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HALO_PALETTE } from "@/components/ui/halo/haloMath";

const css = readFileSync(path.join(import.meta.dirname, "globals.css"), "utf8");

// A colour as red, green, blue (0–255) and alpha (0–1), like a Python namedtuple.
type Rgba = { r: number; g: number; b: number; a: number };

// "#0b0d14" or "rgb(255 255 255 / 0.07)" → Rgba; null for anything else.
function parseColour(value: string): Rgba | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1] !== undefined) {
    const digits = hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/.exec(value);
  if (rgb !== null) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

// The `--name: colour;` pairs inside the first block that starts with `selector`.
// Returns a dict like {"--bg": {r, g, b, a}, ...}.
function tokensAfter(selector: string): Record<string, Rgba> {
  const start = css.indexOf(selector);
  expect(start, `selector not found: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start + selector.length - 1);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const tokens: Record<string, Rgba> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    const name = match[1];
    const colour = match[2] === undefined ? null : parseColour(match[2].trim());
    if (name !== undefined && colour !== null) tokens[name] = colour;
  }
  return tokens;
}

// A see-through colour laid over an opaque one (simple alpha blending).
function over(top: Rgba, below: Rgba): Rgba {
  const mix = (a: number, b: number) => a * top.a + b * (1 - top.a);
  return { r: mix(top.r, below.r), g: mix(top.g, below.g), b: mix(top.b, below.b), a: 1 };
}

// Relative luminance and contrast ratio, the formulas of WCAG 2.
function luminance(colour: Rgba): number {
  const linear = [colour.r, colour.g, colour.b].map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = linear;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const dark = tokensAfter(':root,\n[data-theme="dark"] {');
const lightDevice = tokensAfter(':root:not([data-theme="dark"]) {');
const lightChosen = tokensAfter(':root[data-theme="light"],\n[data-theme="light"] {');

const TEXTS = ["--text", "--text-muted", "--text-subtle"];
const STATUSES = ["danger", "caution", "safe", "info"];
const REQUIRED = [
  "--bg",
  "--bg-elevated",
  "--surface-1",
  "--surface-2",
  "--surface-3",
  "--glass-1",
  "--glass-2",
  "--glass-border",
  "--border-strong",
  ...TEXTS,
  "--primary",
  "--primary-hover",
  "--on-primary",
  "--halo-1",
  "--halo-2",
  "--halo-3",
  "--ring",
  "--accent-bg",
  ...STATUSES.flatMap((status) =>
    ["solid", "on", "fg", "bg", "border"].map((part) => `--${status}-${part}`),
  ),
];

describe.each([
  ["dark", dark],
  ["light", lightChosen],
])("the %s theme", (_name, tokens) => {
  // Reads one token; a missing token fails the test with its name.
  function token(name: string): Rgba {
    const value = tokens[name];
    expect(value, `missing token ${name}`).toBeDefined();
    return value ?? { r: 0, g: 0, b: 0, a: 1 };
  }

  // Every surface text can sit on: the page, the opaque panels and both glass
  // levels laid over the raised page colour.
  function surfaces(): [string, Rgba][] {
    const elevated = token("--bg-elevated");
    return [
      ["--bg", token("--bg")],
      ["--bg-elevated", elevated],
      ["--surface-1", token("--surface-1")],
      ["--surface-2", token("--surface-2")],
      ["--surface-3", token("--surface-3")],
      ["--glass-1 over --bg", over(token("--glass-1"), token("--bg"))],
      ["--glass-2 over --bg-elevated", over(token("--glass-2"), elevated)],
    ];
  }

  it("has every token", () => {
    for (const name of REQUIRED) token(name);
  });

  it.each(TEXTS)("%s is readable on every surface (4.5 : 1)", (text) => {
    for (const [name, surface] of surfaces()) {
      expect(contrast(token(text), surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("text on the primary pill and on each solid verdict colour is readable", () => {
    expect(contrast(token("--on-primary"), token("--primary"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--on-primary"), token("--primary-hover"))).toBeGreaterThanOrEqual(4.5);
    for (const status of STATUSES) {
      expect(
        contrast(token(`--${status}-on`), token(`--${status}-solid`)),
        status,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("verdict text is readable on its own tint, on the page and on panels", () => {
    for (const status of STATUSES) {
      const fg = token(`--${status}-fg`);
      for (const surface of [`--${status}-bg`, "--bg", "--surface-1", "--surface-3"]) {
        expect(contrast(fg, token(surface)), `${status} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      // The main text is also used inside a tint (Notice, Verdict).
      expect(contrast(token("--text"), token(`--${status}-bg`)), status).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("the selected tint keeps the main text readable", () => {
    expect(contrast(token("--text"), token("--accent-bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it("the focus ring and control borders stand out from the page (3 : 1)", () => {
    for (const surface of ["--bg", "--surface-1"]) {
      expect(contrast(token("--ring"), token(surface)), surface).toBeGreaterThanOrEqual(3);
      expect(contrast(token("--border-strong"), token(surface)), surface).toBeGreaterThanOrEqual(3);
    }
  });

  it("the halo used as display text reaches 3 : 1 on the page (large text)", () => {
    for (const stop of ["--halo-ink-1", "--halo-ink-2", "--halo-ink-3"]) {
      expect(contrast(token(stop), token("--bg")), stop).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the brand values", () => {
  const hex = (colour: Rgba | undefined) =>
    colour === undefined
      ? ""
      : `#${[colour.r, colour.g, colour.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

  it("keeps the „Night“ page, text and halo colours", () => {
    expect(hex(dark["--bg"])).toBe("#05060a");
    expect(hex(dark["--text"])).toBe("#f3f4f8");
    expect([dark["--halo-1"], dark["--halo-2"], dark["--halo-3"]].map(hex)).toEqual([
      "#8b7bff",
      "#4cc9ff",
      "#6ef3c5",
    ]);
  });

  it("keeps the „Porcelain“ page, ink and deeper halo colours", () => {
    expect(hex(lightChosen["--bg"])).toBe("#f6f5f1");
    expect(hex(lightChosen["--text"])).toBe("#0b0d12");
    expect(
      [lightChosen["--halo-1"], lightChosen["--halo-2"], lightChosen["--halo-3"]].map(hex),
    ).toEqual(["#5b4bff", "#0ea5e9", "#10b981"]);
  });
});

describe("the light theme", () => {
  it("is written the same way for the device setting and for the person's choice", () => {
    expect(lightDevice).toEqual(lightChosen);
  });
});

describe("the WebGL halo", () => {
  const hex = (colour: Rgba | undefined) =>
    colour === undefined
      ? ""
      : `#${[colour.r, colour.g, colour.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

  // The shader cannot read CSS variables, so HaloField keeps its own copy of the colours.
  it("uses the same colours as the tokens in both themes", () => {
    const themes = [
      ["dark", dark],
      ["light", lightChosen],
    ] as const;
    for (const [name, tokens] of themes) {
      const palette = HALO_PALETTE[name];
      expect(
        [palette.halo1, palette.halo2, palette.halo3, palette.caution, palette.danger].map((c) =>
          c.toLowerCase(),
        ),
        name,
      ).toEqual(
        ["--halo-1", "--halo-2", "--halo-3", "--caution-solid", "--danger-solid"].map((token) =>
          hex(tokens[token]),
        ),
      );
    }
  });

  it("has the short --danger and --caution names that HaloRings reads", () => {
    expect(css).toContain("--danger: var(--danger-solid);");
    expect(css).toContain("--caution: var(--caution-solid);");
  });
});
