// End-to-end tests for the family dashboard (W2-07), WITHOUT a real database.
//
// How: the family pages load all their data from our API in the browser (Client
// Components). Here page.route() answers those API calls with fake data, so we test
// the real UI in a real browser. The real /family pages sit behind the server-side
// role guard (FamilyGate), which needs a real login, so the tests open the same
// components on the preview pages /dev/family, /dev/family/new and
// /dev/family/person (src/app/dev/family/). That the guard itself works is tested in
// auth-guards.spec.ts.

import { expect, test, type Page, type Request } from "@playwright/test";
import { PREVIEW_PERSON_ID } from "@/components/family/preview";
import { bg } from "@/i18n/bg";

const PERSON_URL = `/api/persons/${PREVIEW_PERSON_ID}`;
const NOW = new Date("2026-11-05T10:00:00Z");

const OWNER_CONTACT = {
  id: "c1000000-0000-4000-8000-000000000001",
  displayName: "Мария Петрова",
  phone: null,
  priority: 1,
  hasAccount: true,
  isOwner: true,
};
const PHONE_CONTACT = {
  id: "c1000000-0000-4000-8000-000000000002",
  displayName: "Иван Петров",
  phone: "+359888123456",
  priority: 2,
  hasAccount: false,
  isOwner: false,
};
const DEVICE = {
  id: "d1000000-0000-4000-8000-000000000001",
  label: "Телефонът на баба",
  pairedAt: "2026-11-04T08:30:00Z",
  revoked: false,
};

function person(isOwner: boolean) {
  return {
    id: PREVIEW_PERSON_ID,
    displayName: "Баба Елена",
    districtCode: "BG-16",
    createdAt: "2026-11-01T09:00:00Z",
    isOwner,
  };
}

function check(id: string, level: "red" | "yellow" | "green" | null, startedAt: string) {
  return {
    id,
    protectedPersonId: PREVIEW_PERSON_ID,
    status: level === null ? "started" : "answered",
    startedAt,
    answeredAt: level === null ? null : startedAt,
    answers: {
      claimedIdentity: level === "red" ? "police" : null,
      asksMoney: level === "red" ? "yes" : null,
      handover: level === "red" ? "throw" : null,
      rushing: "yes",
      secrecy: null,
      textRedacted: level === "red" ? "Казаха, че са от полицията. Номер [ТЕЛЕФОН]." : null,
    },
    verdict:
      level === null
        ? null
        : {
            level,
            score: { red: 90, yellow: 40, green: 5 }[level],
            scriptType: "police",
            hardRules: [],
            reasons:
              level === "red"
                ? [{ code: "money", textBg: bg.engine.reasons.money }]
                : [{ code: "urgency", textBg: bg.engine.reasons.urgency }],
            headlineBg: bg.verdict[level].title,
            adviceBg: bg.verdict[level].description,
          },
    acknowledgement:
      level === "red"
        ? { at: startedAt, displayName: "Иван", messageBg: "Иван ще ви се обади веднага." }
        : null,
  };
}

const CHECKS_PAGE_1 = [
  check("e1000000-0000-4000-8000-000000000001", "red", "2026-11-05T09:30:00Z"),
  check("e1000000-0000-4000-8000-000000000002", "yellow", "2026-11-04T15:00:00Z"),
  check("e1000000-0000-4000-8000-000000000003", "green", "2026-11-03T12:00:00Z"),
];
const CHECKS_PAGE_2 = [check("e1000000-0000-4000-8000-000000000004", null, "2026-11-02T07:00:00Z")];

// Answers GET /api/persons/:id and GET /api/checks… with fake data for the preview id.
async function mockPerson(page: Page, isOwner: boolean, checks = CHECKS_PAGE_1) {
  await page.route(
    (url) => url.pathname === PERSON_URL,
    (route) =>
      route.fulfill({
        json: {
          person: person(isOwner),
          contacts: [OWNER_CONTACT, PHONE_CONTACT],
          devices: [DEVICE],
        },
      }),
  );
  await page.route(
    (url) => url.pathname === "/api/checks",
    (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      return route.fulfill({
        json:
          cursor === null
            ? { checks, nextCursor: checks.length > 0 ? "2026-11-03T12:00:00.000Z" : null }
            : { checks: CHECKS_PAGE_2, nextCursor: null },
      });
    },
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/checks/"),
    (route) => {
      const id = new URL(route.request().url()).pathname.split("/").pop();
      const found = [...CHECKS_PAGE_1, ...CHECKS_PAGE_2].find((item) => item.id === id);
      return route.fulfill({ json: { check: found } });
    },
  );
}

async function fitsScreen(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test("the people list shows each person, their district and the caller's role", async ({
  page,
}) => {
  await page.route("**/api/persons", (route) =>
    route.fulfill({
      json: {
        persons: [
          person(true),
          {
            ...person(false),
            id: "a1000000-0000-4000-8000-000000000002",
            displayName: "Дядо Петър",
            districtCode: "BG-22",
          },
        ],
      },
    }),
  );
  await page.goto("/dev/family");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.family.listTitle);
  const items = page.getByRole("main").getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Баба Елена");
  await expect(items.nth(0)).toContainText(`${bg.family.district}: Пловдив`);
  await expect(items.nth(0)).toContainText(bg.family.roleOwner);
  await expect(items.nth(1)).toContainText("София (столица)");
  await expect(items.nth(1)).toContainText(bg.family.roleContact);
  await expect(page.getByRole("link", { name: "Баба Елена" })).toHaveAttribute(
    "href",
    `/family/${PREVIEW_PERSON_ID}`,
  );
});

test("the people list has an empty state and a Bulgarian error with „Опитай отново“", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/persons", (route) => {
    calls++;
    if (calls === 1) {
      return route.fulfill({
        status: 401,
        json: { error: { code: "unauthorized", messageBg: bg.errors.unauthorized } },
      });
    }
    return route.fulfill({ json: { persons: [] } });
  });
  await page.goto("/dev/family");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.errors.unauthorized);
  await page.getByRole("button", { name: bg.family.retry }).click();
  await expect(page.getByRole("heading", { name: bg.family.emptyTitle })).toBeVisible();
  await expect(page.getByText(bg.family.emptyText)).toBeVisible();
  const add = page.getByRole("main").getByRole("link", { name: bg.family.addPerson });
  await expect(add).toHaveCount(2); // in the heading and in the empty state
  await expect(add.last()).toHaveAttribute("href", "/family/new");
});

test("the create form shows Bulgarian validation errors, then sends the person", async ({
  page,
}) => {
  const bodies: unknown[] = [];
  await page.route("**/api/persons", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { person: person(true) } });
  });
  await page.goto("/dev/family/new");
  const name = page.getByLabel(bg.family.nameLabel, { exact: true });
  const district = page.getByLabel(bg.family.district, { exact: true });
  const submit = page.getByRole("button", { name: bg.family.createButton, exact: true });

  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.persons.displayNameInvalid);
  await expect(name).toHaveAttribute("aria-invalid", "true");

  await name.fill("Баба Елена");
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.persons.districtInvalid);
  await expect(district).toHaveAttribute("aria-invalid", "true");
  expect(bodies).toHaveLength(0);

  await district.selectOption({ label: "Пловдив" });
  // On success the browser opens the new person's page (the real one, behind the
  // role guard, so here we only check that it is asked for).
  const opened = page.waitForRequest(
    (request) => new URL(request.url()).pathname === `/family/${PREVIEW_PERSON_ID}`,
  );
  await submit.click();
  await opened;
  expect(bodies).toEqual([{ displayName: "Баба Елена", districtCode: "BG-16" }]);
});

test("the owner reorders the contacts with ↑ and saves the whole list", async ({ page }) => {
  await mockPerson(page, true);
  let saved: unknown = null;
  await page.route(
    (url) => url.pathname === `${PERSON_URL}/contacts`,
    async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({
        json: {
          contacts: [
            { ...PHONE_CONTACT, priority: 1 },
            { ...OWNER_CONTACT, priority: 2 },
          ],
        },
      });
    },
  );
  await page.goto("/dev/family/person");
  const save = page.getByRole("button", { name: bg.family.saveContacts });
  await expect(save).toBeDisabled(); // nothing changed yet

  const up = page.getByRole("button", { name: "Премести Иван Петров нагоре" });
  await expect(page.getByRole("button", { name: "Премести Мария Петрова нагоре" })).toBeDisabled();
  await up.click();
  // Ivan is now at place 1, the focus stays on his arrows, and the move is announced.
  const rows = page.locator(".contact-list > li");
  await expect(rows.nth(0)).toContainText(bg.family.noAccount);
  await expect(rows.nth(0).getByLabel(bg.family.contactName)).toHaveValue("Иван Петров");
  await expect(page.getByRole("button", { name: "Премести Иван Петров надолу" })).toBeFocused();
  await expect(page.getByText("Иван Петров е на място 1.")).toBeAttached();
  await expect(page.getByText(bg.family.unsavedChanges)).toBeVisible();

  await save.click();
  await expect(page.getByRole("status").filter({ hasText: bg.family.contactsSaved })).toBeVisible();
  expect(saved).toEqual([
    { id: PHONE_CONTACT.id, displayName: "Иван Петров", phone: "+359888123456", priority: 1 },
    { id: OWNER_CONTACT.id, displayName: "Мария Петрова", phone: null, priority: 2 },
  ]);
});

test("a new contact needs a phone number before it is added", async ({ page }) => {
  await mockPerson(page, true);
  await page.goto("/dev/family/person");
  const form = page.locator("form.contact-add");
  await form.getByLabel(bg.family.contactName).fill("Петя");
  await form.getByRole("button", { name: bg.family.addContactButton }).click();
  await expect(form.getByRole("alert")).toHaveText(bg.contacts.phoneRequired);
  await form.getByLabel(bg.family.contactPhone).fill("0888 765 432");
  await form.getByRole("button", { name: bg.family.addContactButton }).click();
  const rows = page.locator(".contact-list > li");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText(bg.family.contactPlace.replace("{n}", "3"));
  await expect(rows.nth(2).getByLabel(bg.family.contactPhone)).toHaveValue("0888 765 432");
  await expect(page.getByRole("button", { name: bg.family.saveContacts })).toBeEnabled();
});

test("a trusted contact sees everything read-only", async ({ page }) => {
  await mockPerson(page, false);
  await page.goto("/dev/family/person");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Баба Елена");
  await expect(page.getByText(bg.family.readOnlyNote)).toBeVisible();
  await expect(page.getByRole("link", { name: "+359888123456" })).toHaveAttribute(
    "href",
    "tel:+359888123456",
  );
  for (const name of [bg.family.saveContacts, bg.family.pairingButton, bg.family.deleteButton]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: /^Премахни/ })).toHaveCount(0);
});

test("the pairing code is shown big, with a QR code and a 10-minute countdown", async ({
  page,
}) => {
  await page.clock.install({ time: NOW });
  await mockPerson(page, true);
  let requests = 0;
  await page.route(
    (url) => url.pathname === `${PERSON_URL}/pairing-codes`,
    (route) => {
      requests++;
      const code = requests === 1 ? "482915" : "036001";
      // The page's clock is fake (NOW, then moved on by the test): the second code is
      // made after 10:01 minutes, so it expires 10 minutes after that.
      const minutes = requests === 1 ? 10 : 20 + 1;
      const expiresAt = new Date(NOW.getTime() + minutes * 60_000);
      return route.fulfill({ status: 201, json: { code, expiresAt: expiresAt.toISOString() } });
    },
  );
  await page.goto("/dev/family/person");
  await page.getByRole("button", { name: bg.family.pairingButton, exact: true }).click();

  await expect(page.locator(".pairing-code")).toContainText("482 915");
  await expect(page.getByText("4 8 2 9 1 5")).toBeAttached(); // for screen readers
  const qr = page.getByRole("img", { name: bg.family.qrLabel });
  await expect(qr).toBeVisible();
  expect((await qr.boundingBox())?.width).toBeGreaterThanOrEqual(200);
  await expect(page.getByText(/^Остават (10:00|9:5\d) мин\.$/)).toBeVisible();

  await page.clock.fastForward("05:00");
  await expect(page.getByText(/^Остават (5:00|4:5\d) мин\.$/)).toBeVisible();
  await page.clock.fastForward("05:01");
  await expect(page.getByText(bg.family.codeExpired)).toBeVisible();
  await expect(qr).toHaveCount(0);

  await page.getByRole("button", { name: bg.family.newCode, exact: true }).click();
  await expect(page.locator(".pairing-code")).toContainText("036 001");
  expect(requests).toBe(2);
});

test("removing a phone asks first and sends DELETE only after „Да, премахни“", async ({ page }) => {
  await mockPerson(page, true);
  const deletes: Request[] = [];
  await page.route(
    (url) => url.pathname === `/api/devices/${DEVICE.id}`,
    (route) => {
      deletes.push(route.request());
      return route.fulfill({ json: { ok: true } });
    },
  );
  await page.goto("/dev/family/person");
  await expect(page.getByText(DEVICE.label)).toBeVisible();
  const remove = page.getByRole("button", { name: `Премахни ${DEVICE.label}`, exact: true });

  await remove.click();
  const dialog = page.getByRole("dialog", { name: `Да премахнем ли „${DEVICE.label}“?` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: bg.family.cancel })).toBeFocused();
  await dialog.getByRole("button", { name: bg.family.cancel }).click();
  await expect(dialog).toBeHidden();
  expect(deletes).toHaveLength(0);

  await remove.click();
  await dialog.getByRole("button", { name: bg.family.revokeConfirm }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(bg.family.deviceRemoved)).toBeVisible();
  await expect(page.getByText(bg.family.devicesEmpty)).toBeVisible();
  expect(deletes.map((request) => request.method())).toEqual(["DELETE"]);
});

test("the check history shows badges with symbol and word, more pages and details", async ({
  page,
}) => {
  await mockPerson(page, true);
  await page.goto("/dev/family/person");
  const items = page.locator(".check-list > li");
  await expect(items).toHaveCount(3);

  // Newest first, Bulgarian time (09:30 UTC = 11:30 in Sofia), symbol + word.
  await expect(items.nth(0)).toContainText("5 ноември 2026 г., 11:30 ч.");
  await expect(items.nth(0).locator(".verdict-badge")).toHaveText(`!${bg.verdictBadge.red}`);
  await expect(items.nth(1).locator(".verdict-badge")).toHaveText(`!${bg.verdictBadge.yellow}`);
  await expect(items.nth(2).locator(".verdict-badge")).toHaveText(`✓${bg.verdictBadge.green}`);
  await expect(items.nth(2)).not.toContainText("безопас"); // D9
  await expect(items.nth(0)).toContainText("Кой се обажда: полицай");
  await expect(items.nth(0)).toContainText("Иван потвърди, че се обажда");
  await expect(items.nth(1)).toContainText(bg.family.notAcknowledged);

  // „Покажи още“ asks for the next page with the cursor.
  const nextPage = page.waitForRequest((request) => request.url().includes("cursor="));
  await page.getByRole("button", { name: bg.family.showMore }).click();
  expect(new URL((await nextPage).url()).searchParams.get("cursor")).toBe(
    "2026-11-03T12:00:00.000Z",
  );
  await expect(items).toHaveCount(4);
  await expect(items.nth(3).locator(".verdict-badge")).toHaveText(`…${bg.verdictBadge.pending}`);
  await expect(page.getByRole("button", { name: bg.family.showMore })).toHaveCount(0);

  // Details of the red check: reasons and answers in Bulgarian.
  const details = items.nth(0).getByRole("button", { name: /^Подробности за проверката от/ });
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await details.click();
  await expect(items.nth(0).getByRole("button", { name: bg.family.hideDetails })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(items.nth(0)).toContainText(bg.verdict.red.title);
  await expect(items.nth(0)).toContainText(bg.engine.reasons.money);
  await expect(items.nth(0)).toContainText(bg.family.handoverMethods.throw);
  await expect(items.nth(0)).toContainText("[ТЕЛЕФОН]");
});

test("no sideways scrolling at 360 px on every family page", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.route("**/api/persons", (route) =>
    route.fulfill({ json: { persons: [person(true)] } }),
  );
  await mockPerson(page, true);
  await page.route(
    (url) => url.pathname === `${PERSON_URL}/pairing-codes`,
    (route) =>
      route.fulfill({
        status: 201,
        json: { code: "482915", expiresAt: new Date(Date.now() + 600_000).toISOString() },
      }),
  );
  for (const path of ["/dev/family", "/dev/family/new"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await fitsScreen(page)).toBe(true);
  }
  await page.goto("/dev/family/person");
  await page.getByRole("button", { name: bg.family.pairingButton, exact: true }).click();
  await expect(page.locator(".pairing-code")).toContainText("482 915");
  await page
    .locator(".check-list > li")
    .first()
    .getByRole("button", { name: /^Подробности/ })
    .click();
  await expect(page.getByText(bg.engine.reasons.money)).toBeVisible();
  expect(await fitsScreen(page)).toBe(true);
  // Large tap targets: every button on the page is at least 48 px high.
  for (const button of await page.getByRole("main").getByRole("button").all()) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  }
});
