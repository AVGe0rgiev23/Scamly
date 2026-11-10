// End-to-end tests for the scam-script library (W3-05): the education pages
// „Как работи измамата“ and the moderator's script editor, WITHOUT a real database.
//
// How: the real /kak-raboti pages read the cards on the server, and the real
// /moderator pages sit behind the server-side role guard, so page.route() can't fake
// their data. The tests open the SAME components on the preview pages /dev/kak-raboti
// and /dev/moderator (src/app/dev/), which load their data from our API in the
// browser; page.route() answers those calls with fake cards.

import { expect, test, type Page, type Request } from "@playwright/test";
import { PREVIEW_SCRIPT_ID } from "@/components/moderator/preview";
import { bg } from "@/i18n/bg";

const POLICE_CARD = {
  slug: "politsai",
  scriptType: "police",
  titleBg: "Фалшив полицай",
  howItStartsBg: "Звъни непознат, който се представя за полицай.",
  whatTheySayBg: "„Помогнете ни да хванем измамниците.“ „Не казвайте на никого.“",
  whatToDoBg: "Затворете телефона. Полицията никога не иска пари. Обадете се на 112.",
};
const COURIER_CARD = {
  slug: "kolet-kurier",
  scriptType: "courier",
  titleBg: "Колет или куриер",
  howItStartsBg: "Идва „куриер“ с колет, който не сте поръчвали.",
  whatTheySayBg: "„Доплатете митото.“",
  whatToDoBg: "Не плащайте.",
};
// The card the editor preview shows (a draft with one keyword).
const DRAFT = {
  ...POLICE_CARD,
  id: PREVIEW_SCRIPT_ID,
  extraKeywords: ["жетон"],
  published: false,
  updatedAt: "2026-11-09T10:00:00Z",
};

// Answers GET /api/scripts (the published cards) with `scripts`.
async function servePublishedCards(page: Page, scripts: unknown[]) {
  await page.route(
    (url) => url.pathname === "/api/scripts" && !url.searchParams.has("all"),
    (route) => route.fulfill({ json: { scripts } }),
  );
}

// True when the page is not wider than the screen (no sideways scrolling).
async function fitsScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test("the education list shows the intro and one tile per published card", async ({ page }) => {
  await servePublishedCards(page, [POLICE_CARD, COURIER_CARD]);
  await page.goto("/dev/kak-raboti");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.education.title);
  await expect(page.getByText(bg.education.lead)).toBeVisible();
  const tiles = page.getByRole("main").getByRole("listitem");
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(0)).toContainText(bg.scripts.typeNames.police);
  await expect(tiles.nth(0)).toContainText(POLICE_CARD.titleBg);
  await expect(tiles.nth(1)).toContainText(COURIER_CARD.howItStartsBg);

  // The link's name says which card it opens; it opens that card.
  await page
    .getByRole("link", { name: new RegExp(`^${bg.education.readCard}.*${POLICE_CARD.titleBg}$`) })
    .click();
  await expect(page).toHaveURL(/\/dev\/kak-raboti\/karta\?slug=politsai$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(POLICE_CARD.titleBg);
});

test("the education list shows a message and the rules when the cards can't load", async ({
  page,
}) => {
  await page.route("**/api/scripts", (route) =>
    route.fulfill({ status: 500, json: { error: { code: "internal", messageBg: "x" } } }),
  );
  await page.goto("/dev/kak-raboti");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.education.loadError);
  await expect(page.getByText(bg.home.rules[0], { exact: true })).toBeVisible();
});

test("one card: how it starts, what they say, what to do, big text and print", async ({ page }) => {
  await servePublishedCards(page, [POLICE_CARD, COURIER_CARD]);
  await page.goto("/dev/kak-raboti/karta?slug=politsai");

  const card = page.getByRole("article");
  await expect(card.getByRole("heading", { level: 1 })).toHaveText(POLICE_CARD.titleBg);
  await expect(card.getByText(bg.scripts.typeNames.police, { exact: true })).toBeVisible();
  for (const title of [bg.education.howItStarts, bg.education.whatTheySay, bg.education.whatToDo]) {
    await expect(card.getByRole("heading", { level: 2, name: title })).toBeVisible();
  }
  // Each quote on its own line, each step of „what to do“ numbered.
  const say = card.getByRole("region", { name: bg.education.whatTheySay });
  await expect(say.getByRole("listitem")).toHaveText([
    "„Помогнете ни да хванем измамниците.“",
    "„Не казвайте на никого.“",
  ]);
  const steps = card.getByRole("region", { name: bg.education.whatToDo }).getByRole("listitem");
  await expect(steps).toHaveText([
    "Затворете телефона.",
    "Полицията никога не иска пари.",
    "Обадете се на 112.",
  ]);

  // Big readable text: at least 18 px.
  const fontSize = await card
    .getByText(POLICE_CARD.howItStartsBg)
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(18);

  // Print-friendly: on paper the header and the buttons are hidden.
  await expect(card.getByRole("button", { name: bg.education.print })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(card.getByRole("button", { name: bg.education.print })).toBeHidden();
  await expect(card.getByText(POLICE_CARD.whatToDoBg.split(". ")[0] + ".")).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await card.getByRole("link", { name: bg.education.backToList }).click();
  await expect(page).toHaveURL(/\/dev\/kak-raboti$/);
});

test("the header and the home page link to „Как работи измамата“", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("banner").getByRole("navigation", { name: bg.layout.navLabel });
  await menu.getByRole("link", { name: bg.layout.education, exact: true }).click();
  await expect(page).toHaveURL(/\/kak-raboti$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.education.title);
  await expect(page.getByText(bg.education.lead)).toBeVisible();

  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: bg.education.homeLink, exact: true })
    .click();
  await expect(page).toHaveURL(/\/kak-raboti$/);
});

test("the moderator hub links to the scripts and to the report queue", async ({ page }) => {
  await page.route("**/api/moderation/reports?*", (route) =>
    route.fulfill({ json: { reports: [], nextCursor: null } }),
  );
  await page.goto("/dev/moderator");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.moderator.hubTitle);
  await expect(page.getByRole("link", { name: bg.moderator.scriptsCardLink })).toHaveAttribute(
    "href",
    "/moderator/scripts",
  );
  const queue = page.getByRole("listitem").filter({ hasText: bg.moderator.reportsCardTitle });
  await expect(queue.getByRole("link", { name: bg.moderator.reportsCardLink })).toHaveAttribute(
    "href",
    "/moderator/reports",
  );
  await expect(queue).toContainText(bg.moderator.reportsCardNone);
});

test("the moderator's list shows drafts and published cards", async ({ page }) => {
  await page.route(
    (url) => url.pathname === "/api/scripts" && url.searchParams.get("all") === "1",
    (route) =>
      route.fulfill({
        json: {
          scripts: [
            { ...DRAFT, published: true },
            {
              ...COURIER_CARD,
              id: "5c000000-0000-4000-8000-0000000000e2",
              extraKeywords: [],
              published: false,
              updatedAt: "",
            },
          ],
        },
      }),
  );
  await page.goto("/dev/moderator/scripts");
  const rows = page.getByRole("main").getByRole("list").first().getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(bg.moderator.statusPublished);
  await expect(rows.nth(1)).toContainText(bg.moderator.statusDraft);
  await expect(page.getByRole("link", { name: bg.moderator.newScript })).toBeVisible();
});

test("the editor rejects a bad keyword at once and sends nothing", async ({ page }) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/scripts")) requests.push(request);
  });
  await page.goto("/dev/moderator/scripts/nova");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.moderator.newTitle);

  const field = page.getByLabel(bg.moderator.keywordLabel);
  const add = page.getByRole("button", { name: bg.moderator.keywordAdd });

  await field.fill("token");
  await add.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.scripts.keywordLetters);
  await expect(field).toHaveAttribute("aria-invalid", "true");

  await field.fill("аб");
  await field.press("Enter"); // Enter adds the keyword, it doesn't send the form
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.scripts.keywordLength);
  await expect(page.getByText(bg.moderator.keywordsEmpty)).toBeVisible();

  // A good one becomes a chip (lower case), and its „×“ removes it again.
  await field.fill("Томбол");
  await add.click();
  const chips = page.getByRole("list", { name: bg.moderator.keywordsTitle });
  await expect(chips.getByRole("listitem")).toHaveCount(1);
  await expect(chips.getByText("томбол", { exact: true })).toBeVisible();
  await field.fill("томбол");
  await add.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.moderator.keywordDuplicate);
  await page.getByRole("button", { name: "Премахни „томбол“" }).click();
  await expect(page.getByText(bg.moderator.keywordsEmpty)).toBeVisible();

  // „Запази“ with an empty title: the Bulgarian rule, the field marked, no request.
  await page.getByRole("button", { name: bg.moderator.save }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.scripts.titleInvalid);
  await expect(page.getByLabel(bg.moderator.titleLabel)).toHaveAttribute("aria-invalid", "true");
  expect(requests).toHaveLength(0);
});

test("the publish switch sends exactly { published: true } in the PATCH", async ({ page }) => {
  const patches: unknown[] = [];
  await page.route(`**/api/scripts/${PREVIEW_SCRIPT_ID}`, async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      patches.push(request.postDataJSON());
      await route.fulfill({ json: { script: { ...DRAFT, published: true } } });
      return;
    }
    await route.fulfill({ json: { script: DRAFT } });
  });
  await page.goto("/dev/moderator/scripts/edit");
  await expect(page.getByLabel(bg.moderator.titleLabel)).toHaveValue(DRAFT.titleBg);
  await expect(page.getByRole("list", { name: bg.moderator.keywordsTitle })).toContainText("жетон");

  const save = page.getByRole("button", { name: bg.moderator.save });
  // Nothing changed yet: a Bulgarian message, no request.
  await save.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.scripts.nothingToChange);

  const publish = page.getByRole("switch", { name: bg.moderator.publishedLabel });
  await expect(publish).not.toBeChecked();
  await publish.check();
  await save.click();

  await expect(page.getByRole("status").filter({ hasText: bg.moderator.saved })).toBeVisible();
  expect(patches).toEqual([{ published: true }]);
  await expect(page.getByRole("link", { name: bg.moderator.viewPublic })).toHaveAttribute(
    "href",
    "/kak-raboti/politsai",
  );
});

test("the editor shows the API's Bulgarian error, e.g. a taken address", async ({ page }) => {
  await page.route(`**/api/scripts/${PREVIEW_SCRIPT_ID}`, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 409,
          json: { error: { code: "slug_taken", messageBg: bg.scripts.slugTaken } },
        })
      : route.fulfill({ json: { script: DRAFT } }),
  );
  await page.goto("/dev/moderator/scripts/edit");
  await page.getByLabel(bg.moderator.slugLabel).fill("kolet-kurier");
  await page.getByRole("button", { name: bg.moderator.save }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.scripts.slugTaken);
});

test("no sideways scrolling at 360 px on the education and editor pages", async ({ page }) => {
  await servePublishedCards(page, [POLICE_CARD, COURIER_CARD]);
  await page.route(`**/api/scripts/${PREVIEW_SCRIPT_ID}`, (route) =>
    route.fulfill({
      json: { script: { ...DRAFT, extraKeywords: ["жетон", "томбол", "реанимац"] } },
    }),
  );
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of [
    "/",
    "/kak-raboti",
    "/dev/kak-raboti",
    "/dev/kak-raboti/karta?slug=politsai",
    "/dev/moderator",
    "/dev/moderator/scripts/edit",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(await fitsScreen(page), path).toBe(true);
  }
  // Menu links still at least 48 px high with the fourth link.
  await page.goto("/");
  for (const link of await page.getByRole("navigation").getByRole("link").all()) {
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  }
});
