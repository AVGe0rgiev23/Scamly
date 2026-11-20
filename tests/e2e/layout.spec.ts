// End-to-end tests for the site frame (W2-13, redesign v3 Phase 2): header, menu,
// compact theme switch and footer on every public page, and the home page with its 3
// steps and start buttons. They run without a database, so only the guest header is
// tested here; the logged-in menu (role -> area link, „Изход“) and the dock per role
// are unit-tested in src/components/layout/.
//
// On a phone (the "android-phone" project, isMobile) the menu is the glass dock at the
// bottom (still inside the header landmark, with the same name) and the theme switch
// is in the footer; on a desktop both are in the header pill.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

// The public pages and the main heading each one must show.
const PAGES = [
  { path: "/", heading: bg.app.tagline },
  { path: "/vhod", heading: bg.auth.loginTitle },
  { path: "/registratsia", heading: bg.auth.registerTitle },
  { path: "/svarzhi", heading: bg.pairing.title },
];

// True when the page is not wider than the screen (no sideways scrolling).
async function fitsScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

// The menu links a guest must see: in the header pill on a desktop, in the dock on a phone.
function guestMenuLabels(isMobile: boolean): string[] {
  return isMobile
    ? [bg.layout.dockHome, bg.layout.dockEducation, bg.layout.dockMap, bg.layout.dockLogin]
    : [bg.layout.login, bg.layout.register, bg.layout.pair, bg.layout.education];
}

// Where the theme switch is: the header on a desktop, the footer on a phone.
function themeArea(page: Page, isMobile: boolean) {
  return page.getByRole(isMobile ? "contentinfo" : "banner");
}

test("every public page has the header, the menu and the footer", async ({ page, isMobile }) => {
  for (const { path, heading } of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: bg.app.name })).toBeVisible();
    await expect(header.getByRole("link", { name: bg.layout.checkCta, exact: true })).toBeVisible();
    const menu = header.getByRole("navigation", { name: bg.layout.navLabel });
    for (const label of guestMenuLabels(isMobile)) {
      await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("contentinfo")).toContainText(bg.layout.footerProject);
    await expect(page.getByRole("contentinfo")).toContainText(bg.layout.footerPrinciples);
  }
});

test("a guest's header shows no account link, no name and no „Изход“", async ({ page }) => {
  // /family without a login is sent to /vhod; its header must be the guest one too.
  for (const path of [...PAGES.map((entry) => entry.path), "/family"]) {
    await page.goto(path);
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: bg.layout.login, exact: true })).toBeVisible();
    for (const label of [bg.layout.accountFamily, bg.layout.accountProtected]) {
      await expect(header.getByRole("link", { name: label })).toHaveCount(0);
    }
    await expect(header.getByText(bg.layout.signedInAs)).toHaveCount(0);
    await expect(header.getByRole("button", { name: bg.auth.logoutButton })).toHaveCount(0);
  }
});

test("the theme switch is a small control, not a full-width field", async ({ page, isMobile }) => {
  await page.goto("/vhod");
  // The old switch was a <select> (role "combobox") named „Изглед“ above every page.
  await expect(page.getByRole("combobox", { name: bg.theme.label })).toHaveCount(0);
  const theme = themeArea(page, isMobile).getByRole("radiogroup", { name: bg.theme.label });
  await expect(theme).toBeVisible();
  const box = await theme.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box?.width).toBeLessThan(width / 2);
  for (const radio of await theme.getByRole("radio").all()) {
    expect((await radio.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test("the theme switch changes the colours and is remembered", async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const theme = themeArea(page, isMobile).getByRole("radiogroup", { name: bg.theme.label });
  const dark = theme.getByRole("radio", { name: bg.theme.dark, exact: true });
  await expect(theme.getByRole("radio", { name: bg.theme.system, exact: true })).toBeChecked();

  await dark.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(5, 6, 10)");

  // Remembered after a reload and on another page.
  await page.reload();
  await expect(dark).toBeChecked();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(5, 6, 10)");
  await page.getByRole("contentinfo").getByRole("link", { name: bg.home.register }).click();
  await expect(page).toHaveURL(/\/registratsia$/);
  await expect(dark).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Keyboard: the arrow key moves to the next choice (the radios wrap round to „system“).
  await dark.focus();
  await page.keyboard.press("ArrowRight");
  await expect(theme.getByRole("radio", { name: bg.theme.system, exact: true })).toBeChecked();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 245, 241)");
});

test("the menu and the logo lead to the right pages", async ({ page, isMobile }) => {
  await page.goto("/");
  const menu = page.getByRole("banner").getByRole("navigation", { name: bg.layout.navLabel });
  const targets = isMobile
    ? [
        { label: bg.layout.dockLogin, url: /\/vhod$/, heading: bg.auth.loginTitle },
        { label: bg.layout.dockEducation, url: /\/kak-raboti$/, heading: bg.education.title },
      ]
    : [
        { label: bg.layout.login, url: /\/vhod$/, heading: bg.auth.loginTitle },
        { label: bg.layout.register, url: /\/registratsia$/, heading: bg.auth.registerTitle },
        { label: bg.layout.pair, url: /\/svarzhi$/, heading: bg.pairing.title },
      ];
  for (const target of targets) {
    await menu.getByRole("link", { name: target.label, exact: true }).click();
    await expect(page).toHaveURL(target.url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(target.heading);
  }
  await page.getByRole("banner").getByRole("link", { name: bg.app.name }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.app.tagline);

  // The bright pill opens the check; a phone that is not paired is sent to pairing.
  await page.getByRole("banner").getByRole("link", { name: bg.layout.checkCta }).click();
  await expect(page).toHaveURL(/\/svarzhi$/);
});

test("the current page is marked in the menu", async ({ page }) => {
  await page.goto("/vhod");
  const menu = page.getByRole("banner").getByRole("navigation", { name: bg.layout.navLabel });
  const current = menu.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", "/vhod");
});

test("the phone dock is hidden on the older person's check screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The dock is only shown on small screens.");
  await page.goto("/dev/protected");
  await expect(page.getByRole("banner").getByRole("navigation")).toHaveCount(0);
  await expect(
    page.getByRole("banner").getByRole("link", { name: bg.layout.checkCta }),
  ).toHaveCount(0);
  // Back on a public page the dock is there, with a word under every icon.
  await page.goto("/karta-za-hladilnik");
  const dock = page.getByRole("banner").getByRole("navigation", { name: bg.layout.navLabel });
  await expect(dock.getByRole("link")).toHaveCount(5);
  for (const link of await dock.getByRole("link").all()) {
    expect((await link.innerText()).trim().length).toBeGreaterThan(0);
  }
});

test("no sideways scrolling at 360 px and large tap targets in the menu", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const { path } of PAGES) {
    await page.goto(path);
    // Wait until the streamed menu has replaced its first copy (see scripts.spec.ts).
    await page.waitForLoadState("networkidle");
    expect(await fitsScreen(page)).toBe(true);
    for (const link of await page.getByRole("navigation").getByRole("link").all()) {
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    }
  }
});

test("the home page shows the 3 steps, the rules and the start buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(bg.home.problem)).toBeVisible();

  const steps = page.getByRole("main").getByRole("list").first().getByRole("listitem");
  await expect(steps).toHaveCount(3);
  for (const [index, step] of bg.home.steps.entries()) {
    await expect(steps.nth(index)).toContainText(step.title);
    await expect(steps.nth(index)).toContainText(step.text);
  }
  for (const rule of bg.home.rules) {
    await expect(page.getByText(rule, { exact: true })).toBeVisible();
  }

  // The check is the main action and sends an unpaired phone to setup.
  const main = page.getByRole("main");
  const register = main.getByRole("link", { name: bg.home.register, exact: true });
  const pair = main.getByRole("link", { name: bg.home.pair, exact: true });
  await expect(main.getByRole("link", { name: bg.home.login, exact: true })).toBeVisible();
  const check = main.getByRole("link", { name: bg.home.startCheck, exact: true });
  expect((await check.boundingBox())?.height).toBeGreaterThanOrEqual(64);
  await check.click();
  await expect(page).toHaveURL(/\/svarzhi$/);
  await page.goBack();
  await register.click();
  await expect(page).toHaveURL(/\/registratsia$/);
  await page.goBack();
  await pair.click();
  await expect(page).toHaveURL(/\/svarzhi$/);
});
