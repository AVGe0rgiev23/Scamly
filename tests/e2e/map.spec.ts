// End-to-end tests for the public scam map /karta (W3-03), WITHOUT a real database.
// The page loads GET /api/map/stats in the browser, so page.route() answers it with
// fake numbers and we test the real page (the district shapes are the real file).

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";
import { DISTRICT_CODES, type MapStatsDto } from "@/schemas/reports";

const API = "**/api/map/stats**";

function fakeStats(weeks: number, withWave: boolean): MapStatsDto {
  return {
    weeks,
    districts: DISTRICT_CODES.map((code, index) => {
      const total = code === "BG-02" ? 14 : index % 4;
      return {
        districtCode: code,
        total,
        byScript: {
          police: code === "BG-02" ? 9 : total,
          relative_in_trouble: code === "BG-02" ? 5 : 0,
          fake_official: 0,
          courier: 0,
          unknown: 0,
        },
        waves:
          withWave && code === "BG-02"
            ? [{ scriptType: "police", lastSevenDays: 7, weeklyAverage: 1.5 }]
            : [],
      };
    }),
  };
}

// Answers the stats request; returns the addresses that were asked for.
async function fakeApi(page: Page, withWave = true): Promise<string[]> {
  const asked: string[] = [];
  await page.route(API, async (route) => {
    const url = new URL(route.request().url());
    asked.push(url.search);
    const weeks = Number(url.searchParams.get("weeks") ?? 4);
    await route.fulfill({ json: fakeStats(weeks, withWave) });
  });
  return asked;
}

async function openMap(page: Page) {
  await page.goto("/karta");
  await expect(page.locator('.map-canvas[data-ready="true"]')).toBeVisible();
}

test("draws all 28 districts with a legend, a table and the data credit", async ({ page }) => {
  await fakeApi(page);
  await openMap(page);

  await expect(page.getByRole("heading", { level: 1, name: bg.map.title })).toBeVisible();
  const districts = page.locator("path.map-district");
  await expect(districts).toHaveCount(28);
  for (const code of DISTRICT_CODES) {
    await expect(page.locator(`path[data-code="${code}"]`)).toHaveCount(1);
  }
  // Coloured by level: Burgas (14) is in the top level; every district has a label.
  await expect(page.locator('path[data-code="BG-02"]')).toHaveClass(/map-level-4/);
  await expect(page.locator('path[data-code="BG-02"]')).toHaveAttribute(
    "aria-label",
    "Бургас: 14 сигнала",
  );

  const legend = page.locator(".map-legend");
  await expect(legend.getByText(bg.map.legendTitle)).toBeVisible();
  await expect(legend.locator("li")).toHaveCount(5);
  await expect(legend).toContainText("над 10");

  const table = page.getByRole("table", { name: bg.map.tableCaption });
  await expect(table.locator("tbody tr")).toHaveCount(28);
  await expect(table.getByRole("row", { name: /Бургас/ })).toContainText("14");

  await expect(page.getByText(bg.map.attribution)).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText(bg.map.mapAttribution);
});

test("shows the scam-wave text, or „Няма вълни…“ when there is none", async ({ page }) => {
  await fakeApi(page, true);
  await openMap(page);
  await expect(
    page.getByText("Тази седмица в област Бургас: 7 сигнала за схемата „Полицай“"),
  ).toBeVisible();

  await page.unrouteAll();
  await fakeApi(page, false);
  await page.reload();
  await expect(page.getByText(bg.map.noWaves)).toBeVisible();
});

test("switching the period asks for the new numbers", async ({ page }) => {
  const asked = await fakeApi(page);
  await openMap(page);
  await expect(page.getByRole("button", { name: bg.map.periods[4] })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: bg.map.periods[12] }).click();
  await expect(page.getByRole("button", { name: bg.map.periods[12] })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(() => asked).toContain("?weeks=12");
  expect(asked[0]).toBe("?weeks=4");
});

test("a district's panel opens from the keyboard, on the map and in the table", async ({
  page,
}) => {
  await fakeApi(page);
  await openMap(page);

  const burgas = page.locator('path[data-code="BG-02"]');
  await burgas.focus();
  await expect(page.locator(".map-tooltip")).toContainText("Бургас: 14 сигнала");
  await page.keyboard.press("Enter");

  const panel = page.locator(".map-panel");
  await expect(panel.getByRole("heading", { name: "Област Бургас" })).toBeVisible();
  await expect(panel).toContainText("Одобрени сигнали за периода: 14");
  await expect(panel).toContainText("Полицай: 9 сигнала");
  await expect(panel).toContainText("Роднина в беда: 5 сигнала");
  await expect(burgas).toHaveAttribute("aria-pressed", "true");

  // The table's district buttons do the same (also for tiny districts like Sofia city).
  await page.getByRole("button", { name: "Покажи подробности за област Варна" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("heading", { name: "Област Варна" })).toBeVisible();
});

test("an API error shows a Bulgarian message and „Опитай отново“", async ({ page }) => {
  let fail = true;
  await page.route(API, async (route) => {
    if (fail) {
      await route.fulfill({ status: 500, json: { error: { code: "internal", messageBg: "x" } } });
      return;
    }
    await route.fulfill({ json: fakeStats(4, false) });
  });
  await page.goto("/karta");
  await expect(page.getByRole("alert").filter({ hasText: bg.map.loadError })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: bg.map.retry }).click();
  await expect(page.locator("path.map-district")).toHaveCount(28);
});

test("linked from the home page and the footer", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: bg.map.homeLink })).toHaveAttribute("href", "/karta");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: bg.map.footerLink }),
  ).toHaveAttribute("href", "/karta");
});

test("no sideways scrolling at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeApi(page);
  await openMap(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
