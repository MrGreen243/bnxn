/**
 * The central simulation engine. `simulate` advances a game state from
 * `state.meta.lastSimulatedAt` to `now` in fixed deterministic steps. It is
 * used both for the live 1-second tick and for offline catch-up, so every
 * income source is accounted for exactly once.
 */
import { BALANCE } from "@/data/balance";
import { PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import type { GameState, OfflineSummary } from "@/types/game";
import { accrueBusinesses } from "@/simulation/businesses/businesses";
import { processCrew, processCrewDay, refreshRecruitPool } from "@/simulation/crew/hk";
import { ensureDailyObjectives, bumpDaily } from "@/simulation/daily";
import { chargeExpense } from "@/simulation/economy/money";
import { adjustStat, logEvent } from "@/simulation/effects";
import { autoResolveEvent, maybeSpawnEvent, scheduleNextEvent } from "@/simulation/events/events";
import { processActivities } from "@/simulation/idle/activities";
import { tickInvestments } from "@/simulation/investments";
import { getMods, maxEnergy, offlineCapMs } from "@/simulation/modifiers";
import { evaluateAchievements } from "@/simulation/progression/achievements";
import { evaluateQuests } from "@/simulation/progression/quests";
import { autoUnlockPerks } from "@/simulation/progression/skills";
import { processRiskDay } from "@/simulation/risk/risk";
import { Rng } from "@/utils/rng";

export interface SimulateOptions {
  /** true when catching up after the app was closed. */
  offline: boolean;
}

export interface SimulateReport {
  elapsedMs: number;
  simulatedMs: number;
  capped: boolean;
  clockWarning: boolean;
  cashEarned: number;
  expenses: number;
  activitiesCompleted: number;
  businessIncome: number;
  crewIncome: number;
  crewPaid: number;
  trainingsCompleted: number;
  events: string[];
  questUpdates: ReturnType<typeof evaluateQuests>;
  achievements: string[];
  perks: string[];
  spawnedEvent: boolean;
}

export function dailyLivingCost(state: GameState): number {
  const mods = getMods(state);
  const prop = PROPERTY_MAP[state.properties.current];
  let cost = BALANCE.living.foodPerDay;
  if (prop) cost += (prop.rentPerDay + prop.upkeepPerDay) * mods.rentDiscount;
  if (state.vehicles.current) cost += VEHICLE_MAP[state.vehicles.current]?.upkeepPerDay ?? 0;
  else cost += BALANCE.living.transportPerDayNoVehicle;
  return Math.round(cost);
}

function emptyReport(): SimulateReport {
  return { elapsedMs: 0, simulatedMs: 0, capped: false, clockWarning: false, cashEarned: 0, expenses: 0, activitiesCompleted: 0, businessIncome: 0, crewIncome: 0, crewPaid: 0, trainingsCompleted: 0, events: [], questUpdates: [], achievements: [], perks: [], spawnedEvent: false };
}

/** Mutates `state` in place and returns a report of what happened. */
export function simulate(state: GameState, now: number, opts: SimulateOptions): SimulateReport {
  const report = emptyReport();
  const from = state.meta.lastSimulatedAt;
  let elapsed = now - from;
  if (!Number.isFinite(elapsed) || elapsed <= 0) {
    // clock went backwards: never simulate negative time, just resync.
    if (elapsed < 0) {
      state.meta.lastSimulatedAt = now;
      report.clockWarning = true;
    }
    return report;
  }
  report.elapsedMs = elapsed;
  if (elapsed > BALANCE.offline.suspiciousJumpHours * 3_600_000) report.clockWarning = true;
  const cap = opts.offline ? offlineCapMs(state) : Infinity;
  if (elapsed > cap) {
    elapsed = cap;
    report.capped = true;
  }
  const mods = getMods(state);
  const rng = new Rng(state.meta.rngState);
  const cashBefore = state.player.cash;
  const businessBefore = state.stats.businessIncome;
  const crewBefore = state.stats.crewIncome;
  const paidBefore = state.hk.totalPaidToCrew;
  const step = opts.offline ? BALANCE.offline.stepMs : Math.min(BALANCE.offline.stepMs, elapsed);
  let t = from;
  const end = from + elapsed;
  let guard = 0;
  let spawnedThisRun = 0;
  while (t < end && guard++ < 100_000) {
    const dt = Math.min(step, end - t);
    t += dt;
    // --- energy ---
    const maxE = maxEnergy(state, mods);
    state.player.energy = Math.min(maxE, state.player.energy + (BALANCE.energy.regenPerHour * mods.energyRegen * dt) / 3_600_000);
    // --- businesses (net income accrues; deficits are charged) ---
    const biz = accrueBusinesses(state, dt, t, mods);
    if (biz.expenses > 0) {
      const { paid } = chargeExpense(state, biz.expenses, "business", "Business operating deficit", t);
      report.expenses += paid;
    }
    // --- activities & crew (both pay out only on completion) ---
    const results = processActivities(state, t, rng, opts.offline);
    report.activitiesCompleted += results.length;
    if (results.length) bumpDaily(state, "activities", results.length);
    const crew = processCrew(state, t, rng, mods);
    report.trainingsCompleted += crew.trainings.length;
    if (crew.trainings.length) {
      bumpDaily(state, "train", crew.trainings.length);
      report.events.push(...crew.trainings);
    }
    // --- investments ---
    tickInvestments(state, t, rng, mods);
    // --- day boundary: living costs, heat decay, morale ---
    state.meta.dayProgressMs += dt;
    while (state.meta.dayProgressMs >= BALANCE.dayLengthMs) {
      state.meta.dayProgressMs -= BALANCE.dayLengthMs;
      state.meta.gameDay += 1;
      state.stats.daysSurvived += 1;
      const living = dailyLivingCost(state);
      const { paid, shortfall } = chargeExpense(state, living, "living", `Day ${state.meta.gameDay}: rent, food & transport`, t);
      report.expenses += paid;
      if (shortfall > 0) {
        adjustStat(state, "credibility", -1);
        logEvent(state, `You couldn't cover living costs (short ${shortfall.toLocaleString()}). Credibility suffered.`, "bad", t);
        report.events.push("You fell behind on living costs.");
      }
      report.events.push(...processRiskDay(state, t, mods));
      report.events.push(...processCrewDay(state, t, mods));
      if (state.player.stats.lifestyle > 0 && rng.chance(0.1)) adjustStat(state, "lifestyle", -1);
    }
    // --- events (offline: at most a few, auto-resolved with their safe default) ---
    if (opts.offline && spawnedThisRun >= BALANCE.events.offlineMaxEvents) {
      if (t >= state.events.nextEventAt) scheduleNextEvent(state, t, rng);
    } else {
      const spawned = maybeSpawnEvent(state, t, rng);
      if (spawned) {
        report.spawnedEvent = true;
        spawnedThisRun += 1;
        if (opts.offline) {
          const pending = state.events.pending[state.events.pending.length - 1];
          if (pending) {
            const text = autoResolveEvent(state, pending.id, t);
            if (text) report.events.push(`Event: ${text}`);
          }
        }
      }
    }
    refreshRecruitPool(state, t, rng);
  }
  state.meta.lastSimulatedAt = now;
  state.meta.rngState = rng.state;
  if (!opts.offline) state.stats.playtimeMs += report.elapsedMs;
  report.simulatedMs = elapsed;
  report.businessIncome = state.stats.businessIncome - businessBefore;
  report.crewIncome = state.stats.crewIncome - crewBefore;
  report.crewPaid = state.hk.totalPaidToCrew - paidBefore;
  report.cashEarned = Math.max(0, state.player.cash - cashBefore + report.expenses);
  if (report.cashEarned > 0) bumpDaily(state, "earn", report.cashEarned);
  ensureDailyObjectives(state, now);
  report.perks = autoUnlockPerks(state);
  report.questUpdates = evaluateQuests(state, now);
  report.achievements = evaluateAchievements(state, now);
  return report;
}

export function reportToSummary(report: SimulateReport, from: number, to: number): OfflineSummary {
  return {
    from,
    to,
    elapsedMs: report.elapsedMs,
    cappedMs: report.simulatedMs,
    cashEarned: report.cashEarned,
    expenses: report.expenses,
    activitiesCompleted: report.activitiesCompleted,
    businessIncome: report.businessIncome,
    crewIncome: report.crewIncome,
    crewPaid: report.crewPaid,
    trainingsCompleted: report.trainingsCompleted,
    events: report.events.slice(0, 12),
    clockWarning: report.clockWarning,
  };
}

/** Runs the post-change bookkeeping every action should trigger. */
export function settle(state: GameState, at: number): { quests: ReturnType<typeof evaluateQuests>; achievements: string[]; perks: string[] } {
  const perks = autoUnlockPerks(state);
  const quests = evaluateQuests(state, at);
  const achievements = evaluateAchievements(state, at);
  return { quests, achievements, perks };
}
