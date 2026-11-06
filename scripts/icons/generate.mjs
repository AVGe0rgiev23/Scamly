// Makes the PNG app icons in public/icons/ from the SVG sources next to this file
// (task W2-09). Run it after changing an SVG: `npm run icons`.
//
// How: Playwright's Chromium (already installed for our browser tests) opens each SVG
// at the exact pixel size and takes a screenshot with a transparent background. So
// the icons are reproducible and need no image editor or extra package.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "public", "icons");

// [SVG source, PNG file, size in pixels]
const ICONS = [
  ["icon.svg", "icon-192.png", 192],
  ["icon.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "icon-maskable-512.png", 512],
  ["icon.svg", "apple-touch-icon.png", 180],
  ["badge.svg", "badge-72.png", 72],
];

const browser = await chromium.launch();
try {
  for (const [source, file, size] of ICONS) {
    const svg = await readFile(join(here, source), "utf8");
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    // The SVG fills the whole page; no margin, transparent page background.
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
        svg.replace("<svg ", `<svg width="${size}" height="${size}" style="display:block" `) +
        `</body></html>`,
    );
    await page.screenshot({ path: join(outDir, file), omitBackground: true });
    await page.close();
    console.log(`public/icons/${file} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
