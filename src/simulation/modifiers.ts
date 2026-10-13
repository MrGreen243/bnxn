import { FACILITY_MAP } from "@/data/crew";
import { PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { ITEM_MAP } from "@/data/items";
import { PERK_MAP } from "@/data/skills";
import { BALANCE } from "@/data/balance";
import type { GameState, Modifier, ModifierKey } from "@/types/game";

const MULTIPLICATIVE: Set<ModifierKey> = new Set([
  "activityReward", "activityRewardLegit", "activityRewardRisky", "activitySpeed", "skillXp", "businessRevenue", "businessCosts",
  "crewEfficiency", "crewTrainingSpeed", "recruitCost", "shopDiscount", "energyRegen", "heatDecay", "fameGain", "rentDiscount", "travelDiscount",
]);

export type Modifiers = Record<ModifierKey, number>;

const ALL_KEYS: ModifierKey[] = [
  "activityReward", "activityRewardLegit", "activityRewardRisky", "activitySpeed", "activitySlots", "skillXp", "businessRevenue", "businessCosts",
  "crewEfficiency", "crewTrainingSpeed", "crewMorale", "recruitCost", "shopDiscount", "offlineCapHours", "energyRegen", "maxEnergy", "riskReduction",
  "heatDecay", "fameGain", "investmentReturn", "rentDiscount", "travelDiscount", "inventoryCapacity", "hkCapacity",
];

export function emptyModifiers(): Modifiers {
  const m = {} as Modifiers;
  for (const k of ALL_KEYS) m[k] = MULTIPLICATIVE.has(k) ? 1 : 0;
  return m;
}

function apply(m: Modifiers, mod: Modifier) {
  if (MULTIPLICATIVE.has(mod.key)) m[mod.key] *= mod.value;
  else m[mod.key] += mod.value;
}

/** Collects every source of modifiers in the game into one object. */
export function computeModifiers(state: GameState): { mods: Modifiers; sources: { label: string; modifiers: Modifier[] }[] } {
  const mods = emptyModifiers();
  const sources: { label: string; modifiers: Modifier[] }[] = [];
  const add = (label: string, list: Modifier[]) => {
    if (!list.length) return;
    sources.push({ label, modifiers: list });
    for (const mod of list) apply(mods, mod);
  };
  for (const perkId of state.skills.perks) {
    const perk = PERK_MAP[perkId];
    if (perk) add(perk.name, perk.modifiers);
  }
  for (const itemId of Object.values(state.inventory.equipped)) {
    if (!itemId) continue;
    const item = ITEM_MAP[itemId];
    if (item) add(item.name, item.modifiers);
  }
  for (const itemId of Object.keys(state.inventory.items)) {
    const item = ITEM_MAP[itemId];
    if (item && item.category === "collectible" && (state.inventory.items[itemId] ?? 0) > 0) add(item.name, item.modifiers);
  }
  const prop = PROPERTY_MAP[state.properties.current];
  if (prop) add(prop.name, prop.modifiers);
  if (state.vehicles.current) {
    const v = VEHICLE_MAP[state.vehicles.current];
    if (v) add(v.name, v.modifiers);
  }
  for (const [facId, level] of Object.entries(state.hk.facilities)) {
    const fac = FACILITY_MAP[facId];
    if (!fac || level <= 0) continue;
    const list: Modifier[] = [];
    for (let i = 0; i < level; i++) list.push(...fac.modifiersPerLevel);
    add(`${fac.name} L${level}`, list);
  }
  if (state.prestige.legacyPoints > 0) {
    const bonus = Math.min(BALANCE.prestige.maxIncomeBonus, state.prestige.legacyPoints * BALANCE.prestige.incomeBonusPerPoint);
    add("Legacy bonus", [
      { key: "activityReward", value: 1 + bonus },
      { key: "businessRevenue", value: 1 + bonus },
      { key: "crewEfficiency", value: 1 + bonus },
    ]);
  }
  // Travel discount floor: 0 means free travel.
  mods.travelDiscount = Math.max(0, mods.travelDiscount);
  mods.riskReduction = Math.min(0.5, mods.riskReduction);
  return { mods, sources };
}

export function getMods(state: GameState): Modifiers {
  return computeModifiers(state).mods;
}

export function maxEnergy(state: GameState, mods = getMods(state)): number {
  return BALANCE.energy.max + mods.maxEnergy;
}

export function offlineCapMs(state: GameState, mods = getMods(state)): number {
  const hours = Math.min(BALANCE.offline.hardCapHours, BALANCE.offline.baseCapHours + mods.offlineCapHours);
  return hours * 3_600_000;
}

export function activitySlots(state: GameState, mods = getMods(state)): number {
  return Math.min(BALANCE.activities.maxSlots, BALANCE.activities.baseSlots + mods.activitySlots);
}
