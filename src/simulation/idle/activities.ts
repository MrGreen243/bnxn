import { ACTIVITY_MAP } from "@/data/activities";
import { BALANCE } from "@/data/balance";
import type { ActivityDef } from "@/data/types";
import type { ActivityResult, ActivityRun, GameState, SkillId } from "@/types/game";
import { addCash } from "@/simulation/economy/money";
import { addItem, adjustStat, logEvent } from "@/simulation/effects";
import { activitySlots, getMods, type Modifiers } from "@/simulation/modifiers";
import { addSkillXp } from "@/simulation/progression/skills";
import { checkAll, equippedTier, unmetRequirements } from "@/simulation/requirements";
import { activityRisk, applyBust, isConfined } from "@/simulation/risk/risk";
import { uid } from "@/utils/ids";
import type { Rng } from "@/utils/rng";

export interface ActivityPreview {
  def: ActivityDef;
  rewardMin: number;
  rewardMax: number;
  durationMs: number;
  multiplier: number;
  risk: number;
  available: boolean;
  reasons: string[];
  restrictedUntil: number;
}

/** Reward multiplier from skills and equipment — the single source of truth. */
export function activityMultiplier(state: GameState, def: ActivityDef, mods: Modifiers): number {
  let mult = mods.activityReward * (def.legit ? mods.activityRewardLegit : mods.activityRewardRisky);
  for (const [skill, perLevel] of Object.entries(def.skillScaling)) {
    const level = state.skills.levels[skill as SkillId]?.level ?? 1;
    mult *= 1 + (level - 1) * (perLevel ?? 0);
  }
  for (const [slot, perTier] of Object.entries(def.equipmentScaling)) {
    const tier = equippedTier(state, slot as keyof typeof state.inventory.equipped);
    mult *= 1 + Math.max(0, tier - 1) * (perTier ?? 0);
  }
  return mult;
}

export function activityDuration(def: ActivityDef, mods: Modifiers): number {
  return Math.max(10_000, Math.round(def.durationMs / Math.max(0.1, mods.activitySpeed)));
}

export function previewActivity(state: GameState, def: ActivityDef, at: number, mods = getMods(state)): ActivityPreview {
  const mult = activityMultiplier(state, def, mods);
  const reasons: string[] = [];
  const unmet = unmetRequirements(state, def.requirements);
  if (def.district !== "any" && !state.player.unlockedDistricts.includes(def.district)) reasons.push("District locked");
  if (unmet.length) reasons.push("Requirements not met");
  const restrictedUntil = def.legit ? state.activities.restrictions[def.category] ?? 0 : Math.max(state.activities.restrictions["risky"] ?? 0, state.activities.restrictions[def.category] ?? 0);
  if (restrictedUntil > at) reasons.push("Temporarily restricted");
  if (isConfined(state, at)) reasons.push("You are confined");
  if (!def.legit && state.quests.flags.chidi_refused === true) reasons.push("You walked away from this life");
  if (!def.repeatable && (state.activities.completedCounts[def.id] ?? 0) > 0) reasons.push("Already completed");
  return {
    def,
    rewardMin: Math.round(def.reward[0] * mult),
    rewardMax: Math.round(def.reward[1] * mult),
    durationMs: activityDuration(def, mods),
    multiplier: mult,
    risk: activityRisk(state, def, mods),
    available: reasons.length === 0,
    reasons,
    restrictedUntil,
  };
}

export type StartResult = { ok: true; run: ActivityRun } | { ok: false; reason: string };

export function canStartActivity(state: GameState, activityId: string, at: number): { ok: boolean; reason?: string } {
  const def = ACTIVITY_MAP[activityId];
  if (!def) return { ok: false, reason: "Unknown activity" };
  const preview = previewActivity(state, def, at);
  if (!preview.available) return { ok: false, reason: preview.reasons[0] };
  if (!checkAll(state, def.requirements)) return { ok: false, reason: "Requirements not met" };
  if (state.player.energy < def.energyCost) return { ok: false, reason: "Not enough energy" };
  if (state.activities.running.length >= activitySlots(state)) return { ok: false, reason: "All activity slots are busy" };
  return { ok: true };
}

/** Starts an activity. The reward is locked in now and paid only on completion. */
export function startActivity(state: GameState, activityId: string, at: number, rng: Rng): StartResult {
  const check = canStartActivity(state, activityId, at);
  if (!check.ok) return { ok: false, reason: check.reason ?? "Cannot start" };
  const def = ACTIVITY_MAP[activityId]!;
  const mods = getMods(state);
  const mult = activityMultiplier(state, def, mods);
  const base = rng.range(def.reward[0], def.reward[1]);
  const run: ActivityRun = {
    instanceId: uid("run"),
    activityId,
    startedAt: at,
    endsAt: at + activityDuration(def, mods),
    cashReward: Math.round(base * mult),
    xpMultiplier: mods.skillXp,
    riskChance: activityRisk(state, def, mods),
  };
  state.player.energy = Math.max(0, state.player.energy - def.energyCost);
  state.activities.running.push(run);
  return { ok: true, run };
}

export function cancelActivity(state: GameState, instanceId: string): boolean {
  const idx = state.activities.running.findIndex((r) => r.instanceId === instanceId);
  if (idx < 0) return false;
  state.activities.running.splice(idx, 1);
  return true;
}

export function queueActivity(state: GameState, activityId: string): { ok: boolean; reason?: string } {
  if (!ACTIVITY_MAP[activityId]) return { ok: false, reason: "Unknown activity" };
  if (state.activities.queue.length >= BALANCE.activities.queueLimit) return { ok: false, reason: "Queue is full" };
  state.activities.queue.push(activityId);
  return { ok: true };
}

export function dequeueActivity(state: GameState, index: number) {
  state.activities.queue.splice(index, 1);
}

/** Resolves a finished run: pays reward, awards XP, rolls risk. */
export function completeRun(state: GameState, run: ActivityRun, at: number, rng: Rng): ActivityResult {
  const def = ACTIVITY_MAP[run.activityId];
  const result: ActivityResult = { id: uid("res"), activityId: run.activityId, completedAt: at, cash: 0, xp: {}, outcome: "success", message: "" };
  if (!def) {
    result.message = "This activity no longer exists in this version of the game.";
    return result;
  }
  state.activities.completedCounts[def.id] = (state.activities.completedCounts[def.id] ?? 0) + 1;
  state.stats.activitiesCompleted += 1;
  if (def.legit) state.stats.legitCompleted += 1;
  else state.stats.riskyCompleted += 1;
  if (state.stats.legitCompleted >= 50 && state.stats.busts === 0) state.quests.flags.clean_50 = true;

  const busted = run.riskChance > 0 && rng.chance(run.riskChance);
  const complication = !busted && rng.chance(0.15);
  let cash = run.cashReward;
  if (complication) cash = Math.round(cash * 0.5);
  if (busted) {
    result.outcome = "bust";
    result.message = `${rng.pick(def.outcomes.bust ?? ["It went wrong."])} ${applyBust(state, def, at, rng)}`;
    cash = 0;
  } else {
    result.outcome = complication ? "complication" : "success";
    result.message = rng.pick(complication ? def.outcomes.complication : def.outcomes.success);
  }
  if (cash > 0) result.cash = addCash(state, cash, def.legit ? "activity" : "risky", def.name, at);
  for (const [skill, amount] of Object.entries(def.xp)) {
    const gain = addSkillXp(state, skill as SkillId, (amount ?? 0) * run.xpMultiplier * (busted ? 0.5 : 1), { raw: true });
    result.xp[skill as SkillId] = gain.amount;
  }
  if (!busted) {
    for (const [stat, amount] of Object.entries(def.statEffects ?? {})) adjustStat(state, stat as keyof typeof state.player.stats, amount ?? 0);
    if (!def.legit) adjustStat(state, "heat", BALANCE.activities.heatPerRisk * def.risk);
    for (const drop of def.itemDrops ?? []) {
      if (rng.chance(drop.chance)) {
        addItem(state, drop.itemId);
        result.items = [...(result.items ?? []), drop.itemId];
      }
    }
  }
  if (!def.legit) state.quests.flags.chidi_decided = true;
  state.activities.results.unshift(result);
  if (state.activities.results.length > 12) state.activities.results.length = 12;
  logEvent(state, `${def.name}: ${result.outcome === "bust" ? "busted" : `+${result.cash.toLocaleString()}`}`, result.outcome === "bust" ? "bad" : "money", at);
  return result;
}

/**
 * Advances activities up to `at`. Completed runs pay out exactly once, and
 * queued activities start automatically when a slot frees (offline-eligible
 * ones only when `offline` is true).
 */
export function processActivities(state: GameState, at: number, rng: Rng, offline: boolean): ActivityResult[] {
  const results: ActivityResult[] = [];
  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 500) {
    progressed = false;
    const finished = state.activities.running.filter((r) => r.endsAt <= at).sort((a, b) => a.endsAt - b.endsAt);
    for (const run of finished) {
      const def = ACTIVITY_MAP[run.activityId];
      if (offline && def && !def.offline) continue; // waits for the player to be online
      state.activities.running = state.activities.running.filter((r) => r.instanceId !== run.instanceId);
      results.push(completeRun(state, run, run.endsAt, rng));
      progressed = true;
    }
    // start queued activities when slots are free
    while (state.activities.queue.length > 0 && state.activities.running.length < activitySlots(state)) {
      const nextId = state.activities.queue[0]!;
      const def = ACTIVITY_MAP[nextId];
      if (!def || (offline && !def.offline)) break;
      const startAt = Math.max(at - 0, state.activities.running.reduce((m, r) => Math.max(m, r.endsAt), 0) || at);
      const r = startActivity(state, nextId, offline ? Math.min(startAt, at) : at, rng);
      if (!r.ok) {
        state.activities.queue.shift();
        logEvent(state, `Queued "${def.name}" skipped: ${r.reason}`, "info", at);
        continue;
      }
      state.activities.queue.shift();
      progressed = r.run.endsAt <= at;
    }
  }
  return results;
}
