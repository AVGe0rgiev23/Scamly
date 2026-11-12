// Makes the Open Graph picture src/app/opengraph-image.png from og.html next to this
// file, with Playwright's Chromium (like scripts/icons/generate.mjs). Next.js adds
// the <meta property="og:image"> tags for that file by itself.
// Run it after changing og.html: `npm run og`.
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "..", "..", "src", "app", "opengraph-image.png");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(join(here, "og.html")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output });
  console.log("src/app/opengraph-image.png (1200×630)");
} finally {
  await browser.close();
}
