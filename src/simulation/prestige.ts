import { BALANCE } from "@/data/balance";
import type { GameState } from "@/types/game";
import { netWorth } from "@/simulation/economy/money";
import { createNewGame } from "@/simulation/initialState";

export function prestigeAvailable(state: GameState): { ok: boolean; netWorth: number; required: number; points: number } {
  const nw = netWorth(state);
  const required = BALANCE.prestige.netWorthRequired;
  return { ok: nw >= required, netWorth: nw, required, points: legacyPointsFor(nw) };
}

export function legacyPointsFor(nw: number): number {
  return Math.floor((nw / 1_000_000_000) * BALANCE.prestige.pointsPerBillion);
}

/** What a legacy reset keeps and what it resets — the same list the UI shows. */
export const PRESTIGE_RULES = {
  keeps: ["Legacy points and the permanent income bonus they grant", "Achievements", "Collectible cosmetics (collectible items)", "Settings and tutorial progress", "Lifetime statistics"],
  resets: ["Cash, bank and investments", "Skills, perks and equipment", "Districts, quests and relationships", "Businesses, properties and vehicles", "The Hustler Kingdom, crew and contracts", "Heat, reputation and events"],
};

export function performPrestige(state: GameState, at: number): GameState | null {
  const check = prestigeAvailable(state);
  if (!check.ok) return null;
  const cosmetics = Object.keys(state.inventory.items).filter((id) => id.startsWith("col_"));
  const next = createNewGame({
    slotId: state.meta.slotId,
    name: state.player.name,
    avatar: state.player.avatar,
    background: state.player.background,
    now: at,
    legacyPoints: state.prestige.legacyPoints + check.points,
    cosmetics: Array.from(new Set([...state.prestige.cosmetics, ...cosmetics])),
    prestigeRuns: state.prestige.runs + 1,
    lifetimeNetWorth: state.prestige.lifetimeNetWorth + check.netWorth,
  });
  next.achievements = state.achievements;
  next.settings = state.settings;
  next.tutorial = state.tutorial;
  next.stats = { ...state.stats, playtimeMs: state.stats.playtimeMs };
  for (const id of next.prestige.cosmetics) next.inventory.items[id] = 1;
  next.events.log.unshift({ at, text: `Legacy run ${next.prestige.runs} begins with ${next.prestige.legacyPoints} legacy points.`, kind: "good" });
  return next;
}
