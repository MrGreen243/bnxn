import { BALANCE } from "@/data/balance";
import type { ActivityDef } from "@/data/types";
import type { GameState } from "@/types/game";
import { chargeExpense } from "@/simulation/economy/money";
import { adjustStat, applyEffects, logEvent } from "@/simulation/effects";
import { getMods, type Modifiers } from "@/simulation/modifiers";
import type { Rng } from "@/utils/rng";

/** Transparent risk formula: base risk scaled by heat, reduced by perks/facilities. */
export function effectiveRisk(baseRisk: number, heat: number, mods: Modifiers): number {
  if (baseRisk <= 0) return 0;
  const heatFactor = 1 + heat / 100;
  return Math.max(0.01, Math.min(0.95, baseRisk * heatFactor - mods.riskReduction));
}

export function activityRisk(state: GameState, def: ActivityDef, mods = getMods(state)): number {
  return effectiveRisk(def.risk, state.player.stats.heat, mods);
}

export function isConfined(state: GameState, at: number): boolean {
  return state.risk.confinedUntil > at;
}

/** Applies the consequences of a bust. Returns a description for the player. */
export function applyBust(state: GameState, def: ActivityDef, at: number, rng: Rng): string {
  state.stats.busts += 1;
  state.risk.bustCount += 1;
  const lossPct = BALANCE.activities.bustCashLossPct;
  const cashLoss = Math.round(state.player.cash * lossPct);
  const fine = Math.round(BALANCE.activities.bustFineBase * (1 + def.risk * 10));
  chargeExpense(state, cashLoss, "bust", `Cash lost: ${def.name}`, at);
  chargeExpense(state, fine, "bust", `Fine after ${def.name}`, at);
  adjustStat(state, "heat", 15);
  adjustStat(state, "credibility", -6);
  adjustStat(state, "streetRep", -3);
  const parts = [`Lost ${cashLoss.toLocaleString()} cash and paid a ${fine.toLocaleString()} fine.`];
  applyEffects(state, [{ type: "restrict", category: "risky", ms: BALANCE.activities.bustRestrictionMs }], at);
  parts.push("Risky work restricted for a while.");
  if (rng.chance(0.4)) {
    applyEffects(state, [{ type: "loseItem", slot: "computer" }], at);
    parts.push("Your computer was seized.");
  }
  for (const m of state.hk.members) m.loyalty = Math.max(0, m.loyalty - 6);
  if (state.player.stats.heat >= 70 && !state.risk.investigation) {
    state.risk.investigation = { id: `inv_${at}`, startedAt: at, stage: 1 };
    parts.push("An investigation has been opened.");
    logEvent(state, "An investigation has been opened into your activities.", "bad", at);
  }
  state.risk.lastConsequence = parts.join(" ");
  logEvent(state, `Bust: ${def.name}. ${parts.join(" ")}`, "bad", at);
  return parts.join(" ");
}

/** Called daily: heat decays, investigations progress or close. */
export function processRiskDay(state: GameState, at: number, mods: Modifiers): string[] {
  const notes: string[] = [];
  const decay = BALANCE.activities.heatDecayPerDay * mods.heatDecay;
  adjustStat(state, "heat", -decay);
  const inv = state.risk.investigation;
  if (inv) {
    if (state.player.stats.heat < 30) {
      state.risk.investigation = null;
      state.quests.flags.heat_cooled = true;
      state.quests.flags.recovered = true;
      notes.push("The investigation was closed. Keep it clean.");
      logEvent(state, "The investigation into you was closed for lack of evidence.", "good", at);
    } else {
      inv.stage += 1;
      if (inv.stage >= 4 && !isConfined(state, at)) {
        // Court outcome: a setback, not a game over.
        const seized = Math.round(state.player.cash * 0.5);
        chargeExpense(state, seized, "court", "Assets frozen by court order", at);
        state.risk.confinedUntil = at + 45 * 60_000;
        state.risk.setbacks += 1;
        state.risk.investigation = null;
        adjustStat(state, "heat", -40);
        adjustStat(state, "fame", -10);
        adjustStat(state, "credibility", -15);
        for (const m of state.hk.members) m.loyalty = Math.max(0, m.loyalty - 15);
        notes.push(`Court ruling: ${seized.toLocaleString()} seized and 45 minutes of confinement. Activities are paused until release.`);
        logEvent(state, "Court ruling: assets seized and you're confined for a while. A setback, not the end.", "bad", at);
        state.quests.flags.recovered = true;
      }
    }
  }
  if (state.player.stats.heat < 30 && state.quests.flags.heat_cooled === undefined && state.quests.active.q_heat) state.quests.flags.heat_cooled = true;
  return notes;
}
