import { BALANCE } from "@/data/balance";
import { BUSINESS_MAP } from "@/data/businesses";
import type { GameState, OwnedBusiness } from "@/types/game";
import { addCash, spendCash } from "@/simulation/economy/money";
import { logEvent } from "@/simulation/effects";
import { getMods, type Modifiers } from "@/simulation/modifiers";
import { checkAll } from "@/simulation/requirements";
import { uid } from "@/utils/ids";

export interface BusinessEconomics {
  revenuePerHour: number;
  expensesPerHour: number;
  wagesPerHour: number;
  netPerHour: number;
  demand: number;
  upgradeCost: number | null;
}

export function upgradeCost(typeId: string, level: number): number {
  const def = BUSINESS_MAP[typeId];
  if (!def) return 0;
  return Math.round(def.price * 0.6 * Math.pow(BALANCE.businesses.upgradeCostGrowth, level - 1));
}

export function businessEconomics(state: GameState, b: OwnedBusiness, mods: Modifiers = getMods(state)): BusinessEconomics {
  const def = BUSINESS_MAP[b.typeId];
  if (!def) return { revenuePerHour: 0, expensesPerHour: 0, wagesPerHour: 0, netPerHour: 0, demand: 1, upgradeCost: null };
  const levelMult = 1 + (b.level - 1) * BALANCE.businesses.revenueGrowthPerLevel;
  const skillLevel = state.skills.levels[def.managementSkill]?.level ?? 1;
  const skillMult = 1 + (skillLevel - 1) * 0.015;
  const demand = 1 + state.player.stats.fame * BALANCE.businesses.demandFameFactor;
  const revenuePerHour = Math.round(def.revenuePerHour * levelMult * mods.businessRevenue * skillMult * demand);
  const expensesPerHour = Math.round(def.expensesPerHour * (1 + (b.level - 1) * 0.25) * mods.businessCosts);
  const wagesPerHour = Math.round(def.staffWagePerHour * def.staffRequired * (1 + (b.level - 1) * 0.2));
  return {
    revenuePerHour,
    expensesPerHour,
    wagesPerHour,
    netPerHour: revenuePerHour - expensesPerHour - wagesPerHour,
    demand,
    upgradeCost: b.level >= Math.min(def.maxLevel, BALANCE.businesses.maxLevel) ? null : upgradeCost(b.typeId, b.level),
  };
}

export function canBuyBusiness(state: GameState, typeId: string): { ok: boolean; reason?: string } {
  const def = BUSINESS_MAP[typeId];
  if (!def) return { ok: false, reason: "Unknown business" };
  if (state.businesses.owned.some((b) => b.typeId === typeId)) return { ok: false, reason: "Already owned" };
  if (!state.player.unlockedDistricts.includes(def.district)) return { ok: false, reason: "District locked" };
  if (!checkAll(state, def.requirements)) return { ok: false, reason: "Requirements not met" };
  if (state.player.cash < def.price) return { ok: false, reason: "Not enough cash" };
  return { ok: true };
}

export function buyBusiness(state: GameState, typeId: string, at: number): { ok: boolean; reason?: string } {
  const check = canBuyBusiness(state, typeId);
  if (!check.ok) return check;
  const def = BUSINESS_MAP[typeId]!;
  const r = spendCash(state, def.price, "business", `Bought ${def.name}`, at);
  if (!r.ok) return r;
  state.businesses.owned.push({ id: uid("biz"), typeId, level: 1, purchasedAt: at, uncollected: 0, totalRevenue: 0, totalCosts: 0, staff: def.staffRequired, lastEventAt: 0 });
  logEvent(state, `You bought ${def.name}.`, "good", at);
  return { ok: true };
}

export function upgradeBusiness(state: GameState, businessId: string, at: number): { ok: boolean; reason?: string } {
  const b = state.businesses.owned.find((x) => x.id === businessId);
  if (!b) return { ok: false, reason: "Not found" };
  const econ = businessEconomics(state, b);
  if (econ.upgradeCost === null) return { ok: false, reason: "Max level" };
  const r = spendCash(state, econ.upgradeCost, "business", `Upgraded ${BUSINESS_MAP[b.typeId]?.name} to L${b.level + 1}`, at);
  if (!r.ok) return r;
  b.level += 1;
  return { ok: true };
}

export function sellBusiness(state: GameState, businessId: string, at: number): { ok: boolean; reason?: string; amount?: number } {
  const idx = state.businesses.owned.findIndex((x) => x.id === businessId);
  if (idx < 0) return { ok: false, reason: "Not found" };
  const b = state.businesses.owned[idx]!;
  const def = BUSINESS_MAP[b.typeId];
  const value = Math.round((def?.price ?? 0) * (1 + (b.level - 1) * 0.5) * 0.6) + Math.round(b.uncollected);
  state.businesses.owned.splice(idx, 1);
  addCash(state, value, "business", `Sold ${def?.name ?? "business"}`, at);
  return { ok: true, amount: value };
}

/**
 * Accrues net business income for an elapsed duration into the uncollected
 * pool. Negative net is charged immediately as an expense (returned).
 */
export function accrueBusinesses(state: GameState, elapsedMs: number, at: number, mods: Modifiers): { accrued: number; expenses: number } {
  let accrued = 0;
  let expenses = 0;
  const hours = elapsedMs / 3_600_000;
  for (const b of state.businesses.owned) {
    if (b.lastEventAt > at) continue; // disrupted
    const econ = businessEconomics(state, b, mods);
    const cap = econ.revenuePerHour * BALANCE.businesses.uncollectedCapHours;
    const gross = econ.revenuePerHour * hours;
    const costs = (econ.expensesPerHour + econ.wagesPerHour) * hours;
    b.totalRevenue += gross;
    b.totalCosts += costs;
    const net = gross - costs;
    if (net >= 0) {
      const before = b.uncollected;
      b.uncollected = Math.min(cap, b.uncollected + net);
      accrued += b.uncollected - before;
    } else {
      expenses += -net;
      b.uncollected = Math.max(0, b.uncollected + net);
    }
  }
  return { accrued, expenses: Math.round(expenses) };
}

export function collectBusiness(state: GameState, businessId: string | "all", at: number): number {
  let total = 0;
  for (const b of state.businesses.owned) {
    if (businessId !== "all" && b.id !== businessId) continue;
    const amount = Math.floor(b.uncollected);
    if (amount <= 0) continue;
    b.uncollected -= amount;
    total += addCash(state, amount, "business", `${BUSINESS_MAP[b.typeId]?.name ?? "Business"} income`, at);
  }
  if (total > 0) {
    state.stats.businessIncome += total;
    if (state.stats.businessIncome >= 50_000) state.quests.flags.business_income_50k = true;
  }
  return total;
}
