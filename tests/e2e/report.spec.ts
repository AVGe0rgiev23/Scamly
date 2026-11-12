// End-to-end tests for the public report form /signal (W3-02), WITHOUT a real database.
// The page is public and sends POST /api/reports from the browser, so page.route()
// answers that request with a fake 201, 400 or 429 and we test the real page.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";
import { addDays, todayInBulgaria } from "@/schemas/reports";

const API = "**/api/reports";

// Answers POST /api/reports with `status` and `body`; returns the bodies sent.
async function fakeApi(page: Page, status: number, body: unknown): Promise<unknown[]> {
  const sent: unknown[] = [];
  await page.route(API, async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return sent;
}

// The date field gets today's date only in the browser, so once it has it, React runs
// the form (a click before that would be a plain HTML form submit).
async function waitForForm(page: Page) {
  await expect(page.getByLabel(bg.reportForm.date)).toHaveValue(todayInBulgaria(new Date()));
}

async function fillGoodReport(page: Page) {
  await waitForForm(page);
  await page.getByLabel(bg.reportForm.district).selectOption("BG-02");
  await page.getByRole("radio", { name: bg.reportForm.scriptOptions.police }).check();
  await page.getByLabel(bg.reportForm.description).fill("Казаха, че са от полицията.");
}

function noSidewaysScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test("shows the intro and every field, with today as the date", async ({ page }) => {
  await page.goto("/signal");
  await expect(page.getByRole("heading", { level: 1, name: bg.reportForm.title })).toBeVisible();
  for (const point of bg.reportForm.privacy) {
    await expect(page.getByText(point)).toBeVisible();
  }
  await expect(page.getByLabel(bg.reportForm.district).locator("option")).toHaveCount(29);
  await expect(page.getByRole("form").getByRole("radio")).toHaveCount(5);
  await expect(page.getByLabel(bg.reportForm.date)).toHaveValue(todayInBulgaria(new Date()));
  await expect(page.getByText(bg.reportForm.descriptionHint)).toBeVisible();
  await expect(page.getByText(bg.reportForm.callerNumberHint)).toBeVisible();
});

test("shows a Bulgarian error under each wrong field and sends nothing", async ({ page }) => {
  const sent = await fakeApi(page, 201, { ok: true });
  await page.goto("/signal");
  await waitForForm(page);
  await page.getByRole("button", { name: bg.reportForm.submit }).click();

  await expect(page.getByText(bg.reportForm.fixErrors)).toBeVisible();
  await expect(page.getByText(bg.reports.districtInvalid)).toBeVisible();
  await expect(page.getByText(bg.reports.scriptInvalid)).toBeVisible();
  const district = page.getByLabel(bg.reportForm.district);
  await expect(district).toHaveAttribute("aria-invalid", "true");
  await expect(district).toBeFocused();

  // A date in the future, then one older than 90 days.
  await fillGoodReport(page);
  const today = todayInBulgaria(new Date());
  const date = page.getByLabel(bg.reportForm.date);
  await date.fill(addDays(today, 1));
  await page.getByRole("button", { name: bg.reportForm.submit }).click();
  await expect(page.getByText(bg.reports.dateInFuture)).toBeVisible();
  await expect(date).toBeFocused();
  await date.fill(addDays(today, -91));
  await page.getByRole("button", { name: bg.reportForm.submit }).click();
  await expect(page.getByText(bg.reports.dateTooOld)).toBeVisible();

  // A number that is not Bulgarian.
  await date.fill(today);
  await page.getByLabel(bg.reportForm.callerNumber).fill("12");
  await page.getByRole("button", { name: bg.reportForm.submit }).click();
  await expect(page.getByText(bg.reports.callerNumberInvalid)).toBeVisible();
  expect(sent).toHaveLength(0);
});

test("shows the server's field error under that field", async ({ page }) => {
  await fakeApi(page, 400, {
    error: {
      code: "validation",
      messageBg: bg.reports.dateInFuture,
      fields: ["occurredOn"],
    },
  });
  await page.goto("/signal");
  await fillGoodReport(page);
  await page.getByRole("button", { name: bg.reportForm.submit }).click();
  await expect(page.getByText(bg.reports.dateInFuture)).toBeVisible();
  await expect(page.getByLabel(bg.reportForm.date)).toHaveAttribute("aria-invalid", "true");
});

test("the honeypot is off the screen and never reached with Tab", async ({ page }) => {
  await page.goto("/signal");
  const trap = page.locator("#report-website");
  await expect(trap).toBeAttached();
  await expect(trap).toHaveAttribute("tabindex", "-1");
  await expect(trap).toHaveAttribute("autocomplete", "off");
  await expect(page.locator(".report-trap")).toHaveAttribute("aria-hidden", "true");
  // Not display:none, but outside the visible page.
  expect(await trap.evaluate((input) => getComputedStyle(input).display)).not.toBe("none");
  const box = await trap.boundingBox();
  expect(box === null || box.x + box.width <= 0).toBe(true);
  // From the caller's number, Tab goes straight to the submit button.
  await page.getByLabel(bg.reportForm.callerNumber).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: bg.reportForm.submit })).toBeFocused();
});

test("sends the report and thanks the person", async ({ page }) => {
  const sent = await fakeApi(page, 201, { ok: true });
  await page.goto("/signal");
  await fillGoodReport(page);
  await page.getByLabel(bg.reportForm.callerNumber).fill("0888 123 456");
  await page.getByRole("button", { name: bg.reportForm.submit }).click();

  const thanks = page.getByRole("heading", { name: bg.reportForm.successTitle });
  await expect(thanks).toBeVisible();
  await expect(thanks).toBeFocused();
  await expect(page.getByText(bg.reportForm.successText)).toBeVisible();
  expect(sent).toEqual([
    {
      districtCode: "BG-02",
      scriptType: "police",
      occurredOn: todayInBulgaria(new Date()),
      description: "Казаха, че са от полицията.",
      callerNumber: "0888 123 456",
      website: "",
    },
  ]);
  await expect(
    page.locator("main").getByRole("link", { name: bg.reportForm.successEducation }),
  ).toHaveAttribute("href", "/kak-raboti");

  // „Подай още един сигнал“ opens an empty form again.
  await page.getByRole("button", { name: bg.reportForm.another }).click();
  await expect(page.getByLabel(bg.reportForm.district)).toHaveValue("");
});

test("too many reports: shows the 429 message", async ({ page }) => {
  await fakeApi(page, 429, { error: { code: "rate_limited", messageBg: bg.errors.rateLimited } });
  await page.goto("/signal");
  await fillGoodReport(page);
  await page.getByRole("button", { name: bg.reportForm.submit }).click();
  const alert = page.locator("main").getByRole("alert");
  await expect(alert).toHaveText(bg.reportForm.rateLimited);
  await expect(alert).toBeFocused();
});

test("home page and footer link to the form", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: bg.reportForm.homeLink, exact: true }),
  ).toHaveAttribute("href", "/signal");
  const footerLink = page.getByRole("contentinfo").getByRole("link", {
    name: bg.reportForm.footerLink,
  });
  await footerLink.click();
  await expect(page).toHaveURL(/\/signal$/);
});

test("no sideways scrolling at 360 px, and big tap targets", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeApi(page, 201, { ok: true });
  await page.goto("/signal");
  expect(await noSidewaysScroll(page)).toBe(true);
  for (const name of Object.values(bg.reportForm.scriptOptions)) {
    const choice = page.locator("fieldset label", { hasText: name });
    expect((await choice.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
  }
  const submit = page.getByRole("button", { name: bg.reportForm.submit });
  expect((await submit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
  await fillGoodReport(page);
  await submit.click();
  await expect(page.getByRole("heading", { name: bg.reportForm.successTitle })).toBeVisible();
  expect(await noSidewaysScroll(page)).toBe(true);
});
