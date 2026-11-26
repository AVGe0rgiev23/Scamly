// End-to-end tests for the „Провери истинския“ screens (P-06), WITHOUT a real database.
//
// Like protected.spec.ts and alerts.spec.ts: the preview pages /dev/protected (the
// older person's phone), /dev/family/proveri (the family member's answer screen) and
// /dev/family/alerts show the real components, and page.route() answers their API
// calls. Realtime answers 503, so the pages poll every 5 s; a test changes the fake
// question's status and waits for the next poll. The 45 s countdown is moved on
// with Playwright's fake clock (page.clock), so the suite does not wait 45 s.

import { expect, test, type Page } from "@playwright/test";
import { analyseCall } from "@/engine";
import { bg } from "@/i18n/bg";
import type { IdentityCheckDto, IdentityPersonDto } from "@/schemas/identityChecks";

const CHECK_ID = "e1000000-0000-4000-8000-0000000000c1";
const PERSON_ID = "a1000000-0000-4000-8000-000000000001";
const IVAN_ID = "b1000000-0000-4000-8000-000000000001";
const MARIA_ID = "b1000000-0000-4000-8000-000000000003";

const PEOPLE: IdentityPersonDto[] = [
  {
    userId: IVAN_ID,
    displayName: "Иван",
    initials: "И",
    phone: "+359 888 123 456",
    priority: 1,
    canReceive: true,
  },
  {
    userId: null,
    displayName: "Петър",
    initials: "П",
    phone: "+359 877 000 222",
    priority: 2,
    canReceive: false,
  },
  {
    userId: MARIA_ID,
    displayName: "Мария",
    initials: "М",
    phone: "+359 899 333 444",
    priority: 3,
    canReceive: true,
  },
];

// One question as the API sends it. Its id is made from the person's id.
function question(userId: string, status: IdentityCheckDto["status"]): IdentityCheckDto {
  const person = PEOPLE.find((item) => item.userId === userId);
  return {
    id: `c${userId.slice(1)}`,
    protectedPersonId: PERSON_ID,
    personName: "Мама",
    claimedUserId: userId,
    claimedName: person?.displayName ?? null,
    claimedPhone: person?.phone ?? null,
    status,
    createdAt: new Date().toISOString(),
    answeredAt: status === "pending" ? null : new Date().toISOString(),
    answerableUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
    secondsToAnswer: status === "pending" ? null : 12,
  };
}

// What the fake API received, and the status each question has now.
type PhoneApi = {
  asked: string[]; // claimedUserId of every POST /api/identity-checks
  status: Map<string, IdentityCheckDto["status"]>; // userId -> status
  postFailures: number; // how many POSTs still answer 429
};

async function mockPhone(page: Page, postFailures = 0): Promise<PhoneApi> {
  const api: PhoneApi = { asked: [], status: new Map(), postFailures };
  // The 30-second check (as in protected.spec.ts, with the real engine).
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => route.fulfill({ status: 201, json: { checkId: CHECK_ID } }),
  );
  await page.route(
    (url) => url.pathname === `/api/checks/${CHECK_ID}/answers`,
    (route) => {
      const verdict = analyseCall(
        route.request().postDataJSON() as Parameters<typeof analyseCall>[0],
      );
      return route.fulfill({
        json: {
          checkId: CHECK_ID,
          verdict: {
            level: verdict.level,
            score: verdict.score,
            scriptType: verdict.scriptType,
            hardRules: verdict.hardRules,
            reasons: verdict.reasons,
            headlineBg: verdict.headlineBg,
            adviceBg: verdict.adviceBg,
          },
          callContact: { displayName: "Иван", phone: "+359 888 123 456" },
        },
      });
    },
  );
  await page.route(
    (url) => url.pathname === `/api/checks/${CHECK_ID}`,
    (route) => route.fulfill({ status: 404, json: {} }),
  );
  await page.route(
    (url) => url.pathname === "/api/realtime/token",
    (route) => route.fulfill({ status: 503, json: {} }),
  );
  // „Провери истинския“.
  await page.route(
    (url) => url.pathname === "/api/identity-checks/family",
    (route) => route.fulfill({ json: { people: PEOPLE } }),
  );
  await page.route(
    (url) => url.pathname === "/api/identity-checks",
    (route) => {
      if (api.postFailures > 0) {
        api.postFailures--;
        return route.fulfill({
          status: 429,
          json: { error: { code: "rate_limited", messageBg: "Твърде много опити." } },
        });
      }
      const { claimedUserId } = route.request().postDataJSON() as { claimedUserId: string };
      api.asked.push(claimedUserId);
      api.status.set(claimedUserId, "pending");
      return route.fulfill({
        status: 201,
        json: { identityCheck: question(claimedUserId, "pending") },
      });
    },
  );
  await page.route(
    (url) => /^\/api\/identity-checks\/c[^/]+$/.test(url.pathname),
    (route) => {
      const id = new URL(route.request().url()).pathname.split("/").pop() ?? "";
      const userId = `b${id.slice(1)}`;
      return route.fulfill({
        json: { identityCheck: question(userId, api.status.get(userId) ?? "expired") },
      });
    },
  );
  return api;
}

function heading(page: Page, text: string) {
  return page.getByRole("heading", { level: 1, name: text });
}

async function tap(page: Page, label: string) {
  await page.getByRole("radio", { name: label, exact: true }).click();
}

// Big button → „Да“ → the family tiles → „Иван“; the check goes on meanwhile.
async function askIvan(page: Page) {
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await expect(heading(page, bg.identityAsk.question)).toBeFocused();
  await tap(page, bg.protectedCheck.tri.yes);
  await expect(heading(page, bg.identityAsk.tilesTitle)).toBeVisible();
  await page.getByRole("button", { name: "Иван", exact: true }).click();
  await expect(page.getByText("Питаме Иван…")).toBeVisible();
  // The first question is already answered („Роднина“): the check goes on with Q2.
  await expect(heading(page, bg.protectedCheck.questions.asksMoney)).toBeVisible();
  await expect(page.getByText("Въпрос 2 от 4")).toBeVisible();
}

test("tiles in calling order; a contact without Scamly can be called on the saved number", async ({
  page,
}) => {
  await mockPhone(page);
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await tap(page, bg.protectedCheck.tri.yes);
  const tiles = page.locator(".check-ask-tiles > li");
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0)).toContainText("Иван");
  await expect(tiles.nth(1)).toContainText("Петър");
  await expect(tiles.nth(1)).toContainText(bg.identityAsk.noApp);
  await expect(page.getByRole("button", { name: "Петър", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Обади се на Петър" })).toHaveAttribute(
    "href",
    "tel:+359877000222",
  );
  // „Никой от тях“: the check only, with „Роднина“ already chosen.
  await page.getByRole("button", { name: bg.identityAsk.noneOfThem }).click();
  await expect(heading(page, bg.protectedCheck.questions.asksMoney)).toBeVisible();
  await expect(page.locator(".check-ask-wait")).toHaveCount(0);
});

test("„Не съм аз“ → red screen, call-back to the saved number, then 112", async ({ page }) => {
  const api = await mockPhone(page);
  await askIvan(page);
  expect(api.asked).toEqual([IVAN_ID]);

  // Ivan answers on his phone; the next poll (≤ 5 s) turns the screen red.
  api.status.set(IVAN_ID, "not_me");
  await expect(heading(page, "Това НЕ е Иван.")).toBeFocused({ timeout: 8_000 });
  await expect(page.getByText(bg.protectedCheck.hangUp)).toBeVisible();
  await expect(page.getByText(bg.protectedCheck.hangUpPhrase)).toBeVisible();
  await expect(page.getByText("Иван ви звъни сега.")).toBeVisible();
  // Only the number saved in the family (claimedPhone), never anything else.
  await expect(page.getByRole("link", { name: "Обади се на Иван" })).toHaveAttribute(
    "href",
    "tel:+359888123456",
  );
  // The questions are gone: this is the answer.
  await expect(heading(page, bg.protectedCheck.questions.asksMoney)).toHaveCount(0);

  // #44: somebody is coming for the money → the big 112 button.
  await expect(page.getByRole("link", { name: bg.identityAsk.call112 })).toHaveCount(0);
  await tap(page, bg.protectedCheck.tri.yes);
  const call112 = page.getByRole("link", { name: bg.identityAsk.call112 });
  await expect(call112).toHaveAttribute("href", "tel:112");
  expect((await call112.boundingBox())?.height).toBeGreaterThanOrEqual(72);
  await tap(page, bg.protectedCheck.tri.no);
  await expect(page.getByText(bg.identityAsk.notComing)).toBeVisible();

  // „Към началото“: the big button again.
  await page.getByRole("button", { name: bg.identityAsk.toStart }).click();
  await expect(page.getByRole("button", { name: bg.protectedCheck.bigButton })).toBeVisible();
});

test("„Аз съм“ → calm screen with the hard rules, never „безопасно“; back to the check", async ({
  page,
}) => {
  const api = await mockPhone(page);
  await page.goto("/dev/protected");
  // With the keyboard this time: Space chooses „Да“, „Напред“, Enter on the tile.
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await page.getByRole("radio", { name: bg.protectedCheck.tri.yes, exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: bg.protectedCheck.next }).click();
  await page.getByRole("button", { name: "Иван", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Питаме Иван…")).toBeVisible();

  api.status.set(IVAN_ID, "its_me");
  await expect(heading(page, "Иван потвърди: „Аз съм.“")).toBeFocused({ timeout: 8_000 });
  for (const rule of bg.identityAsk.rules) {
    await expect(page.getByText(rule)).toBeVisible();
  }
  expect((await page.locator("main").innerText()).toLowerCase()).not.toContain("безопас");

  await page.getByRole("button", { name: bg.identityAsk.backToCheck }).click();
  await expect(heading(page, bg.protectedCheck.questions.asksMoney)).toBeVisible();
  await expect(page.locator(".check-ask-wait")).toHaveCount(0);
});

test("no answer in 45 s → the next person; a late answer to the old question is ignored", async ({
  page,
}) => {
  await page.clock.install();
  const api = await mockPhone(page);
  await askIvan(page);

  await page.clock.fastForward(46_000);
  await expect.poll(() => api.asked).toEqual([IVAN_ID, MARIA_ID]); // Petar has no Scamly
  await expect(page.getByText("Иван не отговори.")).toBeVisible();
  await expect(page.getByText("Питаме Мария…")).toBeVisible();
  await expect(page.getByText("Попитайте нещо, което знае само Иван.")).toBeVisible();

  // Ivan answers too late: his question has expired, the phone does not listen any more.
  api.status.set(IVAN_ID, "not_me");
  await page.clock.fastForward(6_000);
  await page.clock.fastForward(6_000);
  await expect(heading(page, "Това НЕ е Иван.")).toHaveCount(0);
  await expect(page.getByText("Питаме Мария…")).toBeVisible();
});

test("nobody left → the check she answered gives the verdict", async ({ page }) => {
  await page.clock.install();
  const api = await mockPhone(page);
  await askIvan(page);
  await page.clock.fastForward(46_000);
  await expect(page.getByText("Питаме Мария…")).toBeVisible();
  await page.clock.fastForward(46_000);
  await expect(page.getByText(bg.identityAsk.nobody)).toBeVisible();
  await expect(page.getByText("Попитайте нещо, което знае само Иван.")).toBeVisible();
  expect(api.asked).toEqual([IVAN_ID, MARIA_ID]);

  // A relative wants money for a courier, in a hurry and secretly: red.
  await tap(page, bg.protectedCheck.tri.yes);
  await tap(page, bg.protectedCheck.handoverMethods.courier_or_stranger);
  await tap(page, bg.protectedCheck.tri.yes);
  await tap(page, bg.protectedCheck.tri.yes);
  await page.getByRole("button", { name: bg.protectedCheck.skip }).click();
  await expect(heading(page, bg.verdict.red.title)).toBeVisible();
  await expect(page.getByText(bg.identityAsk.nobody)).toBeVisible();
});

test("a failed request (429) says so in Bulgarian and can be sent again", async ({ page }) => {
  const api = await mockPhone(page, 1);
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await tap(page, bg.protectedCheck.tri.yes);
  await page.getByRole("button", { name: "Иван", exact: true }).click();
  await expect(page.getByText("Не успяхме да попитаме Иван.")).toBeVisible();
  await expect(page.getByText("Твърде много опити.")).toBeVisible();
  // The check goes on anyway.
  await expect(heading(page, bg.protectedCheck.questions.asksMoney)).toBeVisible();
  await page.getByRole("button", { name: bg.identityAsk.retry }).click();
  await expect(page.getByText("Питаме Иван…")).toBeVisible();
  expect(api.asked).toEqual([IVAN_ID]);
});

test("360 px: no sideways scrolling and every target at least 64 px; reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const api = await mockPhone(page);
  async function checkScreen() {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const target of await page.locator("main button, main a, main fieldset label").all()) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(64);
    }
  }
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await checkScreen();
  await tap(page, bg.protectedCheck.tri.yes);
  await expect(page.locator(".check-ask-tiles > li")).toHaveCount(3);
  await checkScreen();
  await page.getByRole("button", { name: "Иван", exact: true }).click();
  await expect(page.getByText("Питаме Иван…")).toBeVisible();
  await checkScreen();
  api.status.set(IVAN_ID, "not_me");
  await expect(heading(page, "Това НЕ е Иван.")).toBeVisible({ timeout: 8_000 });
  await tap(page, bg.protectedCheck.tri.yes);
  await checkScreen();
  expect(
    await page
      .locator(".check-flood")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

// ---------------------------------------------------------------------------------
// The family member's answer screen /family/proveri?id=…
// ---------------------------------------------------------------------------------

async function mockFamily(page: Page, patch: "ok" | "409" = "ok") {
  const sent: unknown[] = [];
  const state = { status: "pending" as IdentityCheckDto["status"] };
  await page.route(
    (url) => url.pathname === "/api/realtime/token",
    (route) => route.fulfill({ status: 401, json: {} }),
  );
  await page.route(
    (url) => /^\/api\/identity-checks\/c[^/]+$/.test(url.pathname),
    (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as { answer: "not_me" | "its_me" };
        sent.push(body);
        if (patch === "409") {
          return route.fulfill({
            status: 409,
            json: {
              error: {
                code: "already_answered",
                messageBg: bg.identityChecks.alreadyAnswered,
              },
            },
          });
        }
        state.status = body.answer;
      }
      return route.fulfill({ json: { identityCheck: question(IVAN_ID, state.status) } });
    },
  );
  return sent;
}

const IVAN_QUESTION = question(IVAN_ID, "pending").id;

test("family: „Не съм аз — обаждам ти се сега!“ saves not_me and says to call now", async ({
  page,
}) => {
  const sent = await mockFamily(page);
  await page.goto(`/dev/family/proveri?id=${IVAN_QUESTION}`);
  await expect(heading(page, bg.identityAnswer.title)).toBeVisible();
  await expect(page.getByText("Някой се представя за теб пред Мама и иска пари.")).toBeVisible();
  await expect(page.getByText(/Можете да отговорите още 1[45]:\d\d мин\./)).toBeVisible();
  const notMe = page.getByRole("button", { name: bg.identityAnswer.notMe });
  expect((await notMe.boundingBox())?.height).toBeGreaterThanOrEqual(64);
  await notMe.click();
  await expect(page.getByText(/Отговорихте „Не съм аз“/)).toBeVisible();
  await expect(page.getByText("Обадете се веднага на Мама на номера, който знаете.")).toBeVisible();
  await expect(page.getByRole("button", { name: bg.identityAnswer.itsMe })).toHaveCount(0);
  expect(sent).toEqual([{ answer: "not_me" }]);
});

test("family: „Аз съм“ and a 409 „Вече е отговорено.“", async ({ page }) => {
  const sent = await mockFamily(page);
  await page.goto(`/dev/family/proveri?id=${IVAN_QUESTION}`);
  await page.getByRole("button", { name: bg.identityAnswer.itsMe, exact: true }).click();
  await expect(page.getByText(/Отговорихте „Аз съм“/)).toBeVisible();
  expect(sent).toEqual([{ answer: "its_me" }]);

  await page.unrouteAll();
  await mockFamily(page, "409");
  await page.goto(`/dev/family/proveri?id=${IVAN_QUESTION}`);
  await page.getByRole("button", { name: bg.identityAnswer.notMe }).click();
  await expect(page.getByText(bg.identityAnswer.already)).toBeVisible();
  await expect(page.getByRole("button", { name: bg.identityAnswer.notMe })).toHaveCount(0);

  // No ?id= at all: a clear note instead of an empty page.
  await page.goto("/dev/family/proveri");
  await expect(page.getByText(bg.identityAnswer.missing)).toBeVisible();
});

test("family alerts: my open question on top, and the family's warning", async ({ page }) => {
  const pending = question(IVAN_ID, "pending");
  const warning = { ...question(MARIA_ID, "not_me") };
  await page.route(
    (url) => url.pathname === "/api/realtime/token",
    (route) => route.fulfill({ status: 401, json: {} }),
  );
  await page.route(
    (url) => url.pathname === "/api/persons",
    (route) =>
      route.fulfill({
        json: {
          persons: [
            {
              id: PERSON_ID,
              displayName: "Мама",
              districtCode: "BG-16",
              createdAt: "2026-11-01T09:00:00Z",
              isOwner: true,
            },
          ],
        },
      }),
  );
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => route.fulfill({ json: { checks: [], nextCursor: null } }),
  );
  await page.route(
    (url) => url.pathname === "/api/identity-checks",
    (route) => route.fulfill({ json: { pending: [pending], warnings: [warning] } }),
  );
  await page.goto("/dev/family/alerts");
  await expect(page.getByText("Някой се представя за теб пред Мама.")).toBeVisible();
  await expect(page.getByRole("link", { name: bg.identityAnswer.open })).toHaveAttribute(
    "href",
    `/family/proveri?id=${pending.id}`,
  );
  await expect(
    page.getByText("Някой се представя за Мария. Ако ви звънне, затворете."),
  ).toBeVisible();
});
