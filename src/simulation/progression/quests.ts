import { ACTIVITY_MAP } from "@/data/activities";
import { PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { QUESTS, QUEST_MAP } from "@/data/quests";
import type { Condition, QuestDef } from "@/data/types";
import type { GameState } from "@/types/game";
import { applyEffects, logEvent } from "@/simulation/effects";
import { investmentValue, netWorth } from "@/simulation/economy/money";
import { checkAll, equippedTier } from "@/simulation/requirements";

export function conditionMet(state: GameState, c: Condition): boolean {
  switch (c.type) {
    case "activityCount": {
      if (c.activityId) return (state.activities.completedCounts[c.activityId] ?? 0) >= c.count;
      if (c.category || c.legit !== undefined) {
        let n = 0;
        for (const [id, count] of Object.entries(state.activities.completedCounts)) {
          const def = ACTIVITY_MAP[id];
          if (!def) continue;
          if (c.category && def.category !== c.category) continue;
          if (c.legit !== undefined && def.legit !== c.legit) continue;
          n += count;
        }
        return n >= c.count;
      }
      return state.stats.activitiesCompleted >= c.count;
    }
    case "cash": return state.player.cash >= c.amount;
    case "netWorth": return netWorth(state) >= c.amount;
    case "item": return (state.inventory.items[c.itemId] ?? 0) > 0;
    case "equipTier": return equippedTier(state, c.slot) >= c.tier;
    case "talk": return (state.npcs.talkedTo[c.npcId] ?? 0) > 0;
    case "skill": return (state.skills.levels[c.skill]?.level ?? 1) >= c.level;
    case "district": return state.player.unlockedDistricts.includes(c.districtId);
    case "flag": {
      const v = state.quests.flags[c.key];
      return c.value === undefined ? v !== undefined && v !== false : v === c.value;
    }
    case "business": return state.businesses.owned.length >= c.count;
    case "property": {
      if (c.propertyId) return state.properties.owned.includes(c.propertyId);
      return state.properties.owned.some((id) => (PROPERTY_MAP[id]?.tier ?? 0) >= (c.tier ?? 0));
    }
    case "vehicle": return state.vehicles.owned.some((id) => (VEHICLE_MAP[id]?.tier ?? 0) >= (c.tier ?? 1));
    case "hkMembers": return state.hk.members.length >= c.count;
    case "hkTier": return state.hk.tier >= c.tier;
    case "hqLevel": return state.hk.hqLevel >= c.level;
    case "stat": return state.player.stats[c.stat] >= c.min;
    case "trainings": return state.stats.trainingsCompleted >= c.count;
    case "crewPayouts": return state.hk.payouts.length >= c.count || state.hk.members.reduce((s, m) => s + m.cyclesCompleted, 0) >= c.count;
    case "visit": return state.player.discoveredLocations.includes(c.locationId);
    case "investment": return investmentValue(state) >= c.amount;
    case "achievements": return Object.keys(state.achievements.unlocked).length >= c.count;
    default: return false;
  }
}

export function conditionProgress(state: GameState, c: Condition): { current: number; target: number } | null {
  switch (c.type) {
    case "activityCount": {
      if (c.activityId) return { current: state.activities.completedCounts[c.activityId] ?? 0, target: c.count };
      if (c.category) {
        let n = 0;
        for (const [id, count] of Object.entries(state.activities.completedCounts)) if (ACTIVITY_MAP[id]?.category === c.category) n += count;
        return { current: n, target: c.count };
      }
      return { current: state.stats.activitiesCompleted, target: c.count };
    }
    case "cash": return { current: state.player.cash, target: c.amount };
    case "netWorth": return { current: netWorth(state), target: c.amount };
    case "skill": return { current: state.skills.levels[c.skill]?.level ?? 1, target: c.level };
    case "stat": return { current: state.player.stats[c.stat], target: c.min };
    case "hkMembers": return { current: state.hk.members.length, target: c.count };
    case "business": return { current: state.businesses.owned.length, target: c.count };
    case "trainings": return { current: state.stats.trainingsCompleted, target: c.count };
    case "crewPayouts": return { current: state.hk.members.reduce((s, m) => s + m.cyclesCompleted, 0), target: c.count };
    case "investment": return { current: investmentValue(state), target: c.amount };
    default: return null;
  }
}

export function startQuest(state: GameState, questId: string, at: number): boolean {
  const def = QUEST_MAP[questId];
  if (!def) return false;
  if (state.quests.active[questId]) return false;
  if (state.quests.completed.includes(questId) && !def.repeatable) return false;
  if (!checkAll(state, def.requirements)) return false;
  state.quests.active[questId] = { stage: 0, progress: {}, startedAt: at };
  logEvent(state, `New quest: ${def.title}`, "info", at);
  return true;
}

export interface QuestUpdate {
  questId: string;
  title: string;
  kind: "stage" | "completed" | "started";
  text: string;
}

/** Runs auto-start checks and advances active quests. Safe to call after any change. */
export function evaluateQuests(state: GameState, at: number): QuestUpdate[] {
  const updates: QuestUpdate[] = [];
  const introId = `q_intro_${state.player.background}`;
  for (const def of QUESTS) {
    if (!def.autoStart) continue;
    if (def.id.startsWith("q_intro_") && def.id !== introId) continue;
    if (state.quests.active[def.id] || state.quests.completed.includes(def.id)) continue;
    if (startQuest(state, def.id, at)) updates.push({ questId: def.id, title: def.title, kind: "started", text: def.summary });
  }
  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 50) {
    progressed = false;
    for (const [questId, prog] of Object.entries(state.quests.active)) {
      const def: QuestDef | undefined = QUEST_MAP[questId];
      if (!def) {
        delete state.quests.active[questId];
        continue;
      }
      const stage = def.stages[prog.stage];
      if (!stage) {
        completeQuest(state, def, at, updates);
        progressed = true;
        continue;
      }
      if (conditionMet(state, stage.condition)) {
        applyEffects(state, stage.onComplete, at);
        prog.stage += 1;
        progressed = true;
        if (prog.stage >= def.stages.length) completeQuest(state, def, at, updates);
        else updates.push({ questId, title: def.title, kind: "stage", text: def.stages[prog.stage]!.objective });
      }
    }
  }
  return updates;
}

function completeQuest(state: GameState, def: QuestDef, at: number, updates: QuestUpdate[]) {
  delete state.quests.active[def.id];
  if (!state.quests.completed.includes(def.id)) state.quests.completed.push(def.id);
  state.stats.questsCompleted += 1;
  const req = applyEffects(state, def.rewards, at);
  for (const q of req.startQuests) startQuest(state, q, at);
  logEvent(state, `Quest complete: ${def.title}`, "good", at);
  updates.push({ questId: def.id, title: def.title, kind: "completed", text: "Quest complete!" });
}
