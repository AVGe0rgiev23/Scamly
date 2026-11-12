// Makes the PNG app icons in public/icons/ from the SVG sources next to this file
// (task W2-09), and src/app/favicon.ico from src/app/icon.svg (W4-04). Run it after changing an SVG: `npm run icons`.
//
// How: Playwright's Chromium (already installed for our browser tests) opens each SVG
// at the exact pixel size and takes a screenshot with a transparent background. So
// the icons are reproducible and need no image editor or extra package.

import { readFile, writeFile } from "node:fs/promises";
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
  // src/app/favicon.ico (W4-04): browsers ask for /favicon.ico by themselves, and a
  // 404 there shows up as an error in Lighthouse. An .ico file may simply contain a
  // PNG: a 6-byte header, one 16-byte directory entry, then the PNG bytes.
  const svg = await readFile(join(here, "..", "..", "src", "app", "icon.svg"), "utf8");
  const page = await browser.newPage({ viewport: { width: 48, height: 48 } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">` +
      svg.replace("<svg ", `<svg width="48" height="48" style="display:block" `) +
      `</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(48, 6); // width
  header.writeUInt8(48, 7); // height
  header.writeUInt8(0, 8); // no colour palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // size of the PNG
  header.writeUInt32LE(22, 18); // where the PNG starts
  await writeFile(
    join(here, "..", "..", "src", "app", "favicon.ico"),
    Buffer.concat([header, png]),
  );
  console.log("src/app/favicon.ico (48×48)");
} finally {
  await browser.close();
}
