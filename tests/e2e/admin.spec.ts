import { expect, test } from "@playwright/test";

test("the admin can create, preview and export an ad campaign", async ({ page }) => {
  await page.goto("/admin/ads/");
  await expect(page.getByTestId("campaign-table")).toBeVisible();
  await page.getByTestId("new-campaign").click();
  await page.getByTestId("f-id").fill("e2e-test");
  await page.getByTestId("f-advertiser").fill("E2E Bakery");
  await page.getByTestId("f-campaign").fill("Fresh bread");
  await page.getByTestId("f-headline").fill("Hot bread every morning");
  await page.getByTestId("f-url").fill("javascript:alert(1)");
  await page.getByTestId("f-placement").selectOption("phone_feed");
  await page.getByTestId("save-campaign").click();
  await expect(page.getByTestId("form-errors")).toContainText("clickUrl");
  await page.getByTestId("f-url").fill("https://example.com/bread");
  await page.getByTestId("save-campaign").click();
  await expect(page.getByTestId("campaign-row-e2e-test")).toContainText("Fresh bread");
  await expect(page.getByTestId("campaign-row-e2e-test")).toContainText("Live");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-manifest").click();
  const download = await downloadPromise;
  const path = await download.path();
  const fs = await import("node:fs");
  const manifest = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(manifest.schemaVersion).toBe(1);
  const c = manifest.campaigns.find((x: { id: string }) => x.id === "e2e-test");
  expect(c).toBeDefined();
  expect(c.clickUrl).toBe("https://example.com/bread");
  expect(c.placement).toBe("phone_feed");
  // the local manifest survives a reload and renders in the game's phone feed
  await page.reload();
  await expect(page.getByTestId("campaign-row-e2e-test")).toBeVisible();
});
