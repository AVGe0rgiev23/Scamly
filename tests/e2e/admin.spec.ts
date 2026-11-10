// End-to-end tests for the admin panel (W3-06): users and roles, statistics charts and
// the audit log, WITHOUT a real database.
//
// How: the real /admin page sits behind the server-side role guard, so the tests open
// the SAME component on the preview page /dev/admin (src/app/dev/admin), which loads
// its data from /api/admin/* in the browser; page.route() answers those calls.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

const SELF = {
  id: "a0000000-0000-4000-8000-000000000001",
  displayName: "Анна Админ",
  role: "admin",
  email: "admin@demo.scamly.invalid",
  createdAt: "2026-11-01T10:00:00Z",
  isSelf: true,
};
const MARIA = {
  id: "f0000000-0000-4000-8000-000000000002",
  displayName: "Мария Петрова",
  role: "family",
  email: "maria@example.com",
  createdAt: "2026-11-02T10:00:00Z",
  isSelf: false,
};
const IVAN = {
  id: "b0000000-0000-4000-8000-000000000003",
  displayName: "Иван Иванов",
  role: "moderator",
  email: null,
  createdAt: "2026-11-03T10:00:00Z",
  isSelf: false,
};

// Seven days of statistics with some numbers in them.
const STATS = {
  days: 7,
  from: "2026-11-03",
  to: "2026-11-09",
  checksPerDay: [
    { date: "2026-11-03", red: 1, yellow: 0, green: 2, unfinished: 0 },
    { date: "2026-11-04", red: 0, yellow: 0, green: 0, unfinished: 0 },
    { date: "2026-11-05", red: 2, yellow: 1, green: 0, unfinished: 1 },
    { date: "2026-11-06", red: 0, yellow: 0, green: 1, unfinished: 0 },
    { date: "2026-11-07", red: 3, yellow: 2, green: 0, unfinished: 0 },
    { date: "2026-11-08", red: 0, yellow: 0, green: 0, unfinished: 0 },
    { date: "2026-11-09", red: 1, yellow: 0, green: 1, unfinished: 0 },
  ],
  checksByLevel: { red: 7, yellow: 3, green: 4, unfinished: 1 },
  checksByScript: [
    { scriptType: "police", count: 5 },
    { scriptType: "relative_in_trouble", count: 4 },
    { scriptType: "fake_official", count: 2 },
    { scriptType: "courier", count: 1 },
    { scriptType: "unknown", count: 2 },
  ],
  reportsByDistrict: [
    { districtCode: "BG-22", total: 6, approved: 4, pending: 1, rejected: 1 },
    { districtCode: "BG-16", total: 2, approved: 2, pending: 0, rejected: 0 },
  ],
  reportsByStatus: { approved: 6, pending: 1, rejected: 1 },
  totals: { checks: 15, reports: 8 },
  partial: false,
};

function auditEntry(id: number) {
  return {
    id,
    createdAt: "2026-11-09T10:00:00Z",
    actorName: "Анна Админ",
    action: id % 2 === 0 ? "role_changed" : "device_paired",
    targetType: id % 2 === 0 ? "profile" : "device",
    summary: id % 2 === 0 ? "Семейство → Модератор" : "",
  };
}

// True when the page is not wider than the screen (no sideways scrolling).
async function fitsScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

async function serveUsers(page: Page, users: unknown[], nextCursor: string | null = null) {
  await page.route(
    (url) => url.pathname === "/api/admin/users",
    (route) => route.fulfill({ json: { users, nextCursor } }),
  );
}

test("users: list with e-mails, own row locked, role change after a confirmation", async ({
  page,
}) => {
  await serveUsers(page, [SELF, MARIA, IVAN]);
  const patches: unknown[] = [];
  await page.route(`**/api/admin/users/${MARIA.id}/role`, async (route) => {
    patches.push(route.request().postDataJSON());
    await route.fulfill({ json: { user: { ...MARIA, role: "moderator" } } });
  });
  await page.goto("/dev/admin");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.admin.hubTitle);
  await expect(page.getByRole("tab", { name: bg.admin.tabUsers })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const rows = page.getByRole("list", { name: bg.admin.usersTitle }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("maria@example.com");
  await expect(rows.nth(2)).toContainText(bg.admin.noEmail);

  // The admin's own row: the select is disabled and says why.
  const own = page.getByLabel(`Роля на ${SELF.displayName}`);
  await expect(own).toBeDisabled();
  await expect(rows.nth(0)).toContainText(bg.admin.selfNote);

  // Choosing a role opens the confirmation; „Отказ“ changes nothing.
  const maria = page.getByLabel(`Роля на ${MARIA.displayName}`);
  await maria.selectOption("moderator");
  const dialog = page.getByRole("dialog", { name: bg.admin.confirmTitle });
  await expect(dialog).toContainText("Мария Петрова ще стане „Модератор“ (досега: „Семейство“)");
  await dialog.getByRole("button", { name: bg.admin.cancel }).click();
  await expect(dialog).toBeHidden();
  await expect(maria).toHaveValue("family");
  expect(patches).toEqual([]);

  // Confirm: exactly { role: "moderator" } is sent, and the row shows the new role.
  await maria.selectOption("moderator");
  await dialog.getByRole("button", { name: bg.admin.confirmButton }).click();
  await expect(dialog).toBeHidden();
  await expect(maria).toHaveValue("moderator");
  await expect(page.getByRole("status").filter({ hasText: "Ролята на Мария Петрова" })).toHaveText(
    "Ролята на Мария Петрова вече е „Модератор“.",
  );
  expect(patches).toEqual([{ role: "moderator" }]);
});

test("users: the API's Bulgarian error stays in the window; search sends q and role", async ({
  page,
}) => {
  const queries: string[] = [];
  await page.route(
    (url) => url.pathname === "/api/admin/users",
    (route) => {
      queries.push(new URL(route.request().url()).search);
      return route.fulfill({ json: { users: [MARIA], nextCursor: null } });
    },
  );
  await page.route(`**/api/admin/users/${MARIA.id}/role`, (route) =>
    route.fulfill({
      status: 409,
      json: { error: { code: "role_changed_meanwhile", messageBg: bg.admin.roleChangedMeanwhile } },
    }),
  );
  await page.goto("/dev/admin");
  await page.getByLabel(`Роля на ${MARIA.displayName}`).selectOption("admin");
  const dialog = page.getByRole("dialog", { name: bg.admin.confirmTitle });
  await dialog.getByRole("button", { name: bg.admin.confirmButton }).click();
  await expect(dialog.getByRole("alert")).toHaveText(bg.admin.roleChangedMeanwhile);
  await dialog.getByRole("button", { name: bg.admin.cancel }).click();
  await expect(page.getByLabel(`Роля на ${MARIA.displayName}`)).toHaveValue("family");

  await page.getByLabel(bg.admin.searchLabel).fill("мария");
  await page.getByLabel(bg.admin.roleFilterLabel, { exact: true }).selectOption("family");
  await page.getByRole("button", { name: bg.admin.search }).click();
  await expect.poll(() => queries.at(-1)).toBe("?q=%D0%BC%D0%B0%D1%80%D0%B8%D1%8F&role=family");
});

test("users: a 403 from the API is shown in Bulgarian", async ({ page }) => {
  await page.route(
    (url) => url.pathname === "/api/admin/users",
    (route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: "forbidden", messageBg: bg.errors.forbidden } },
      }),
  );
  await page.goto("/dev/admin");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.errors.forbidden);
});

test("statistics: four charts with legends and accessible tables, period selector", async ({
  page,
}) => {
  await serveUsers(page, [SELF]);
  const asked: string[] = [];
  await page.route(
    (url) => url.pathname === "/api/admin/stats",
    (route) => {
      const days = new URL(route.request().url()).searchParams.get("days") ?? "";
      asked.push(days);
      return route.fulfill({ json: { ...STATS, days: Number(days) } });
    },
  );
  await page.goto("/dev/admin");
  await page.getByRole("tab", { name: bg.admin.tabStats }).click();

  await expect(page.getByRole("heading", { level: 3 })).toHaveText([
    bg.admin.checksPerDayTitle,
    bg.admin.checksByLevelTitle,
    bg.admin.checksByScriptTitle,
    bg.admin.reportsByDistrictTitle,
  ]);
  expect(asked).toEqual(["30"]);
  await expect(page.getByRole("button", { name: "30 дни" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Проверки: 15")).toBeVisible();

  // The legend: symbol + word for every level (never colour alone).
  const perDay = page.getByRole("figure").filter({ hasText: bg.admin.checksPerDayTitle });
  const legend = perDay.getByRole("listitem");
  await expect(legend).toHaveCount(4);
  for (const [index, level] of (["red", "yellow", "green", "unfinished"] as const).entries()) {
    await expect(legend.nth(index)).toContainText(bg.admin.levelNames[level]);
  }
  // 7 columns, one per day.
  await expect(perDay.locator(".admin-day")).toHaveCount(7);

  // The numbers as a real table, opened with „Покажи числата“.
  await perDay.getByText(bg.admin.showNumbers).click();
  const table = perDay.getByRole("table", { name: bg.admin.checksPerDayTitle });
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(table.getByRole("row").nth(5)).toHaveText(/7 ноември 2026 г\.\s*3\s*2\s*0\s*0\s*5/);

  const districts = page.getByRole("figure").filter({ hasText: bg.admin.reportsByDistrictTitle });
  await districts.getByText(bg.admin.showNumbers).click();
  await expect(
    districts.getByRole("table", { name: bg.admin.reportsByDistrictTitle }).getByRole("row").nth(1),
  ).toHaveText(/София \(столица\)\s*4\s*1\s*1\s*6/);

  await page.getByRole("button", { name: "7 дни" }).click();
  await expect(page.getByRole("button", { name: "7 дни" })).toHaveAttribute("aria-pressed", "true");
  expect(asked).toEqual(["30", "7"]);
});

test("statistics: an empty period says so instead of empty charts", async ({ page }) => {
  await serveUsers(page, [SELF]);
  await page.route(
    (url) => url.pathname === "/api/admin/stats",
    (route) =>
      route.fulfill({
        json: {
          ...STATS,
          checksPerDay: STATS.checksPerDay.map((day) => ({
            ...day,
            red: 0,
            yellow: 0,
            green: 0,
            unfinished: 0,
          })),
          checksByLevel: { red: 0, yellow: 0, green: 0, unfinished: 0 },
          checksByScript: STATS.checksByScript.map((row) => ({ ...row, count: 0 })),
          reportsByDistrict: [],
          reportsByStatus: { approved: 0, pending: 0, rejected: 0 },
          totals: { checks: 0, reports: 0 },
        },
      }),
  );
  await page.goto("/dev/admin");
  await page.getByRole("tab", { name: bg.admin.tabStats }).click();
  await expect(page.getByText(bg.admin.noData)).toHaveCount(4);
});

test("audit log: 50 lines, „Покажи още“ asks for the next page", async ({ page }) => {
  await serveUsers(page, [SELF]);
  const cursors: (string | null)[] = [];
  await page.route(
    (url) => url.pathname === "/api/admin/audit-log",
    (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      cursors.push(cursor);
      if (cursor === null) {
        const entries = Array.from({ length: 50 }, (_, i) => auditEntry(100 - i));
        return route.fulfill({ json: { entries, nextCursor: "51" } });
      }
      const entries = Array.from({ length: 3 }, (_, i) => auditEntry(50 - i));
      return route.fulfill({ json: { entries, nextCursor: null } });
    },
  );
  await page.goto("/dev/admin");
  // Keyboard: → twice from the users tab opens the audit log.
  await page.getByRole("tab", { name: bg.admin.tabUsers }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: bg.admin.tabAudit })).toBeFocused();

  const lines = page.getByRole("list", { name: bg.admin.auditTitle }).getByRole("listitem");
  await expect(lines).toHaveCount(50);
  await expect(lines.first()).toContainText(bg.admin.actions.role_changed);
  await expect(lines.first()).toContainText("От: Анна Админ");
  await expect(lines.first()).toContainText("Обект: Профил");
  await expect(lines.first()).toContainText("Семейство → Модератор");
  await expect(lines.nth(1)).toContainText(bg.admin.actions.device_paired);

  await page.getByRole("button", { name: bg.admin.showMore }).click();
  await expect(lines).toHaveCount(53);
  await expect(page.getByRole("button", { name: bg.admin.showMore })).toHaveCount(0);
  expect(cursors).toEqual([null, "51"]);
});

test("every tab fits a 360 px screen without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await serveUsers(page, [
    SELF,
    {
      ...MARIA,
      displayName: "Мария-Магдалена Петрова-Константинова",
      email: "mariya.magdalena.petrova.konstantinova@example.com",
    },
  ]);
  await page.route(
    (url) => url.pathname === "/api/admin/stats",
    (route) => {
      const days = Number(new URL(route.request().url()).searchParams.get("days"));
      const checksPerDay = Array.from({ length: days }, (_, i) => ({
        date: `2026-${String(8 + Math.floor(i / 31)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
        red: i % 3,
        yellow: i % 2,
        green: 1,
        unfinished: 0,
      }));
      return route.fulfill({ json: { ...STATS, days, checksPerDay } });
    },
  );
  await page.route(
    (url) => url.pathname === "/api/admin/audit-log",
    (route) =>
      route.fulfill({ json: { entries: [auditEntry(2), auditEntry(1)], nextCursor: null } }),
  );
  await page.goto("/dev/admin");
  await expect(page.getByRole("list", { name: bg.admin.usersTitle })).toBeVisible();
  expect(await fitsScreen(page)).toBe(true);

  await page.getByRole("tab", { name: bg.admin.tabStats }).click();
  await page.getByRole("button", { name: "90 дни" }).click();
  const perDay = page.getByRole("figure").filter({ hasText: bg.admin.checksPerDayTitle });
  await expect(perDay.locator(".admin-day")).toHaveCount(90);
  await perDay.getByText(bg.admin.showNumbers).click();
  expect(await fitsScreen(page)).toBe(true);

  await page.getByRole("tab", { name: bg.admin.tabAudit }).click();
  await expect(page.getByRole("list", { name: bg.admin.auditTitle })).toBeVisible();
  expect(await fitsScreen(page)).toBe(true);
});
