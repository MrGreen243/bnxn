import { createNewGame } from "@/simulation/initialState";
import type { GameState } from "@/types/game";
import { Rng } from "@/utils/rng";

export const T0 = 1_700_000_000_000;

export function makeGame(overrides: Partial<{ cash: number; now: number; background: "street" | "apprentice" | "creative" | "graduate" }> = {}): GameState {
  const now = overrides.now ?? T0;
  const g = createNewGame({ slotId: "slot_test", name: "Tester", avatar: { skin: 1, hair: 0, outfit: 2 }, background: overrides.background ?? "street", now, seed: 42 });
  if (overrides.cash !== undefined) g.player.cash = overrides.cash;
  return g;
}

export function rng(seed = 7): Rng {
  return new Rng(seed);
}
