import { expect, test } from "@playwright/test";
import { fastForwardActivities, getGame, newGame, teleport } from "./helpers";

test.describe("first session", () => {
  test("a new player can create a character and sees the world and tutorial", async ({ page }) => {
    await newGame(page, "Tolu", "street");
    await expect(page.locator("#phaser-root canvas")).toBeVisible();
    await expect(page.getByTestId("tip-move")).toBeVisible();
    const g = await getGame(page);
    expect(g.player.name).toBe("Tolu");
    expect(g.player.background).toBe("street");
    expect(g.quests.active.q_intro_street).toBeDefined();
  });

  test("the player can move with the keyboard and interact with an NPC", async ({ page }) => {
    await newGame(page);
    const before = await getGame(page);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(2000);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(1500);
    const after = await getGame(page);
    expect(after.player.position.y).toBeGreaterThan(before.player.position.y);
    // stand next to Tunde (tile 10,11 => 168,184)
    await teleport(page, 168, 202);
    await expect(page.getByTestId("interact-button")).toContainText("Tunde", { timeout: 10_000 });
    await page.keyboard.press("e");
    await expect(page.getByTestId("dialogue-next")).toBeVisible();
    await page.getByTestId("dialogue-next").click();
    await page.getByTestId("dialogue-choice").first().click();
    const g = await getGame(page);
    expect(g.quests.flags.intro_done).toBe(true);
    expect(g.npcs.talkedTo.tunde).toBe(1);
    expect(g.quests.active.q_intro_apprentice?.stage).toBe(1);
  });

  test("the player can earn money from a job and buy an upgrade, and progress survives a reload", async ({ page }) => {
    await newGame(page);
    const start = await getGame(page);
    await page.getByTestId("nav-activities").click();
    await expect(page.getByTestId("screen-activities")).toBeVisible();
    await page.getByTestId("start-cafe_typing").click();
    await expect(page.getByTestId("activity-ticker")).toBeVisible();
    let g = await getGame(page);
    expect(g.activities.running).toHaveLength(1);
    expect(g.player.cash).toBe(start.player.cash); // nothing paid before completion
    await page.keyboard.press("Escape");
    await fastForwardActivities(page, 5 * 60_000);
    await expect.poll(async () => (await getGame(page)).stats.activitiesCompleted).toBe(1);
    g = await getGame(page);
    expect(g.player.cash).toBeGreaterThan(start.player.cash);
    expect(g.skills.levels.computing.xp).toBeGreaterThan(start.skills.levels.computing.xp);
    // buy food at the bakery (shop screen) — a meaningful purchase
    await page.evaluate(() => (window as unknown as { __streetTycoon: { ui: { getState: () => { openScreen: (s: string, p: string) => void } } } }).__streetTycoon.ui.getState().openScreen("shop", "kiosk"));
    await expect(page.getByTestId("screen-shop")).toBeVisible();
    const cashBefore = (await getGame(page)).player.cash;
    await page.getByTestId("buy-acc_1").click();
    g = await getGame(page);
    expect(g.inventory.items.acc_1).toBe(1);
    expect(g.player.cash).toBe(cashBefore - 6_000);
    expect(g.inventory.equipped.accessory).toBe("acc_1");
    await page.keyboard.press("Escape");
    // save, reload, continue
    await page.getByRole("button", { name: "Save game" }).click();
    await expect.poll(async () => page.evaluate(() => (window as unknown as { __streetTycoon: { game: { getState: () => { dirty: boolean } } } }).__streetTycoon.game.getState().dirty)).toBe(false);
    await page.reload();
    await page.getByRole("button", { name: "Continue" }).first().click();
    await expect(page.getByTestId("hud-cash")).toBeVisible({ timeout: 30_000 });
    const reloaded = await getGame(page);
    expect(reloaded.player.cash).toBe(g.player.cash);
    expect(reloaded.inventory.items.acc_1).toBe(1);
    expect(reloaded.stats.activitiesCompleted).toBe(1);
  });

  test("the world map lists districts with requirements and the phone opens", async ({ page }) => {
    await newGame(page);
    await page.getByTestId("nav-map").click();
    await expect(page.getByTestId("district-mainland")).toContainText("You are here");
    await expect(page.getByTestId("travel-computerVillage")).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.getByTestId("nav-phone").click();
    await expect(page.getByTestId("phone")).toBeVisible();
    await page.getByTestId("app-social").click();
    await expect(page.getByTestId("screen-social")).toBeVisible();
  });
});
