import type { DailyObjective, GameState } from "@/types/game";
import { addCash } from "@/simulation/economy/money";
import { dayKey } from "@/utils/time";

function scale(state: GameState): number {
  return Math.max(1, Math.floor(Math.log10(Math.max(10_000, state.player.cash + state.player.bank)) - 3));
}

export function ensureDailyObjectives(state: GameState, at: number): boolean {
  const key = dayKey(at);
  if (state.daily.dayKey === key && state.daily.objectives.length) return false;
  const s = scale(state);
  const objectives: DailyObjective[] = [
    { id: "d_act", kind: "activities", target: 3 + s, progress: 0, reward: 2_000 * Math.pow(4, s - 1), claimed: false },
    { id: "d_earn", kind: "earn", target: 5_000 * Math.pow(6, s - 1), progress: 0, reward: 3_000 * Math.pow(4, s - 1), claimed: false },
    { id: "d_talk", kind: "talk", target: 2, progress: 0, reward: 1_500 * Math.pow(4, s - 1), claimed: false },
  ];
  if (state.hk.unlocked) objectives.push({ id: "d_train", kind: "train", target: 1, progress: 0, reward: 10_000 * Math.pow(3, s - 1), claimed: false });
  if (state.businesses.owned.length) objectives.push({ id: "d_collect", kind: "collect", target: 1, progress: 0, reward: 5_000 * Math.pow(4, s - 1), claimed: false });
  state.daily = { dayKey: key, objectives };
  return true;
}

export function bumpDaily(state: GameState, kind: DailyObjective["kind"], amount = 1) {
  for (const o of state.daily.objectives) if (o.kind === kind) o.progress = Math.min(o.target, o.progress + amount);
}

export function claimDaily(state: GameState, id: string, at: number): { ok: boolean; reason?: string } {
  const o = state.daily.objectives.find((x) => x.id === id);
  if (!o) return { ok: false, reason: "Not found" };
  if (o.claimed) return { ok: false, reason: "Already claimed" };
  if (o.progress < o.target) return { ok: false, reason: "Not complete" };
  o.claimed = true;
  addCash(state, o.reward, "daily", "Daily objective reward", at);
  return { ok: true };
}

export const DAILY_LABELS: Record<DailyObjective["kind"], string> = {
  activities: "Complete activities",
  earn: "Earn cash",
  talk: "Talk to people",
  train: "Complete a crew training",
  collect: "Collect business income",
};
