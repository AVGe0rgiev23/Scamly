// End-to-end tests for the installable app (task W2-09): the web app manifest and the
// icons, the iPhone meta tags, the „Инсталирай Scamly“ card (Android variant with a
// fake `beforeinstallprompt` event, iPhone variant with an iPhone user agent), and the
// service worker: the offline card without internet, and push still in it.
// A real install and a real push on a real phone can only be tested by hand.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

// A PNG file keeps its width and height in bytes 16–23 (the IHDR block), as two
// 4-byte big-endian numbers. Like Python's struct.unpack(">II", data[16:24]).
function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function installCard(page: Page) {
  return page.getByRole("region", { name: bg.install.title });
}

// Pretends that Chrome fired `beforeinstallprompt`: an event with prompt() and
// userChoice, like the real one. window.__installPrompts counts the prompt() calls.
async function fireInstallPrompt(page: Page, outcome: "accepted" | "dismissed") {
  await page.evaluate((answer) => {
    const w = window as unknown as { __installPrompts: number };
    w.__installPrompts = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        w.__installPrompts++;
      },
      userChoice: Promise.resolve({ outcome: answer }),
    });
    window.dispatchEvent(event);
  }, outcome);
}

test("the web app manifest is valid JSON with display standalone and loadable icons", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    short_name: bg.app.name,
    lang: "bg",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toContain("any");
  expect(purposes).toContain("maskable");

  // Every icon of the manifest, plus the iPhone icon and the notification badge.
  const files: { src: string; sizes: string }[] = [
    ...manifest.icons,
    { src: "/icons/apple-touch-icon.png", sizes: "180x180" },
    { src: "/icons/badge-72.png", sizes: "72x72" },
  ];
  for (const icon of files) {
    const file = await request.get(icon.src);
    expect(file.status(), icon.src).toBe(200);
    expect(file.headers()["content-type"]).toContain("image/png");
    const size = pngSize(await file.body());
    expect(`${size.width}x${size.height}`, icon.src).toBe(icon.sizes);
  }
});

test("every page links the manifest and has the iPhone home-screen tags", async ({ page }) => {
  await page.goto("/");
  const head = page.locator("head");
  await expect(head.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  await expect(head.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(head.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    bg.app.name,
  );
  await expect(head.locator('meta[name="theme-color"]')).toHaveCount(2);
});

test("Android: the install card appears only after beforeinstallprompt, „Не сега“ hides it for good", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // No event yet: no card.
  await expect(installCard(page)).toHaveCount(0);

  await fireInstallPrompt(page, "dismissed");
  await expect(installCard(page)).toBeVisible();
  await expect(installCard(page)).toContainText(bg.install.lead);

  await installCard(page).getByRole("button", { name: bg.install.dismiss }).click();
  await expect(installCard(page)).toHaveCount(0);

  // The choice is remembered: after a reload the card stays away, even with the event.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await fireInstallPrompt(page, "dismissed");
  await expect(installCard(page)).toHaveCount(0);
});

test("Android: „Инсталирай“ opens the browser's install question and the card goes away", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await fireInstallPrompt(page, "accepted");
  await installCard(page).getByRole("button", { name: bg.install.button }).click();
  await expect(installCard(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __installPrompts: number }).__installPrompts),
  ).toBe(1);
});

test.describe("iPhone in Safari", () => {
  test.use({ userAgent: IPHONE_UA });

  test("the home page shows the 3 home-screen steps, fits 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await expect(installCard(page)).toBeVisible();
    await expect(installCard(page)).toContainText(bg.install.iosLead);
    await expect(installCard(page).getByRole("listitem")).toHaveText([
      bg.pushOptIn.iosStepShare,
      bg.pushOptIn.iosStepAdd,
      bg.pushOptIn.iosStepOpen,
    ]);
    // Safari has no install button: only „Не сега“.
    await expect(installCard(page).getByRole("button")).toHaveText([bg.install.dismiss]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("the family page leaves the steps to the push card (no second copy)", async ({ page }) => {
    await page.route("**/api/persons", (route) => route.fulfill({ json: { persons: [] } }));
    await page.goto("/dev/family");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.family.listTitle);
    await expect(page.getByRole("region", { name: bg.pushOptIn.title })).toBeVisible();
    await expect(installCard(page)).toHaveCount(0);
  });
});

test.describe("service worker", () => {
  // The other tests block service workers (playwright.config.ts); this one needs it.
  test.use({ serviceWorkers: "allow" });

  test("it keeps push and serves the offline card when there is no internet", async ({
    page,
    context,
    request,
  }) => {
    // Push is still in the worker (Alex's handlers, W2-05), and sw.js is never cached.
    const sw = await request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    const source = await sw.text();
    expect(source).toContain('addEventListener("push"');
    expect(source).toContain('addEventListener("notificationclick"');

    // Any visit registers the worker; wait until it controls the page and saved /offline.
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const saved = await caches.match("/offline");
          return navigator.serviceWorker.controller !== null && saved !== undefined;
        }),
      )
      .toBe(true);

    // Online, pages come from the network as always (not the offline card).
    await page.goto("/vhod");
    await expect(page.getByRole("heading", { name: bg.offline.title })).toHaveCount(0);

    await context.setOffline(true);
    await page.goto("/vhod");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.offline.title);
    await expect(page.getByRole("listitem")).toHaveText([...bg.home.rules]);
    await context.setOffline(false);
  });
});
