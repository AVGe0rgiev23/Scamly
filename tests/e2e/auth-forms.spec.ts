// Exercise designed forms against controlled API responses, without real accounts.
import { expect, test, type Page } from "@playwright/test";
import { bg } from "@/i18n/bg";

async function fillLogin(page: Page) {
  await page.getByLabel(bg.auth.emailLabel, { exact: true }).fill("family@example.invalid");
  await page.getByLabel(bg.auth.passwordLabel, { exact: true }).fill("Demo-password-123");
}

test("login reports Bulgarian validation before sending a request", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/login", async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto("/vhod");
  await page.getByRole("button", { name: bg.auth.loginButton, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(bg.auth.emailInvalid);
  expect(requests).toBe(0);
});

test("login prevents duplicate requests and shows the API error", async ({ page }) => {
  let requests = 0;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/login", async (route) => {
    requests++;
    await pending;
    await route.fulfill({
      status: 401,
      json: { error: { code: "invalid_credentials", messageBg: bg.auth.invalidCredentials } },
    });
  });
  await page.goto("/vhod");
  await fillLogin(page);
  await page.getByRole("button", { name: bg.auth.loginButton, exact: true }).click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await page.locator("form").dispatchEvent("submit");
  release();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.auth.invalidCredentials);
  await expect(page.getByRole("button", { name: bg.auth.loginButton, exact: true })).toBeEnabled();
  expect(requests).toBe(1);
});

for (const role of ["family", "moderator", "admin"] as const) {
  test(`login navigates to the ${role} area after success`, async ({ page }) => {
    await page.route(`**/${role}`, (route) =>
      route.fulfill({ contentType: "text/html", body: "<html lang='bg'><body></body></html>" }),
    );
    await page.route("**/api/auth/login", (route) => route.fulfill({ json: { role } }));
    await page.goto("/vhod");
    await fillLogin(page);
    await page.getByRole("button", { name: bg.auth.loginButton, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${role}$`));
  });
}

test("registration shows confirmation and validates a short password", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/register", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      displayName: "Демо потребител",
      email: "family@example.invalid",
      password: "Demo-password-123",
    });
    await route.fulfill({ status: 201, json: { role: "family", needsEmailConfirmation: true } });
  });
  await page.goto("/registratsia");
  await page.getByLabel(bg.auth.displayNameLabel, { exact: true }).fill("Демо потребител");
  await page.getByLabel(bg.auth.emailLabel, { exact: true }).fill("family@example.invalid");
  await page.getByLabel(bg.auth.passwordLabel, { exact: true }).fill("short");
  await page.getByRole("button", { name: bg.auth.registerButton, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.auth.passwordTooShort);
  expect(requests).toBe(0);
  await page.getByLabel(bg.auth.passwordLabel, { exact: true }).fill("Demo-password-123");
  await page.getByRole("button", { name: bg.auth.registerButton, exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(bg.auth.checkEmail);
  expect(requests).toBe(1);
});

test("pairing keeps leading zeros from a QR link and waits for submission", async ({ page }) => {
  let requests = 0;
  await page.route("**/protected", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html lang='bg'><body></body></html>" }),
  );
  await page.route("**/api/pairing/redeem", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ code: "001234" });
    await route.fulfill({ json: { role: "protected", deviceId: "demo-device" } });
  });
  await page.goto("/svarzhi?kod=001234");
  await expect(page.getByLabel(bg.pairing.codeLabel, { exact: true })).toHaveValue("001234");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: bg.pairing.button, exact: true }).click();
  await expect(page).toHaveURL(/\/protected$/);
  expect(requests).toBe(1);
});

test("pairing validates malformed codes and displays invalid and rate-limit errors", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/pairing/redeem", async (route) => {
    requests++;
    await route.fulfill({
      status: requests === 1 ? 400 : 429,
      json: {
        error: {
          code: requests === 1 ? "invalid_code" : "rate_limited",
          messageBg: requests === 1 ? bg.pairing.invalidCode : bg.errors.rateLimited,
        },
      },
    });
  });
  await page.goto("/svarzhi?kod=invalid");
  const code = page.getByLabel(bg.pairing.codeLabel, { exact: true });
  const submit = page.getByRole("button", { name: bg.pairing.button, exact: true });
  await expect(code).toHaveValue("");
  await code.fill("123");
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.pairing.codeFormat);
  expect(requests).toBe(0);
  await code.fill("123456");
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.pairing.invalidCode);
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(bg.errors.rateLimited);
});

test("forms and forbidden page fit a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/vhod", "/registratsia", "/svarzhi", "/403"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const button of await page.getByRole("button").all())
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(64);
  }
});
