// End-to-end tests for the family's live alert page (W2-03) and its „Обаждам ѝ се
// сега“ button (W2-04), WITHOUT a real database: like family.spec.ts, the preview page
// /dev/family/alerts shows the real component and page.route() answers its API calls.
// GET /api/realtime/token answers 401 here, so the page polls every 5 seconds: the
// "new check" test changes the fake API answer and waits for the next poll.

import { expect, test, type Page, type Request } from "@playwright/test";
import { bg } from "@/i18n/bg";

const ELENA = "a1000000-0000-4000-8000-000000000001";
const GEORGI = "a1000000-0000-4000-8000-000000000002";

const PERSONS = [
  {
    id: ELENA,
    displayName: "Баба Елена",
    districtCode: "BG-16",
    createdAt: "2026-11-01T09:00:00Z",
    isOwner: true,
  },
  {
    id: GEORGI,
    displayName: "Дядо Георги",
    districtCode: "BG-22",
    createdAt: "2026-11-01T09:00:00Z",
    isOwner: false,
  },
];

type Level = "red" | "yellow" | "green" | null;

function check(id: string, personId: string, level: Level, startedAt: string, ackBy?: string) {
  return {
    id,
    protectedPersonId: personId,
    status: level === null ? "started" : "answered",
    startedAt,
    answeredAt: level === null ? null : startedAt,
    answers: {
      claimedIdentity: level === "red" ? "police" : null,
      asksMoney: level === "red" ? "yes" : null,
      handover: null,
      rushing: null,
      secrecy: null,
      textRedacted: null,
    },
    verdict:
      level === null
        ? null
        : {
            level,
            score: { red: 90, yellow: 40, green: 5 }[level],
            scriptType: "police",
            hardRules: [],
            reasons: [],
            headlineBg: bg.verdict[level].title,
            adviceBg: bg.verdict[level].description,
          },
    acknowledgement:
      ackBy === undefined
        ? null
        : { at: startedAt, displayName: ackBy, messageBg: `${ackBy} ще ви се обади веднага.` },
  };
}

const RED = check("e1000000-0000-4000-8000-000000000001", ELENA, "red", "2026-11-05T09:30:00Z");
const GREEN = check(
  "e1000000-0000-4000-8000-000000000002",
  GEORGI,
  "green",
  "2026-11-04T15:00:00Z",
  "Иван",
);
const OLD = check("e1000000-0000-4000-8000-000000000003", ELENA, "yellow", "2026-10-01T08:00:00Z");
const NEW = check("e1000000-0000-4000-8000-000000000009", GEORGI, null, "2026-11-05T10:00:00Z");

// The fake API. `checks` can be changed by a test while the page is open.
async function mockApi(page: Page, checks: ReturnType<typeof check>[], persons = PERSONS) {
  const state = { checks };
  await page.route(
    (url) => url.pathname === "/api/realtime/token",
    (route) => route.fulfill({ status: 401, json: { error: { code: "unauthorized" } } }),
  );
  await page.route(
    (url) => url.pathname === "/api/persons",
    (route) => route.fulfill({ json: { persons } }),
  );
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => {
      const personId = new URL(route.request().url()).searchParams.get("personId");
      const mine = state.checks.filter((item) => item.protectedPersonId === personId);
      return route.fulfill({ json: { checks: mine, nextCursor: null } });
    },
  );
  await page.route(
    (url) => /^\/api\/checks\/[^/]+$/.test(url.pathname),
    (route) => {
      const id = new URL(route.request().url()).pathname.split("/").pop();
      const found = [...state.checks, OLD].find((item) => item.id === id);
      return found
        ? route.fulfill({ json: { check: found } })
        : route.fulfill({
            status: 404,
            json: { error: { code: "not_found", messageBg: "Няма такъв запис." } },
          });
    },
  );
  return state;
}

// Answers POST /api/checks/:id/acknowledge: first responder, or „Иван“ was first.
async function mockAcknowledge(page: Page, first: boolean, sent: Request[]) {
  await page.route(
    (url) => url.pathname.endsWith("/acknowledge"),
    (route) => {
      sent.push(route.request());
      const checkId = new URL(route.request().url()).pathname.split("/")[3];
      return route.fulfill({
        json: {
          checkId,
          first,
          acknowledgement: {
            at: "2026-11-05T09:31:00Z",
            displayName: first ? "Мария" : "Иван",
            messageBg: "",
          },
        },
      });
    },
  );
}

const items = (page: Page) => page.locator(".check-list > li");

test("the list shows everybody's checks newest first, with name, time, badge and status", async ({
  page,
}) => {
  await mockApi(page, [GREEN, RED]);
  await page.goto("/dev/family/alerts");
  await expect(page.getByRole("heading", { level: 1, name: bg.alerts.title })).toBeVisible();
  await expect(items(page)).toHaveCount(2);

  const first = items(page).nth(0);
  await expect(first.getByRole("heading", { level: 2 })).toHaveText("Баба Елена");
  await expect(first).toContainText("5 ноември 2026 г., 11:30 ч."); // Europe/Sofia
  await expect(first.locator(".verdict-badge")).toHaveText(`!${bg.verdictBadge.red}`);
  await expect(first).toContainText(bg.alerts.statusAnswered);
  await expect(first).toContainText("Кой се обажда: полицай");
  await expect(first.getByRole("button", { name: /^Обаждам ѝ се сега: Баба Елена/ })).toBeVisible();

  const second = items(page).nth(1);
  await expect(second.getByRole("heading", { level: 2 })).toHaveText("Дядо Георги");
  await expect(second.locator(".verdict-badge")).toHaveText(`✓${bg.verdictBadge.green}`);
  await expect(second).toContainText("Иван потвърди, че се обажда");
  await expect(second.getByRole("button", { name: /Обаждам/ })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("безопас"); // D9

  // Realtime is not available (token 401): the page says it polls every 5 seconds.
  await expect(page.getByText(bg.alerts.liveLost)).toBeVisible();
});

test("a new check appears without reloading, highlighted and announced", async ({ page }) => {
  const api = await mockApi(page, [RED]);
  await page.goto("/dev/family/alerts");
  await expect(items(page)).toHaveCount(1);
  await expect(page.locator(".alert-new")).toHaveCount(0); // the first load is not news

  api.checks = [RED, NEW]; // grandpa presses the big button
  await expect(items(page)).toHaveCount(2, { timeout: 8_000 }); // the next 5-second poll
  const added = items(page).nth(0);
  await expect(added).toHaveClass(/alert-new/);
  await expect(added).toContainText(bg.alerts.newBadge);
  await expect(added).toContainText("Дядо Георги");
  await expect(added.locator(".verdict-badge")).toHaveText(`…${bg.verdictBadge.pending}`);
  await expect(added).toContainText(bg.alerts.statusStarted);
  await expect(page.locator(".alerts > [role=status]")).toHaveText(
    "Нов сигнал: Дядо Георги проверява съмнително обаждане.",
  );
});

test("„Обаждам ѝ се сега“: the first responder takes the call", async ({ page }) => {
  await mockApi(page, [RED]);
  const sent: Request[] = [];
  await mockAcknowledge(page, true, sent);
  await page.goto("/dev/family/alerts");
  await items(page)
    .nth(0)
    .getByRole("button", { name: /^Обаждам ѝ се сега/ })
    .click();
  await expect(items(page).nth(0)).toContainText(bg.alerts.youResponded);
  await expect(
    items(page)
      .nth(0)
      .getByRole("button", { name: /Обаждам/ }),
  ).toHaveCount(0);
  expect(sent.map((request) => request.method())).toEqual(["POST"]);
  expect(new URL(sent[0]?.url() ?? "").pathname).toBe(`/api/checks/${RED.id}/acknowledge`);
});

test("„Обаждам ѝ се сега“: somebody else was first", async ({ page }) => {
  await mockApi(page, [RED]);
  await mockAcknowledge(page, false, []);
  await page.goto("/dev/family/alerts");
  await items(page)
    .nth(0)
    .getByRole("button", { name: /^Обаждам ѝ се сега/ })
    .click();
  await expect(items(page).nth(0)).toContainText("Иван вече се обажда.");
});

test("?check= focuses the alert from the notification, also an older one", async ({ page }) => {
  await mockApi(page, [GREEN, RED]);
  await page.goto(`/dev/family/alerts?check=${GREEN.id}`);
  const focused = page.locator(`#alert-${GREEN.id}`);
  await expect(focused).toBeFocused();
  await expect(focused).toHaveClass(/alert-focused/);
  await expect(focused).toContainText(bg.alerts.focusedBadge);

  // Not among the newest checks: loaded on its own (GET /api/checks/:id) and shown.
  await page.goto(`/dev/family/alerts?check=${OLD.id}`);
  await expect(page.locator(`#alert-${OLD.id}`)).toBeFocused();
  await expect(items(page)).toHaveCount(3);

  // An id we may not see: a Bulgarian note, the rest of the list stays.
  await page.goto("/dev/family/alerts?check=e1000000-0000-4000-8000-0000000000ff");
  await expect(page.getByText(bg.alerts.focusNotFound)).toBeVisible();
  await expect(items(page)).toHaveCount(2);
});

test("works with the keyboard alone", async ({ page }) => {
  await mockApi(page, [RED]);
  const sent: Request[] = [];
  await mockAcknowledge(page, true, sent);
  await page.goto("/dev/family/alerts");
  const button = page.getByRole("button", { name: /^Обаждам ѝ се сега/ });
  await expect(button).toBeVisible();
  // Tab until the big button has the focus, then press Enter.
  for (let step = 0; step < 30; step += 1) {
    if (await button.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(bg.alerts.youResponded)).toBeVisible();
  expect(sent).toHaveLength(1);

  // The sound switch is a toggle button (aria-pressed).
  const sound = page.getByRole("button", { name: bg.alerts.soundOn });
  await sound.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: bg.alerts.soundOff })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("empty, no people and error states are in Bulgarian", async ({ page }) => {
  await mockApi(page, []);
  await page.goto("/dev/family/alerts");
  await expect(page.getByText(bg.alerts.empty)).toBeVisible();

  await page.unrouteAll();
  await mockApi(page, [], []);
  await page.goto("/dev/family/alerts");
  await expect(page.getByText(bg.alerts.noPersons)).toBeVisible();

  // Without the mocks the preview has no login: the API's Bulgarian 401 and „Опитай отново“.
  await page.unrouteAll();
  await page.goto("/dev/family/alerts");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: bg.family.retry })).toBeVisible();
});

test("no sideways scrolling at 360 px, and big tap targets", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockApi(page, [GREEN, RED]);
  await page.goto(`/dev/family/alerts?check=${RED.id}`);
  await expect(items(page)).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const button of await page.getByRole("main").getByRole("button").all()) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  }
});
