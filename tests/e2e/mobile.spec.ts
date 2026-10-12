import { expect, test } from "@playwright/test";
import { getGame, newGame, teleport } from "./helpers";

test("touch controls: joystick and interact button work on a phone-sized screen", async ({ page }) => {
  await newGame(page, "Mobile");
  await expect(page.getByRole("slider", { name: "Virtual joystick" })).toBeVisible();
  await expect(page.getByTestId("mobile-action")).toBeVisible();
  await expect(page.getByTestId("mnav-phone")).toBeVisible();
  const before = await getGame(page);
  const joy = page.getByRole("slider", { name: "Virtual joystick" });
  const box = (await joy.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 40, { steps: 5 });
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await getGame(page);
  expect(after.player.position.y).toBeGreaterThan(before.player.position.y);
  await teleport(page, 168, 202);
  await expect(page.getByTestId("interact-button")).toContainText("Tunde", { timeout: 10_000 });
  await page.getByTestId("mobile-action").tap();
  await expect(page.getByTestId("dialogue-next")).toBeVisible();
});
