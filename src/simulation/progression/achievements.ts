import { ACHIEVEMENTS } from "@/data/achievements";
import type { GameState } from "@/types/game";
import { applyEffects, logEvent } from "@/simulation/effects";
import { conditionMet } from "@/simulation/progression/quests";

export function evaluateAchievements(state: GameState, at: number): string[] {
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.unlocked[a.id]) continue;
    if (conditionMet(state, a.condition)) {
      state.achievements.unlocked[a.id] = at;
      applyEffects(state, a.reward, at);
      logEvent(state, `Achievement unlocked: ${a.name}`, "good", at);
      unlocked.push(a.id);
    }
  }
  return unlocked;
}
