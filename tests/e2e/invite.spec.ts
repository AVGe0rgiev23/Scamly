// End-to-end tests for the invite page /pokana?t=… (W2-14), WITHOUT a real database.
//
// /pokana is open to everyone (the proxy doesn't guard it) and asks our API who is
// looking (GET /api/me) and then redeems the token (POST /api/invites/redeem) from
// the browser. page.route() answers those calls with fake data, so the REAL page is
// tested in a real browser. The API itself is tested in inviteService.test.ts.

import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

// Our service worker (public/sw.js) handles page loads itself; page.route() can't see
// those, so it is switched off for these tests (they are about the invite page).
test.use({ serviceWorkers: "block" });

// 43 URL-safe characters, like a real token (RedeemInviteSchema).
const TOKEN = "Abc_DEF-123456789012345678901234567890abcde";
const INVITE_URL = `/pokana?t=${TOKEN}`;
const NEXT = encodeURIComponent(INVITE_URL);
const PERSON_ID = "b1000000-0000-4000-8000-000000000001";

// Answers GET /api/me: a role, or 401 for a guest.
async function mockMe(page: Page, role: string | null) {
  await page.route("**/api/me", (route) =>
    role === null
      ? route.fulfill({
          status: 401,
          json: { error: { code: "unauthorized", messageBg: bg.errors.unauthorized } },
        })
      : route.fulfill({ json: { userId: "u1", role, displayName: "Иван" } }),
  );
}

// Counts the redeem calls and answers them with `status` and `body`.
async function mockRedeem(page: Page, status: number, body: unknown) {
  const bodies: unknown[] = [];
  await page.route("**/api/invites/redeem", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status, json: body });
  });
  return bodies;
}

test("a guest sees why, and „Вход“ / „Регистрация“ come back to the invite", async ({ page }) => {
  await mockMe(page, null);
  const redeems = await mockRedeem(page, 200, {});
  await page.goto(INVITE_URL);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(bg.invitePage.title);
  await expect(page.getByText(bg.invitePage.intro)).toBeVisible();
  await expect(page.getByText(bg.invitePage.guestText)).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: bg.invitePage.loginButton })).toHaveAttribute(
    "href",
    `/vhod?next=${NEXT}`,
  );
  await expect(main.getByRole("link", { name: bg.invitePage.registerButton })).toHaveAttribute(
    "href",
    `/registratsia?next=${NEXT}`,
  );
  // A guest's token is kept (they need it after login) and never sent.
  await expect(page).toHaveURL(new RegExp(`/pokana\\?t=${TOKEN}$`));
  expect(redeems).toHaveLength(0);
});

test("a family member: the token is POSTed once, removed from the address, success shown", async ({
  page,
}) => {
  await mockMe(page, "family");
  const redeems = await mockRedeem(page, 200, {
    protectedPersonId: PERSON_ID,
    personName: "Баба Елена",
    priority: 2,
  });
  await page.goto(INVITE_URL);

  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Вече сте близък на Баба Елена на място 2.",
  );
  expect(redeems).toEqual([{ token: TOKEN }]);
  await expect(page).toHaveURL(/\/pokana$/);
  await expect(page.getByRole("link", { name: "Към страницата на Баба Елена" })).toHaveAttribute(
    "href",
    `/family/${PERSON_ID}`,
  );
});

// Every refusal of the API shows its Bulgarian message; the token is removed too.
const ERRORS = [
  { status: 400, code: "invalid_invite", messageBg: bg.invites.invalidInvite },
  { status: 409, code: "already_linked", messageBg: bg.invites.alreadyLinked },
  { status: 409, code: "no_free_place", messageBg: bg.invites.noFreePlace },
  { status: 409, code: "own_invite", messageBg: bg.invites.ownInvite },
];
for (const error of ERRORS) {
  test(`shows the API error „${error.code}“`, async ({ page }) => {
    await mockMe(page, "family");
    await mockRedeem(page, error.status, {
      error: { code: error.code, messageBg: error.messageBg },
    });
    await page.goto(INVITE_URL);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(error.messageBg);
    await expect(page).toHaveURL(/\/pokana$/);
  });
}

test("a broken link gets the same message, without asking the API", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/**", async (route) => {
    calls++;
    await route.abort();
  });
  await page.goto("/pokana?t=too-short");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.invites.invalidInvite);
  expect(calls).toBe(0);
});

test("another role is told the invite is for a family account", async ({ page }) => {
  await mockMe(page, "moderator");
  const redeems = await mockRedeem(page, 200, {});
  await page.goto(INVITE_URL);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.invitePage.wrongRole);
  expect(redeems).toHaveLength(0);
});

test("/pokana and login with `next` send no Referer (Referrer-Policy: no-referrer)", async ({
  page,
}) => {
  await mockMe(page, null);
  const invite = await page.goto(INVITE_URL);
  expect(invite?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");

  const login = await page.goto(`/vhod?next=${NEXT}`);
  expect(login?.headers()["referrer-policy"]).toBe("no-referrer");
  const register = await page.goto(`/registratsia?next=${NEXT}`);
  expect(register?.headers()["referrer-policy"]).toBe("no-referrer");
});

async function login(page: Page) {
  await page.getByLabel(bg.auth.emailLabel, { exact: true }).fill("ivan@example.invalid");
  await page.getByLabel(bg.auth.passwordLabel, { exact: true }).fill("Demo-password-123");
  await page.getByRole("button", { name: bg.auth.loginButton, exact: true }).click();
}

test("after login, a safe `next` brings the person back to the invite", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({ json: { role: "family" } }));
  await page.route("**/pokana?t=*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html lang='bg'><body></body></html>" }),
  );
  await page.goto(`/vhod?next=${NEXT}`);
  // Switching to registration keeps the way back.
  await expect(
    page.getByRole("main").getByRole("link", { name: bg.auth.toRegister }),
  ).toHaveAttribute("href", `/registratsia?next=${NEXT}`);
  await login(page);
  await expect(page).toHaveURL(new RegExp(`/pokana\\?t=${TOKEN}$`));
});

for (const next of ["https://evil.example/", "//evil.example/", "/\\evil.example"]) {
  test(`login ignores an unsafe next „${next}“ and opens the family area`, async ({ page }) => {
    await page.route("**/api/auth/login", (route) => route.fulfill({ json: { role: "family" } }));
    await page.route("**/family", (route) =>
      route.fulfill({ contentType: "text/html", body: "<html lang='bg'><body></body></html>" }),
    );
    await page.goto(`/vhod?next=${encodeURIComponent(next)}`);
    await expect(
      page.getByRole("main").getByRole("link", { name: bg.auth.toRegister }),
    ).toHaveAttribute("href", "/registratsia");
    await login(page);
    await expect(page).toHaveURL(/localhost:\d+\/family$/);
  });
}
