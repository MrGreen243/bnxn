import { expect, type Page } from "@playwright/test";
import { createNewGame } from "../../src/simulation/initialState";
import type { GameState } from "../../src/types/game";

export async function newGame(page: Page, name = "Tester", background = "apprentice") {
  await page.goto("/");
  await page.getByTestId("new-game").click();
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId(`bg-${background}`).click();
  await page.getByTestId("start-game").click();
  await expect(page.getByTestId("hud-cash")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => (window as unknown as { __streetTycoon?: { ui: { getState: () => { worldReady: boolean } } } }).__streetTycoon?.ui.getState().worldReady === true, null, { timeout: 30_000 });
}

export async function getGame(page: Page): Promise<GameState> {
  return page.evaluate(() => (window as unknown as { __streetTycoon: { game: { getState: () => { game: GameState } } } }).__streetTycoon.game.getState().game);
}

/** Moves the player via the world event bus (same path the joystick/travel use). */
export async function teleport(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => {
    const w = window as unknown as { __streetTycoon: { game: { getState: () => { game: GameState } }; events: { emit: (e: string, p: unknown) => void } } };
    const g = w.__streetTycoon.game.getState().game;
    w.__streetTycoon.events.emit("world:setLocation", { districtId: g.player.districtId, interiorId: g.player.interiorId, x, y });
  }, { x, y });
  await page.waitForTimeout(600);
}

/** Pretend an in-progress activity started `ms` earlier, then let the live tick settle it. */
export async function fastForwardActivities(page: Page, ms: number) {
  await page.evaluate((ms) => {
    const w = window as unknown as { __streetTycoon: { game: { getState: () => { game: GameState; tick: () => void }; setState: (p: unknown) => void } } };
    const store = w.__streetTycoon.game;
    const g = structuredClone(store.getState().game);
    for (const r of g.activities.running) {
      r.startedAt -= ms;
      r.endsAt -= ms;
    }
    for (const m of g.hk.members) {
      if (m.assignment.kind === "training") m.assignment.endsAt -= ms;
      if (m.assignment.kind === "work") m.assignment.cycleStartedAt -= ms;
    }
    store.setState({ game: g });
    store.getState().tick();
  }, ms);
  await page.waitForTimeout(300);
}

export function craftHkSave(): string {
  const now = Date.now();
  const state = createNewGame({ slotId: "slot_e2e_hk", name: "Kingpin", avatar: { skin: 0, hair: 2, outfit: 6 }, background: "graduate", now, seed: 99 });
  state.player.cash = 12_000_000;
  state.player.stats.credibility = 30;
  state.player.stats.streetRep = 30;
  state.skills.levels.management = { xp: 0, level: 8 };
  state.skills.levels.charisma = { xp: 0, level: 6 };
  state.hk.unlocked = true;
  state.hk.tier = 1;
  state.quests.flags.hk_unlocked = true;
  state.quests.flags.intro_done = true;
  state.quests.completed.push("q_intro_graduate", "q_hk_foundation");
  state.hk.recruitPool = ["cm_seun", "cm_amaka", "cm_kunle"];
  state.hk.poolRefreshedAt = now;
  state.player.position = { x: 104, y: 184 };
  return JSON.stringify({ app: "street-tycoon", exportedAt: new Date(now).toISOString(), appVersion: "0.1.0", state });
}
