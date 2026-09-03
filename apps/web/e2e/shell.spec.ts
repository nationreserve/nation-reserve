import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

test("renders the public Nation Reserve product shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("navigation", { name: "Product navigation" }),
  ).toBeVisible();
  await expect(
    page.locator("span", { hasText: "Nation Reserve" }).first(),
  ).toBeVisible();
});

test("renders the platform context on platform routes", async ({ page }) => {
  await page.goto("/platform");

  await expect(page.getByText("Production environment")).toBeVisible();
  await expect(page.getByText("Platform Administrator", { exact: true })).toBeVisible();
});
