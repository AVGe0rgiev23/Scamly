// Checks the colour tokens in globals.css (the design system "Signal"):
//   - the two copies of the light theme are the same (device setting and choice);
//   - every text colour reaches WCAG AA contrast (4.5 : 1) on every surface it is
//     used on, in both themes;
//   - the borders of controls reach 3 : 1 (WCAG 1.4.11, non-text contrast).
// It reads the CSS file as text, like Python's open(...).read().

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(import.meta.dirname, "globals.css"), "utf8");

// The `--name: #hex;` pairs inside the first block that starts with `selector`.
// Returns a dict like {"--bg": "#080b0f", ...}.
function tokensAfter(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  expect(start, `selector not found: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) tokens[name] = value;
  }
  return tokens;
}

// Relative luminance and contrast ratio, the formulas of WCAG 2.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r = 0, g = 0, b = 0] = linear;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const dark = tokensAfter(':root,\n[data-theme="dark"] {');
const lightDevice = tokensAfter(':root:not([data-theme="dark"]) {');
const lightChosen = tokensAfter(':root[data-theme="light"],\n[data-theme="light"] {');

const SURFACES = ["--bg", "--surface-1", "--surface-2", "--surface-3"];
const TEXTS = ["--text", "--text-muted", "--text-subtle"];
const STATUSES = ["safe", "caution", "danger", "info"];

describe.each([
  ["dark", dark],
  ["light", lightChosen],
])("the %s theme", (_name, tokens) => {
  it("has every token", () => {
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(35);
  });

  it.each(TEXTS)("%s is readable on every surface (4.5 : 1)", (text) => {
    for (const surface of SURFACES) {
      expect(contrast(tokens[text] ?? "", tokens[surface] ?? ""), surface).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("text on the accent and on each solid status colour is readable", () => {
    expect(contrast(tokens["--accent-fg"] ?? "", tokens["--accent"] ?? "")).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(tokens["--accent-fg"] ?? "", tokens["--accent-hover"] ?? ""),
    ).toBeGreaterThanOrEqual(4.5);
    for (const status of STATUSES) {
      const on = tokens[`--${status}-on`] ?? "";
      expect(contrast(on, tokens[`--${status}-solid`] ?? ""), status).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("status text is readable on its own tint, on the page and on panels", () => {
    for (const status of STATUSES) {
      const fg = tokens[`--${status}-fg`] ?? "";
      for (const surface of [`--${status}-bg`, "--bg", "--surface-1"]) {
        expect(
          contrast(fg, tokens[surface] ?? ""),
          `${status} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      // The main text is also used inside a tint (Notice, Verdict).
      expect(
        contrast(tokens["--text"] ?? "", tokens[`--${status}-bg`] ?? ""),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the accent works as text and as a focus ring on the page", () => {
    for (const surface of ["--bg", "--surface-1", "--accent-bg"]) {
      expect(
        contrast(tokens["--accent"] ?? "", tokens[surface] ?? ""),
        surface,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("control borders stand out from the page (3 : 1)", () => {
    for (const surface of ["--bg", "--surface-1"]) {
      expect(
        contrast(tokens["--border-strong"] ?? "", tokens[surface] ?? ""),
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the light theme", () => {
  it("is written the same way for the device setting and for the person's choice", () => {
    expect(lightDevice).toEqual(lightChosen);
  });
});
