// End-to-end tests for the older person's call check (W2-01), WITHOUT a real database.
//
// How: like the family dashboard (family.spec.ts), the call check talks only to our
// API from the browser, so page.route() answers those calls with fake data. The real
// /protected page sits behind the server-side role guard (ProtectedGate), which needs
// a paired phone, so the tests open the same component on the preview page
// /dev/protected. The fake server runs the REAL engine (analyseCall), so the verdicts
// are the ones the server would compute.

import { expect, test, type Page, type Route } from "@playwright/test";
import { analyseCall } from "@/engine";
import { bg } from "@/i18n/bg";

const CHECK_ID = "e1000000-0000-4000-8000-0000000000c1";
const IVAN = { displayName: "Иван", phone: "+359 888 123 456" };

type Answers = Parameters<typeof analyseCall>[0];

// What the fake API received.
type Calls = { starts: number; answers: Answers[]; reads: number };

// The server's answer to PUT /api/checks/:id/answers, computed with the real engine.
function serverResult(answers: Answers) {
  const verdict = analyseCall(answers);
  return {
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
    callContact: IVAN,
  };
}

// GET /api/checks/:id: no answer from the family on the first read, then Ivan's.
function checkDto(acknowledged: boolean) {
  return {
    id: CHECK_ID,
    protectedPersonId: "a1000000-0000-4000-8000-000000000001",
    status: "answered",
    startedAt: "2026-11-05T10:00:00Z",
    answeredAt: "2026-11-05T10:00:30Z",
    answers: {
      claimedIdentity: "police",
      asksMoney: "yes",
      handover: null,
      rushing: null,
      secrecy: null,
      textRedacted: null,
    },
    verdict: null,
    acknowledgement: acknowledged
      ? {
          at: "2026-11-05T10:01:00Z",
          displayName: "Иван",
          messageBg: "Иван ще ви се обади веднага.",
        }
      : null,
  };
}

type MockOptions = {
  // How PUT /api/checks/:id/answers behaves: answer, fail (no network) or answer late.
  answers?: "ok" | "fail" | "slow";
  start?: "ok" | "fail";
  escalationExhausted?: boolean;
};

async function mockApi(page: Page, options: MockOptions = {}): Promise<Calls> {
  const calls: Calls = { starts: 0, answers: [], reads: 0 };
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => {
      calls.starts++;
      if (options.start === "fail") {
        return route.abort("internetdisconnected");
      }
      return route.fulfill({ status: 201, json: { checkId: CHECK_ID } });
    },
  );
  await page.route(
    (url) => url.pathname === `/api/checks/${CHECK_ID}/answers`,
    async (route: Route) => {
      const body = route.request().postDataJSON() as Answers;
      calls.answers.push(body);
      if (options.answers === "fail") {
        return route.abort("internetdisconnected");
      }
      if (options.answers === "slow" && calls.answers.length === 1) {
        await new Promise((resolve) => setTimeout(resolve, 6_000));
      }
      return route.fulfill({ json: serverResult(body) });
    },
  );
  await page.route(
    (url) => url.pathname === `/api/checks/${CHECK_ID}`,
    (route) => {
      calls.reads++;
      const acknowledged = calls.reads >= 2;
      return route.fulfill({
        json: {
          check: {
            ...checkDto(acknowledged),
            suggestEmergencyCall: options.escalationExhausted && !acknowledged,
          },
        },
      });
    },
  );
  // No Realtime in the tests: the helper falls back to polling every 5 s.
  await page.route(
    (url) => url.pathname === "/api/realtime/token",
    (route) => route.fulfill({ status: 503, json: {} }),
  );
  return calls;
}

function noSideScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test("emergency advice after escalation disappears when a family member answers", async ({
  page,
}) => {
  await mockApi(page, { escalationExhausted: true });
  await page.goto("/dev/protected");
  await answerPoliceMoney(page);
  await page.getByRole("button", { name: bg.protectedCheck.check, exact: true }).click();

  const advice = page.getByText(bg.protectedCheck.emergencyCallAdvice);
  await expect(advice).toBeVisible();
  await expect(page.getByText("Иван ще ви се обади веднага.")).toBeVisible({ timeout: 15_000 });
  await expect(advice).toHaveCount(0);
});

function question(page: Page, text: string) {
  return page.getByRole("heading", { level: 1, name: text });
}

// Taps one answer (a radio with a picture and words).
async function tap(page: Page, label: string) {
  await page.getByRole("radio", { name: label, exact: true }).click();
}

// Police + money, handed to a courier, rushing, secrecy unknown.
async function answerPoliceMoney(page: Page) {
  await page.getByRole("button", { name: bg.protectedCheck.bigButton }).click();
  await expect(question(page, bg.protectedCheck.questions.claimedIdentity)).toBeFocused();
  await expect(page.getByText("Въпрос 1 от 4")).toBeVisible();
  await tap(page, bg.protectedCheck.identities.police);
  await expect(question(page, bg.protectedCheck.questions.asksMoney)).toBeVisible();
  await tap(page, bg.protectedCheck.tri.yes);
  // Q3 appears only after „Да“, and the count becomes 5.
  await expect(question(page, bg.protectedCheck.questions.handover)).toBeVisible();
  await expect(page.getByText("Въпрос 3 от 5")).toBeVisible();
  await tap(page, bg.protectedCheck.handoverMethods.courier_or_stranger);
  await tap(page, bg.protectedCheck.tri.yes);
  await expect(page.getByText("Въпрос 5 от 5")).toBeVisible();
  await tap(page, bg.protectedCheck.tri.unsure);
  await expect(page.getByLabel(bg.protectedCheck.textLabel)).toBeFocused();
}

test("big button → questions (Q3 only after „Да“) → text → red verdict with HR1", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/dev/protected");
  await answerPoliceMoney(page);
  expect(calls.starts).toBe(1); // the family was alerted when the button was pressed

  const field = page.getByLabel(bg.protectedCheck.textLabel);
  await field.fill("Казаха, че са от полицията.");
  await expect(page.getByText("27 от 2000 знака")).toBeVisible();
  await expect(field).toHaveAttribute("maxlength", "2000");
  await page.getByRole("button", { name: bg.protectedCheck.check, exact: true }).click();

  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeFocused();
  await expect(page.getByText(bg.protectedCheck.praise)).toBeVisible();
  await expect(page.getByText(bg.protectedCheck.hangUp)).toBeVisible();
  await expect(page.getByText(bg.engine.hardRules.HR1_POLICE_ASKS_MONEY.explanation)).toBeVisible();
  expect(await page.locator(".verdict-reasons li").count()).toBeLessThanOrEqual(4);
  await expect(page.getByText(bg.protectedCheck.localNote)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Обади се на Иван" })).toHaveAttribute(
    "href",
    "tel:+359888123456",
  );
  expect(calls.answers).toEqual([
    {
      claimedIdentity: "police",
      asksMoney: "yes",
      handover: "courier_or_stranger",
      rushing: "yes",
      secrecy: "unsure",
      text: "Казаха, че са от полицията.",
    },
  ]);

  // „Нова проверка“ goes home, where „Обади се на Иван“ is now remembered.
  await page.getByRole("button", { name: bg.protectedCheck.newCheck }).click();
  await expect(page.getByRole("button", { name: bg.protectedCheck.bigButton })).toBeVisible();
  await expect(page.getByRole("link", { name: "Обади се на Иван" })).toBeVisible();
});

test("green uses the exact D9 wording, never „безопасно“; keys choose, „Напред“ goes on", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/dev/protected");
  await page.getByRole("button", { name: bg.protectedCheck.afterCall }).click();

  // Keyboard: the arrow keys only choose; „Напред“ goes to the next question.
  const next = page.getByRole("button", { name: bg.protectedCheck.next });
  await expect(next).toBeDisabled();
  await page.getByRole("radio", { name: bg.protectedCheck.identities.police }).focus();
  await page.keyboard.press("Space");
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press("ArrowDown"); // police → … → other
  }
  await expect(page.getByRole("radio", { name: bg.protectedCheck.identities.other })).toBeChecked();
  await expect(question(page, bg.protectedCheck.questions.claimedIdentity)).toBeVisible();
  await next.click();

  await tap(page, bg.protectedCheck.tri.no);
  // No money: Q3 is skipped.
  await expect(question(page, bg.protectedCheck.questions.rushing)).toBeVisible();
  await expect(page.getByText("Въпрос 3 от 4")).toBeVisible();
  // „Назад“ keeps the earlier answer.
  await page.getByRole("button", { name: bg.protectedCheck.back }).click();
  await expect(
    page.getByRole("radio", { name: bg.protectedCheck.tri.no, exact: true }),
  ).toBeChecked();
  await next.click();
  await tap(page, bg.protectedCheck.tri.no);
  await tap(page, bg.protectedCheck.tri.no);
  await page.getByRole("button", { name: bg.protectedCheck.skip }).click();

  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.green.title })).toBeVisible();
  await expect(page.getByText(bg.verdict.green.description)).toBeVisible();
  // Exactly the D9 sentence of the brief.
  expect(`${bg.verdict.green.title} ${bg.verdict.green.description}`).toBe(
    "Няма типични признаци на измама. Ако се съмнявате, затворете и се обадете сами на близкия си на номера, който знаете.",
  );
  expect((await page.locator("main").innerText()).toLowerCase()).not.toContain("безопас");
  await expect(page.getByText(bg.protectedCheck.praise)).toHaveCount(0);
  expect(calls.answers[0]).toMatchObject({ claimedIdentity: "other", handover: null, text: "" });
});

test("offline: the phone shows its own red verdict at once, with the note", async ({ page }) => {
  const calls = await mockApi(page, { start: "fail", answers: "fail" });
  await page.goto("/dev/protected");
  await answerPoliceMoney(page);
  const started = Date.now();
  await page.getByRole("button", { name: bg.protectedCheck.skip }).click();

  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(4_000); // a failed request: no 4 s wait
  await expect(page.getByText(bg.protectedCheck.localNote)).toBeVisible();
  await expect(page.getByText(bg.protectedCheck.hangUp)).toBeVisible();
  await expect(page.getByText(bg.engine.hardRules.HR1_POLICE_ASKS_MONEY.explanation)).toBeVisible();
  // In the background it tries again: a new check first (the button's POST had failed).
  await expect.poll(() => calls.starts, { timeout: 8_000 }).toBeGreaterThanOrEqual(2);
});

test("slow server: local verdict after 4 s, then the server's verdict replaces it", async ({
  page,
}) => {
  await mockApi(page, { answers: "slow" });
  await page.goto("/dev/protected");
  await answerPoliceMoney(page);
  await page.getByRole("button", { name: bg.protectedCheck.skip }).click();

  await expect(page.getByText(bg.protectedCheck.checking)).toBeVisible();
  // Within 5 s of pressing: the phone's own verdict and the note.
  await expect(page.getByText(bg.protectedCheck.localNote)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeVisible();
  // The late server answer arrives: the note goes, Ivan's call button comes.
  await expect(page.getByText(bg.protectedCheck.localNote)).toHaveCount(0, { timeout: 8_000 });
  await expect(page.getByRole("link", { name: "Обади се на Иван" })).toBeVisible();
});

test("the family's answer appears big: „Иван ще ви се обади веднага.“", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/dev/protected");
  await answerPoliceMoney(page);
  await page.getByRole("button", { name: bg.protectedCheck.skip }).click();
  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeVisible();

  // First read: nobody yet. The next poll (5 s later) has Ivan's answer.
  const message = page.getByRole("status").filter({ hasText: "Иван ще ви се обади веднага." });
  await expect(message).toBeVisible({ timeout: 12_000 });
  expect(calls.reads).toBeGreaterThanOrEqual(2);
});

test("big targets, big text and no sideways scrolling at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript((contact) => {
    window.localStorage.setItem("scamly-call-contact", JSON.stringify(contact));
  }, IVAN);
  await mockApi(page);
  await page.goto("/dev/protected");

  const big = page.getByRole("button", { name: bg.protectedCheck.bigButton });
  const box = await big.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(740 * 0.3);
  expect(box?.width).toBeGreaterThanOrEqual(320);
  const fontSize = await big.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(28);
  await expect(page.getByRole("link", { name: "Обади се на Иван" })).toBeVisible();

  // Every tap target of every screen: at least 64 px high.
  async function checkScreen() {
    expect(await noSideScroll(page)).toBe(true);
    for (const target of await page.locator("main .button, main label.choice").all()) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(64);
    }
  }
  await checkScreen();
  await big.click();
  const baseSize = await page
    .locator("main.call-check")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(baseSize).toBeGreaterThanOrEqual(22);
  await checkScreen();
  await tap(page, bg.protectedCheck.identities.police);
  await tap(page, bg.protectedCheck.tri.yes);
  await checkScreen(); // the longest answers: „На куриер/непознат“
  await tap(page, bg.protectedCheck.handoverMethods.throw);
  await tap(page, bg.protectedCheck.tri.yes);
  await tap(page, bg.protectedCheck.tri.yes);
  await checkScreen();
  await page.getByRole("button", { name: bg.protectedCheck.check, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: bg.verdict.red.title })).toBeVisible();
  await checkScreen();
});
