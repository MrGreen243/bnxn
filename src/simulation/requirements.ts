import { BUSINESS_MAP, PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { DISTRICT_MAP } from "@/data/districts";
import { ITEM_MAP } from "@/data/items";
import { PERK_MAP, SKILL_MAP } from "@/data/skills";
import { QUEST_MAP } from "@/data/quests";
import { ACTIVITY_MAP } from "@/data/activities";
import type { EquipSlot, GameState, Requirement } from "@/types/game";
import { formatNaira } from "@/utils/format";
import { netWorth } from "@/simulation/economy/money";

export function equippedTier(state: GameState, slot: EquipSlot): number {
  const id = state.inventory.equipped[slot];
  if (!id) return 0;
  return ITEM_MAP[id]?.tier ?? 0;
}

const STAT_LABEL: Record<string, string> = { streetRep: "Street Rep", fame: "Fame", credibility: "Credibility", heat: "Heat", lifestyle: "Lifestyle" };
const SLOT_LABEL: Record<EquipSlot, string> = { phone: "phone", computer: "computer", internet: "internet", furniture: "furniture", clothing: "clothing", accessory: "accessory", businessEquipment: "business equipment" };

export function checkRequirement(state: GameState, r: Requirement): boolean {
  switch (r.type) {
    case "cash": return state.player.cash >= r.amount;
    case "netWorth": return netWorth(state) >= r.amount;
    case "skill": return (state.skills.levels[r.skill]?.level ?? 1) >= r.level;
    case "stat": {
      const v = state.player.stats[r.stat];
      if (r.min !== undefined && v < r.min) return false;
      if (r.max !== undefined && v > r.max) return false;
      return true;
    }
    case "item": return (state.inventory.items[r.itemId] ?? 0) > 0;
    case "equipTier": return equippedTier(state, r.slot) >= r.tier;
    case "district": return state.player.unlockedDistricts.includes(r.districtId);
    case "quest": return state.quests.completed.includes(r.questId);
    case "flag": {
      const v = state.quests.flags[r.key];
      if (r.value === undefined) return v !== undefined && v !== false;
      return v === r.value;
    }
    case "business": {
      const owned = r.typeId ? state.businesses.owned.filter((b) => b.typeId === r.typeId) : state.businesses.owned;
      return owned.length >= (r.count ?? 1);
    }
    case "property": return state.properties.owned.includes(r.propertyId);
    case "vehicle": return r.vehicleId ? state.vehicles.owned.includes(r.vehicleId) : state.vehicles.owned.length > 0;
    case "hk": {
      if (!state.hk.unlocked) return false;
      if (r.tier !== undefined && state.hk.tier < r.tier) return false;
      if (r.members !== undefined && state.hk.members.length < r.members) return false;
      if (r.hqLevel !== undefined && state.hk.hqLevel < r.hqLevel) return false;
      return true;
    }
    case "activityCount": {
      if (r.activityId) return (state.activities.completedCounts[r.activityId] ?? 0) >= r.count;
      return state.stats.activitiesCompleted >= r.count;
    }
    case "perk": return state.skills.perks.includes(r.perkId);
    case "legacy": return state.prestige.legacyPoints >= r.points;
    default: return false;
  }
}

export function checkAll(state: GameState, reqs: Requirement[] | undefined): boolean {
  if (!reqs || reqs.length === 0) return true;
  return reqs.every((r) => checkRequirement(state, r));
}

export function describeRequirement(r: Requirement): string {
  switch (r.type) {
    case "cash": return `${formatNaira(r.amount)} cash`;
    case "netWorth": return `${formatNaira(r.amount)} net worth`;
    case "skill": return `${SKILL_MAP[r.skill]?.name ?? r.skill} level ${r.level}`;
    case "stat": return `${STAT_LABEL[r.stat] ?? r.stat}${r.min !== undefined ? ` ≥ ${r.min}` : ""}${r.max !== undefined ? ` ≤ ${r.max}` : ""}`;
    case "item": return `Own ${ITEM_MAP[r.itemId]?.name ?? r.itemId}`;
    case "equipTier": return `${SLOT_LABEL[r.slot]} tier ${r.tier}+`;
    case "district": return `${DISTRICT_MAP[r.districtId]?.name ?? r.districtId} unlocked`;
    case "quest": return `Complete "${QUEST_MAP[r.questId]?.title ?? r.questId}"`;
    case "flag": return flagLabel(r.key);
    case "business": return `${r.count ?? 1} business${(r.count ?? 1) > 1 ? "es" : ""}${r.typeId ? ` (${BUSINESS_MAP[r.typeId]?.name})` : ""}`;
    case "property": return `Own ${PROPERTY_MAP[r.propertyId]?.name ?? r.propertyId}`;
    case "vehicle": return r.vehicleId ? `Own ${VEHICLE_MAP[r.vehicleId]?.name}` : "Own a vehicle";
    case "hk": {
      const parts: string[] = ["HK unlocked"];
      if (r.tier) parts.push(`tier ${r.tier}`);
      if (r.members) parts.push(`${r.members} members`);
      if (r.hqLevel) parts.push(`HQ level ${r.hqLevel}`);
      return parts.join(", ");
    }
    case "activityCount": return r.activityId ? `${ACTIVITY_MAP[r.activityId]?.name ?? r.activityId} ×${r.count}` : `${r.count} activities completed`;
    case "perk": return `Perk: ${PERK_MAP[r.perkId]?.name ?? r.perkId}`;
    case "legacy": return `${r.points} legacy points`;
    default: return "Unknown requirement";
  }
}

function flagLabel(key: string): string {
  const map: Record<string, string> = {
    met_chidi: "Accepted Chidi's offer",
    met_lanre: "Took a lesson from Uncle Lanre",
    intro_done: "Talked to Tunde",
    hk_unlocked: "HK unlocked",
    registered: "Company registered",
  };
  return map[key] ?? `Flag: ${key}`;
}

export function unmetRequirements(state: GameState, reqs: Requirement[] | undefined): Requirement[] {
  return (reqs ?? []).filter((r) => !checkRequirement(state, r));
}
