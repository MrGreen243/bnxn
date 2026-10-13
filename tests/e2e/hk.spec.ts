import { expect, test } from "@playwright/test";
import { craftHkSave, fastForwardActivities, getGame, newGame } from "./helpers";

test("the player can import a save, rent an HQ, recruit, train and pay a crew member", async ({ page }) => {
  await newGame(page);
  await page.getByTestId("nav-settings").click();
  await page.getByRole("button", { name: "Save management" }).click();
  await expect(page.getByTestId("screen-saves")).toBeVisible();
  await page.getByTestId("import-input").setInputFiles({ name: "hk.json", mimeType: "application/json", buffer: Buffer.from(craftHkSave()) });
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("hud-cash")).toContainText("₦12", { timeout: 20_000 });
  let g = await getGame(page);
  expect(g.hk.unlocked).toBe(true);
  // rent HQ
  await page.getByTestId("nav-hk").click();
  await expect(page.getByTestId("screen-hk")).toBeVisible();
  await page.getByTestId("hq-upgrade").click();
  await page.getByTestId("confirm-yes").click();
  g = await getGame(page);
  expect(g.hk.hqLevel).toBe(1);
  // recruit Seun at 30%
  await page.getByRole("button", { name: "Recruit", exact: true }).first().click();
  await expect(page.getByTestId("screen-recruit")).toBeVisible();
  await page.getByTestId("recruit-cm_seun").click();
  g = await getGame(page);
  expect(g.hk.members).toHaveLength(1);
  expect(g.hk.members[0]!.contract.sharePct).toBe(30);
  // train
  await page.keyboard.press("Escape");
  await page.getByTestId("nav-crew").click();
  await page.getByRole("button", { name: "Assignments" }).click();
  await expect(page.getByTestId("screen-training")).toBeVisible();
  await page.getByRole("tab", { name: "Training programs" }).click();
  await page.getByTestId("train-tr_computing").click();
  g = await getGame(page);
  expect(g.hk.members[0]!.assignment.kind).toBe("training");
  const skillBefore = g.hk.members[0]!.skills.computing;
  await page.keyboard.press("Escape");
  await fastForwardActivities(page, 60 * 60_000);
  await expect.poll(async () => (await getGame(page)).hk.members[0]!.assignment.kind).toBe("idle");
  g = await getGame(page);
  expect(g.hk.members[0]!.skills.computing).toBe(skillBefore + 1);
  expect(g.stats.trainingsCompleted).toBe(1);
  // assign work and collect a payout
  await page.getByTestId("nav-crew").click();
  await page.getByRole("button", { name: "Assignments" }).click();
  await page.getByTestId("assign-cw_freelance_dev").click();
  await page.keyboard.press("Escape");
  const cashBefore = (await getGame(page)).player.cash;
  await fastForwardActivities(page, 10 * 60_000);
  await expect.poll(async () => (await getGame(page)).hk.payouts.length).toBeGreaterThan(0);
  g = await getGame(page);
  const p = g.hk.payouts[0]!;
  expect(p.net).toBe(p.memberShare + p.hkRevenue);
  expect(p.memberShare).toBe(Math.round((p.net * 30) / 100));
  expect(g.player.cash).toBe(cashBefore + g.hk.payouts.reduce((s, x) => s + x.hkRevenue, 0));
  // contracts screen shows the agreement and refuses to change it mid-work
  await page.getByTestId("nav-hk").click();
  await page.getByRole("button", { name: "Contracts" }).first().click();
  await expect(page.getByTestId("contract-cm_seun")).toContainText("30%");
  await expect(page.getByTestId("contract-cm_seun")).toContainText("Unassign this member");
});
