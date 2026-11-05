// Verify persistent themes, native keyboard choices, and narrow-screen accessibility.
import { expect, test } from "@playwright/test";
import { bg } from "@/i18n/bg";

test("theme persists across pages and system mode follows the device", async ({ page }) => {
  await page.goto("/dev/ui");
  // The compact switch in the header: a group of three radio buttons named „Изглед“.
  const theme = page.getByRole("radiogroup", { name: bg.theme.label, exact: true });
  await theme.getByRole("radio", { name: bg.theme.dark, exact: true }).check();
  await page.goto("/");
  await expect(theme.getByRole("radio", { name: bg.theme.dark, exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.getByRole("radio", { name: bg.theme.system, exact: true }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 24, 32)");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(244, 246, 248)");
});

test("preview supports keyboard answers and fits a 360px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dev/ui");
  const light = page.getByRole("region", { name: bg.theme.light, exact: true });
  const yes = light.getByRole("radio", { name: bg.common.yes, exact: true });
  await yes.focus();
  await page.keyboard.press("Space");
  await expect(yes).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(light.getByRole("radio", { name: bg.common.no, exact: true })).toBeChecked();
  await expect(light.getByText(bg.verdict.green.description)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const button of await page.getByRole("button").all()) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(64);
  }
});
