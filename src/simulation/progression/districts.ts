import { BALANCE } from "@/data/balance";
import { DISTRICT_MAP } from "@/data/districts";
import type { DistrictId, GameState } from "@/types/game";
import { spendCash } from "@/simulation/economy/money";
import { logEvent } from "@/simulation/effects";
import { getMods } from "@/simulation/modifiers";
import { checkAll, unmetRequirements } from "@/simulation/requirements";

export function canUnlockDistrict(state: GameState, id: DistrictId) {
  const def = DISTRICT_MAP[id];
  if (!def) return { ok: false, unmet: [] };
  if (state.player.unlockedDistricts.includes(id)) return { ok: true, unmet: [] };
  const unmet = unmetRequirements(state, def.requirements);
  return { ok: unmet.length === 0, unmet };
}

export function unlockDistrict(state: GameState, id: DistrictId, at: number): { ok: boolean; reason?: string } {
  const def = DISTRICT_MAP[id];
  if (!def) return { ok: false, reason: "Unknown district" };
  if (state.player.unlockedDistricts.includes(id)) return { ok: true };
  if (!checkAll(state, def.requirements)) return { ok: false, reason: "Requirements not met" };
  state.player.unlockedDistricts.push(id);
  logEvent(state, `${def.name} unlocked!`, "good", at);
  return { ok: true };
}

export function travelCost(state: GameState, to: DistrictId): number {
  const from = DISTRICT_MAP[state.player.districtId];
  const dest = DISTRICT_MAP[to];
  if (!from || !dest || from.id === dest.id) return 0;
  const steps = Math.abs(from.order - dest.order);
  const base = BALANCE.travel.baseCost + steps * BALANCE.travel.costPerDistrictStep + dest.travelCost;
  return Math.round(base * getMods(state).travelDiscount);
}

export function travelTo(state: GameState, to: DistrictId, at: number): { ok: boolean; reason?: string } {
  const dest = DISTRICT_MAP[to];
  if (!dest) return { ok: false, reason: "Unknown district" };
  if (!state.player.unlockedDistricts.includes(to)) {
    const r = unlockDistrict(state, to, at);
    if (!r.ok) return r;
  }
  if (state.player.districtId === to && !state.player.interiorId) return { ok: true };
  const cost = travelCost(state, to);
  if (cost > 0) {
    const r = spendCash(state, cost, "travel", `Travel to ${dest.name}`, at);
    if (!r.ok) return r;
  }
  state.player.districtId = to;
  state.player.interiorId = null;
  state.player.position = { x: dest.map.spawn.x * 16 + 8, y: dest.map.spawn.y * 16 + 8 };
  if (!state.player.discoveredLocations.includes(`district:${to}`)) state.player.discoveredLocations.push(`district:${to}`);
  return { ok: true };
}
