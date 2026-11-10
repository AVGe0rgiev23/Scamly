// End-to-end checks of report moderation (W3-04).
//
// 1. The API without a database: a request from another site is refused before
//    anything else happens (CSRF, 3.12). The role checks, the compare-and-set and the
//    audit line are unit-tested with fakes (src/server/services/moderationService.test.ts)
//    and were checked live.
// 2. The moderator's queue screen (W3-04 UI) on its preview page /dev/moderator/reports
//    (the real /moderator/reports is behind the server-side role guard). page.route()
//    answers the API calls with fake reports and records every PATCH body.

import { expect, test, type Page, type Route } from "@playwright/test";
import { bg } from "@/i18n/bg";

const REPORT = "/api/moderation/reports/c0000000-0000-4000-8000-000000000001";

test("PATCH from another site is refused with 403", async ({ request }) => {
  const response = await request.patch(REPORT, {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { decision: "approve" },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.messageBg).toBe(bg.errors.badOrigin);
});

// ---------------------------------------------------------------------------------
// The queue screen
// ---------------------------------------------------------------------------------

const QUEUE = "/dev/moderator/reports";
const ID_A = "c0000000-0000-4000-8000-0000000000a1";
const ID_B = "c0000000-0000-4000-8000-0000000000b2";
const ID_C = "c0000000-0000-4000-8000-0000000000c3";

function report(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    districtCode: "BG-16",
    scriptType: "police",
    occurredOn: "2026-11-05",
    submittedAt: "2026-11-05T10:00:00Z",
    description: "Обадиха се от „полицията“ за [номер].",
    hasCallerNumber: true,
    sameNumberReports: 0,
    status: "pending",
    reviewedAt: null,
    reviewedByName: null,
    rejectReason: null,
    ...extra,
  };
}

const PENDING = [
  report(ID_A, { sameNumberReports: 3 }),
  report(ID_B, { districtCode: "BG-03", scriptType: "courier", description: null }),
];

type Fake = {
  statuses: string[]; // the `status` of every GET, in order
  cursors: (string | null)[];
  patches: { id: string; body: unknown }[];
};

// Answers GET /api/moderation/reports by status (and cursor), and every PATCH with
// `patchStatus` (200 = the decision is saved).
async function fakeQueue(
  page: Page,
  pages: Record<string, { reports: unknown[]; nextCursor: string | null }>,
  patchStatus = 200,
): Promise<Fake> {
  const fake: Fake = { statuses: [], cursors: [], patches: [] };
  await page.route("**/api/moderation/reports**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET") {
      const status = url.searchParams.get("status") ?? "";
      const cursor = url.searchParams.get("cursor");
      fake.statuses.push(status);
      fake.cursors.push(cursor);
      const key = cursor === null ? status : `${status}:${cursor}`;
      await route.fulfill({ json: pages[key] ?? { reports: [], nextCursor: null } });
      return;
    }
    const id = url.pathname.split("/").pop() ?? "";
    fake.patches.push({ id, body: request.postDataJSON() });
    if (patchStatus === 200) {
      const body = request.postDataJSON() as { decision: string; rejectReason?: string };
      await route.fulfill({
        json: {
          report: {
            id,
            status: body.decision === "approve" ? "approved" : "rejected",
            reviewedAt: "2026-11-10T10:00:00Z",
            rejectReason: body.rejectReason ?? null,
          },
        },
      });
    } else if (patchStatus === 409) {
      await route.fulfill({
        status: 409,
        json: { error: { code: "already_reviewed", messageBg: bg.moderation.alreadyReviewed } },
      });
    } else {
      await route.fulfill({
        status: patchStatus,
        json: { error: { code: "internal", messageBg: bg.errors.internal } },
      });
    }
  });
  return fake;
}

function cards(page: Page) {
  return page.getByRole("tabpanel").getByRole("listitem");
}

test("the queue shows pending reports and the tabs switch the status", async ({ page }) => {
  const fake = await fakeQueue(page, {
    pending: { reports: PENDING, nextCursor: null },
    approved: {
      reports: [
        report(ID_C, {
          status: "approved",
          reviewedAt: "2026-11-09T12:30:00Z",
          reviewedByName: "Мария Модераторова",
        }),
      ],
      nextCursor: null,
    },
    rejected: {
      reports: [
        report(ID_C, {
          status: "rejected",
          reviewedAt: "2026-11-09T12:30:00Z",
          reviewedByName: null,
          rejectReason: "Не е измама",
        }),
      ],
      nextCursor: null,
    },
  });
  await page.goto(QUEUE);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.moderator.reportsTitle);
  await expect(page.getByRole("tab", { name: bg.moderator.tabPending })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(cards(page)).toHaveCount(2);
  const first = cards(page).nth(0);
  await expect(first.getByRole("heading")).toHaveText(bg.scripts.typeNames.police);
  await expect(first).toContainText("Област Пловдив");
  await expect(first).toContainText("Обаждане на 5 ноември 2026 г.");
  // The description is plain text: the „quotes“ and [номер] are shown as they are.
  await expect(first).toContainText("Обадиха се от „полицията“ за [номер].");
  await expect(cards(page).nth(1)).toContainText(bg.moderator.reportNoDescription);
  await expect(cards(page).nth(1)).toContainText("Област Варна");

  await page.getByRole("tab", { name: bg.moderator.tabApproved }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText(
    "Одобрен от Мария Модераторова на 9 ноември 2026 г., 14:30 ч.",
  );
  await expect(cards(page).getByRole("button")).toHaveCount(0);

  // The keyboard: → moves to „Отхвърлени“ (the focus follows the selection).
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: bg.moderator.tabRejected })).toBeFocused();
  await expect(cards(page)).toContainText(`Отхвърлен от ${bg.moderator.deletedReviewer}`);
  await expect(cards(page)).toContainText("Причина: Не е измама");
  expect(fake.statuses).toEqual(["pending", "approved", "rejected"]);
});

test("the repeat-number badge shows only a count, never a number", async ({ page }) => {
  await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } });
  await page.goto(QUEUE);
  const badge = cards(page).nth(0).getByText("Още 3 сигнала от същия номер", { exact: true });
  await expect(badge).toBeVisible();
  await expect(cards(page).nth(1)).not.toContainText("същия номер");
  // No phone-like run of digits anywhere on the cards.
  const text = (await page.getByRole("tabpanel").innerText()).replace(/\s/g, "");
  expect(text).not.toMatch(/\d{5,}/);
});

test("„Покажи още“ loads the next page with the cursor", async ({ page }) => {
  const fake = await fakeQueue(page, {
    pending: { reports: PENDING, nextCursor: ID_B },
    [`pending:${ID_B}`]: { reports: [report(ID_C)], nextCursor: null },
  });
  await page.goto(QUEUE);
  await expect(cards(page)).toHaveCount(2);
  await page.getByRole("button", { name: bg.admin.showMore }).click();
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: bg.admin.showMore })).toHaveCount(0);
  expect(fake.cursors).toEqual([null, ID_B]);
});

test("„Одобри“ approves with one click, removes the card and announces it", async ({ page }) => {
  const fake = await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } });
  await page.goto(QUEUE);
  await cards(page)
    .nth(0)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.approve}`) })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: bg.moderator.approvedNotice }),
  ).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("Област Варна");
  expect(fake.patches).toEqual([{ id: ID_A, body: { decision: "approve" } }]);
});

test("„Отхвърли“ needs a reason; a quick pick fills it; the exact PATCH is sent", async ({
  page,
}) => {
  const fake = await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } });
  await page.goto(QUEUE);
  const opener = cards(page)
    .nth(1)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.reject}`) });
  await opener.click();

  const dialog = page.getByRole("dialog", { name: bg.moderator.rejectTitle });
  await expect(dialog).toBeVisible();
  const reason = dialog.getByRole("textbox", { name: bg.moderator.rejectReasonLabel });
  await expect(reason).toBeFocused();

  // Empty, then too short: a Bulgarian message, nothing is sent.
  await dialog.getByRole("button", { name: bg.moderator.rejectConfirm }).click();
  await expect(dialog.getByRole("alert")).toHaveText(bg.moderation.rejectReasonRequired);
  await reason.fill("аб");
  await dialog.getByRole("button", { name: bg.moderator.rejectConfirm }).click();
  await expect(dialog.getByRole("alert")).toHaveText(bg.moderation.rejectReasonLength);
  await expect(reason).toHaveAttribute("aria-invalid", "true");
  await expect(dialog).toContainText("2 от 200 знака");
  expect(fake.patches).toEqual([]);

  // A quick pick fills the field (and is marked as chosen).
  const quick = dialog.getByRole("button", { name: "Грешна област", exact: true });
  await quick.click();
  await expect(reason).toHaveValue("Грешна област");
  await expect(quick).toHaveAttribute("aria-pressed", "true");
  await expect(reason).toBeFocused();
  await dialog.getByRole("button", { name: bg.moderator.rejectConfirm }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: bg.moderator.rejectedNotice }),
  ).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  expect(fake.patches).toEqual([
    { id: ID_B, body: { decision: "reject", rejectReason: "Грешна област" } },
  ]);
});

test("the reject window works with the keyboard: Tab stays inside, Esc closes it", async ({
  page,
}) => {
  const fake = await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } });
  await page.goto(QUEUE);
  const opener = cards(page)
    .nth(0)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.reject}`) });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: bg.moderator.rejectTitle });
  await expect(dialog).toBeVisible();

  // Many Tabs never reach the page behind the window (the browser may pass through
  // its own address bar, which leaves the focus on <body> for one step).
  let insideSteps = 0;
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const active = document.activeElement;
      if (active === null || active === document.body) return "browser";
      return active.closest("dialog") !== null ? "dialog" : "page";
    });
    expect(where).not.toBe("page");
    if (where === "dialog") insideSteps += 1;
  }
  expect(insideSteps).toBeGreaterThanOrEqual(10);
  // Typing works, then Esc closes without sending, and the focus goes back.
  await dialog.getByRole("textbox").fill("Нещо");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  expect(fake.patches).toEqual([]);

  // Opening again starts with an empty field.
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("textbox")).toHaveValue("");
  await dialog.getByRole("button", { name: bg.moderator.cancel }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("409: another moderator decided first, the list loads again", async ({ page }) => {
  const fake = await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } }, 409);
  await page.goto(QUEUE);
  await expect(cards(page)).toHaveCount(2);
  await cards(page)
    .nth(0)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.approve}`) })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.moderator.conflictNotice);
  await expect.poll(() => fake.statuses).toEqual(["pending", "pending"]);
  await expect(cards(page)).toHaveCount(2);

  // The same for a rejection: the window closes, the message shows, the list reloads.
  await cards(page)
    .nth(1)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.reject}`) })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Спам", exact: true }).click();
  await dialog.getByRole("button", { name: bg.moderator.rejectConfirm }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.moderator.conflictNotice);
  await expect.poll(() => fake.statuses).toEqual(["pending", "pending", "pending"]);
});

test("other API errors show the API's Bulgarian message", async ({ page }) => {
  await fakeQueue(page, { pending: { reports: PENDING, nextCursor: null } }, 500);
  await page.goto(QUEUE);
  await cards(page)
    .nth(0)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.approve}`) })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.errors.internal);
  await expect(cards(page)).toHaveCount(2);
});

test("the queue and the reject window fit a 360 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeQueue(page, {
    pending: {
      reports: [
        report(ID_A, { sameNumberReports: 12, description: "Дълго ".repeat(80) }),
        report(ID_B),
      ],
      nextCursor: ID_B,
    },
  });
  await page.goto(QUEUE);
  await expect(cards(page)).toHaveCount(2);
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await fits()).toBe(true);
  await cards(page)
    .nth(0)
    .getByRole("button", { name: new RegExp(`^${bg.moderator.reject}`) })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await fits()).toBe(true);
  // Big tap targets: every button in the window is at least 44 px high.
  for (const button of await page.getByRole("dialog").getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("the hub card shows „25+“ when the first page is full", async ({ page }) => {
  const full = Array.from({ length: 25 }, (_, index) =>
    report(`c0000000-0000-4000-8000-${String(index).padStart(12, "0")}`),
  );
  await fakeQueue(page, { pending: { reports: full, nextCursor: "x" } });
  await page.goto("/dev/moderator");
  const card = page.getByRole("listitem").filter({ hasText: bg.moderator.reportsCardTitle });
  await expect(card).toContainText("Чакащи: 25+");
});
