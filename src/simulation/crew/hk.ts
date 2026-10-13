import { BALANCE } from "@/data/balance";
import { CREW_MEMBERS, CREW_MEMBER_MAP, CREW_WORK_MAP, FACILITY_MAP, TRAINING_MAP } from "@/data/crew";
import type { CrewMemberDef, CrewWorkDef } from "@/data/types";
import type { CrewMemberState, CrewSkillSet, GameState, PayoutRecord } from "@/types/game";
import { addCash, chargeExpense, spendCash } from "@/simulation/economy/money";
import { adjustStat, logEvent } from "@/simulation/effects";
import { getMods, type Modifiers } from "@/simulation/modifiers";
import { checkAll } from "@/simulation/requirements";
import { effectiveRisk } from "@/simulation/risk/risk";
import { clamp } from "@/utils/format";
import { uid } from "@/utils/ids";
import type { Rng } from "@/utils/rng";

export type Result = { ok: true } | { ok: false; reason: string };

export function hkCapacity(state: GameState, mods: Modifiers = getMods(state)): number {
  if (!state.hk.unlocked || state.hk.hqLevel <= 0) return 0;
  return (BALANCE.hk.hqCapacity[state.hk.hqLevel] ?? 0) + mods.hkCapacity;
}

export function hkTierInfo(tier: number) {
  return BALANCE.hk.tierThresholds.find((t) => t.tier === tier) ?? BALANCE.hk.tierThresholds[0]!;
}

export function computeTier(state: GameState): number {
  let tier = state.hk.unlocked ? 1 : 0;
  for (const t of BALANCE.hk.tierThresholds) {
    if (state.hk.members.length >= t.members && state.hk.totalRevenue >= t.revenue) tier = Math.max(tier, t.tier);
  }
  return Math.max(state.hk.tier, tier);
}

export function nextTierProgress(state: GameState) {
  const next = BALANCE.hk.tierThresholds.find((t) => t.tier === state.hk.tier + 1);
  if (!next) return null;
  return { next, members: state.hk.members.length, revenue: state.hk.totalRevenue };
}

export function hqUpgradeCost(level: number): number | null {
  return BALANCE.hk.hqUpgradeCosts[level] ?? null;
}

export function upgradeHq(state: GameState, at: number): Result {
  if (!state.hk.unlocked) return { ok: false, reason: "HK not unlocked" };
  const nextLevel = state.hk.hqLevel + 1;
  const cost = hqUpgradeCost(nextLevel);
  if (cost === null) return { ok: false, reason: "Headquarters is fully upgraded" };
  const r = spendCash(state, cost, "hk", `HQ: ${BALANCE.hk.hqNames[nextLevel]}`, at);
  if (!r.ok) return r;
  state.hk.hqLevel = nextLevel;
  if (!state.hk.facilities.fac_workstations) state.hk.facilities.fac_workstations = 1;
  logEvent(state, `Headquarters upgraded: ${BALANCE.hk.hqNames[nextLevel]}.`, "good", at);
  for (const m of state.hk.members) m.morale = clamp(m.morale + 10, 0, 100);
  return { ok: true };
}

export function upgradeFacility(state: GameState, facilityId: string, at: number): Result {
  const fac = FACILITY_MAP[facilityId];
  if (!fac) return { ok: false, reason: "Unknown facility" };
  if (state.hk.hqLevel < fac.minHqLevel) return { ok: false, reason: `Requires HQ level ${fac.minHqLevel}` };
  const level = state.hk.facilities[facilityId] ?? 0;
  if (level >= fac.maxLevel) return { ok: false, reason: "Max level" };
  const cost = fac.costs[level + 1] ?? 0;
  const r = spendCash(state, cost, "hk", `${fac.name} level ${level + 1}`, at);
  if (!r.ok) return r;
  state.hk.facilities[facilityId] = level + 1;
  return { ok: true };
}

/** Candidates the player could recruit right now. */
export function refreshRecruitPool(state: GameState, at: number, rng: Rng, force = false): void {
  if (!state.hk.unlocked) return;
  if (!force && state.hk.poolRefreshedAt && at - state.hk.poolRefreshedAt < BALANCE.hk.poolRefreshMs && state.hk.recruitPool.length > 0) return;
  const hired = new Set(state.hk.members.map((m) => m.defId));
  const eligible = CREW_MEMBERS.filter((c) => !hired.has(c.id) && !state.hk.departed.includes(c.id) && checkAll(state, c.requirements));
  const size = BALANCE.hk.poolSize + Math.max(0, state.hk.tier - 1) * BALANCE.hk.recruitPoolBonusPerTier;
  const pool: string[] = [];
  const copy = [...eligible];
  while (pool.length < size && copy.length > 0) {
    const idx = Math.floor(rng.next() * copy.length);
    pool.push(copy.splice(idx, 1)[0]!.id);
  }
  state.hk.recruitPool = pool;
  state.hk.poolRefreshedAt = at;
}

export function recruitCost(state: GameState, def: CrewMemberDef, mods: Modifiers = getMods(state)): number {
  return Math.round(def.recruitCost * mods.recruitCost);
}

export function canRecruit(state: GameState, defId: string, sharePct: number): Result {
  const def = CREW_MEMBER_MAP[defId];
  if (!def) return { ok: false, reason: "Unknown recruit" };
  if (!state.hk.unlocked) return { ok: false, reason: "HK not unlocked" };
  if (state.hk.hqLevel <= 0) return { ok: false, reason: "Rent a headquarters first" };
  if (state.hk.members.length >= hkCapacity(state)) return { ok: false, reason: "Headquarters is full" };
  if (state.hk.members.some((m) => m.defId === defId)) return { ok: false, reason: "Already in your crew" };
  if (!state.hk.recruitPool.includes(defId)) return { ok: false, reason: "Not currently available" };
  if (!checkAll(state, def.requirements)) return { ok: false, reason: "Requirements not met" };
  if (sharePct < BALANCE.hk.minSharePct || sharePct > BALANCE.hk.maxSharePct) return { ok: false, reason: "Share must be between 10% and 70%" };
  if (sharePct < def.minSharePct) return { ok: false, reason: `${def.name} won't accept less than ${def.minSharePct}%` };
  if (state.player.cash < recruitCost(state, def)) return { ok: false, reason: "Not enough cash" };
  return { ok: true };
}

export function recruit(state: GameState, defId: string, sharePct: number, at: number): Result {
  const check = canRecruit(state, defId, sharePct);
  if (!check.ok) return check;
  const def = CREW_MEMBER_MAP[defId]!;
  const cost = recruitCost(state, def);
  const r = spendCash(state, cost, "hk", `Recruited ${def.name}`, at);
  if (!r.ok) return r;
  const loyalty = clamp(def.baseLoyalty + (sharePct - def.preferredSharePct) * 1.5, 10, 95);
  const member: CrewMemberState = {
    id: uid("crew"),
    defId,
    hiredAt: at,
    level: def.startLevel,
    xp: 0,
    skills: { ...def.skills },
    loyalty,
    morale: 70,
    contract: { sharePct, signedAt: at, version: 1 },
    contractHistory: [],
    assignment: { kind: "idle" },
    totalGross: 0,
    totalEarned: 0,
    unpaid: 0,
    trainingsCompleted: 0,
    cyclesCompleted: 0,
    complaints: 0,
  };
  state.hk.members.push(member);
  state.hk.recruitPool = state.hk.recruitPool.filter((id) => id !== defId);
  state.stats.recruitsHired += 1;
  logEvent(state, `${def.name} joined the Kingdom at ${sharePct}% share.`, "good", at);
  return { ok: true };
}

export function dismissMember(state: GameState, memberId: string, at: number): Result {
  const idx = state.hk.members.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, reason: "Not found" };
  const m = state.hk.members[idx]!;
  state.hk.members.splice(idx, 1);
  state.hk.departed.push(m.defId);
  for (const other of state.hk.members) other.loyalty = clamp(other.loyalty - 3, 0, 100);
  logEvent(state, `${CREW_MEMBER_MAP[m.defId]?.name ?? "A member"} left the Kingdom.`, "info", at);
  return { ok: true };
}

/** Renegotiation is explicit: only while idle, logged in contract history, and the member may refuse. */
export function renegotiateContract(state: GameState, memberId: string, sharePct: number, at: number): Result & { accepted?: boolean } {
  const m = state.hk.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: "Not found" };
  const def = CREW_MEMBER_MAP[m.defId];
  if (!def) return { ok: false, reason: "Unknown member" };
  if (m.assignment.kind !== "idle") return { ok: false, reason: "Contracts can only change while the member is not working or training" };
  if (sharePct < BALANCE.hk.minSharePct || sharePct > BALANCE.hk.maxSharePct) return { ok: false, reason: "Share must be between 10% and 70%" };
  if (sharePct === m.contract.sharePct) return { ok: false, reason: "No change" };
  if (sharePct < def.minSharePct) {
    m.loyalty = clamp(m.loyalty - 8, 0, 100);
    m.complaints += 1;
    logEvent(state, `${def.name} refused a ${sharePct}% contract. Loyalty dropped.`, "bad", at);
    return { ok: true, accepted: false };
  }
  const delta = sharePct - m.contract.sharePct;
  m.contractHistory.push({ ...m.contract });
  m.contract = { sharePct, signedAt: at, version: m.contract.version + 1 };
  m.loyalty = clamp(m.loyalty + delta * 1.5, 0, 100);
  m.morale = clamp(m.morale + Math.sign(delta) * 5, 0, 100);
  logEvent(state, `${def.name} signed a new contract at ${sharePct}%.`, "info", at);
  return { ok: true, accepted: true };
}

export function giveBonus(state: GameState, memberId: string, amount: number, at: number): Result {
  const m = state.hk.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: "Not found" };
  if (amount <= 0) return { ok: false, reason: "Invalid amount" };
  const r = spendCash(state, amount, "hk", `Bonus to ${CREW_MEMBER_MAP[m.defId]?.name}`, at);
  if (!r.ok) return r;
  const effect = Math.min(25, Math.round(amount / 5_000));
  m.loyalty = clamp(m.loyalty + effect, 0, 100);
  m.morale = clamp(m.morale + effect, 0, 100);
  m.totalEarned += amount;
  state.hk.totalPaidToCrew += amount;
  return { ok: true };
}

export function skillMatch(skills: CrewSkillSet, required: Partial<CrewSkillSet>): { ok: boolean; ratio: number } {
  const entries = Object.entries(required) as [keyof CrewSkillSet, number][];
  if (entries.length === 0) return { ok: true, ratio: 1 };
  let ok = true;
  let sum = 0;
  for (const [k, v] of entries) {
    const have = skills[k];
    if (have < v) ok = false;
    sum += have / Math.max(1, v);
  }
  return { ok, ratio: sum / entries.length };
}

export function canAssignWork(state: GameState, memberId: string, workId: string): Result {
  const m = state.hk.members.find((x) => x.id === memberId);
  const work = CREW_WORK_MAP[workId];
  if (!m) return { ok: false, reason: "Member not found" };
  if (!work) return { ok: false, reason: "Unknown work" };
  if (m.assignment.kind === "training") return { ok: false, reason: "Currently training" };
  if (state.hk.tier < work.minHkTier) return { ok: false, reason: `Requires HK tier ${work.minHkTier}` };
  if (work.requiredFacility && (state.hk.facilities[work.requiredFacility.id] ?? 0) < work.requiredFacility.level) {
    return { ok: false, reason: `Requires ${FACILITY_MAP[work.requiredFacility.id]?.name} level ${work.requiredFacility.level}` };
  }
  const match = skillMatch(m.skills, work.requiredSkills);
  if (!match.ok) return { ok: false, reason: "Skills too low for this work" };
  if (!work.legit && state.quests.flags.chidi_refused === true) return { ok: false, reason: "You walked away from this life" };
  return { ok: true };
}

export function assignWork(state: GameState, memberId: string, workId: string, at: number): Result {
  const check = canAssignWork(state, memberId, workId);
  if (!check.ok) return check;
  const m = state.hk.members.find((x) => x.id === memberId)!;
  m.assignment = { kind: "work", workId, startedAt: at, cycleStartedAt: at, cycles: 0 };
  return { ok: true };
}

export function canAssignTraining(state: GameState, memberId: string, programId: string): Result {
  const m = state.hk.members.find((x) => x.id === memberId);
  const program = TRAINING_MAP[programId];
  if (!m) return { ok: false, reason: "Member not found" };
  if (!program) return { ok: false, reason: "Unknown program" };
  if (m.assignment.kind === "training") return { ok: false, reason: "Already training" };
  if (program.requiredFacility && (state.hk.facilities[program.requiredFacility.id] ?? 0) < program.requiredFacility.level) {
    return { ok: false, reason: `Requires ${FACILITY_MAP[program.requiredFacility.id]?.name} level ${program.requiredFacility.level}` };
  }
  if (state.player.cash < program.cost) return { ok: false, reason: "Not enough cash" };
  return { ok: true };
}

export function assignTraining(state: GameState, memberId: string, programId: string, at: number): Result {
  const check = canAssignTraining(state, memberId, programId);
  if (!check.ok) return check;
  const m = state.hk.members.find((x) => x.id === memberId)!;
  const program = TRAINING_MAP[programId]!;
  const r = spendCash(state, program.cost, "hk", `Training: ${program.name}`, at);
  if (!r.ok) return r;
  const mods = getMods(state);
  const duration = Math.round(program.durationMs / mods.crewTrainingSpeed);
  m.assignment = { kind: "training", programId, startedAt: at, endsAt: at + duration };
  return { ok: true };
}

export function unassign(state: GameState, memberId: string): Result {
  const m = state.hk.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: "Not found" };
  if (m.assignment.kind === "training") return { ok: false, reason: "Training can't be interrupted" };
  m.assignment = { kind: "idle" };
  return { ok: true };
}

export interface CycleBreakdown {
  gross: number;
  operatingCost: number;
  net: number;
  memberShare: number;
  hkRevenue: number;
}

/** The one place crew revenue sharing is calculated. */
export function splitRevenue(gross: number, operatingCost: number, sharePct: number): CycleBreakdown {
  const g = Math.max(0, Math.round(gross));
  const c = Math.max(0, Math.round(operatingCost));
  const net = Math.max(0, g - c);
  const memberShare = Math.round((net * sharePct) / 100);
  const hkRevenue = net - memberShare;
  return { gross: g, operatingCost: c, net, memberShare, hkRevenue };
}

export function memberPerformance(state: GameState, m: CrewMemberState, work: CrewWorkDef, mods: Modifiers): number {
  const match = skillMatch(m.skills, work.requiredSkills);
  const skillFactor = Math.min(2, 0.6 + match.ratio * 0.5);
  const moraleFactor = 0.5 + m.morale / 200;
  const levelFactor = 1 + (m.level - 1) * 0.05;
  const groupBonus = state.hk.members.length >= 4 && state.hk.members.reduce((s, x) => s + x.morale, 0) / state.hk.members.length >= 70 ? 1.1 : 1;
  const overcrowded = state.hk.members.length > hkCapacity(state, mods) ? 0.75 : 1;
  return skillFactor * moraleFactor * levelFactor * groupBonus * overcrowded * mods.crewEfficiency;
}

export function expectedCycle(state: GameState, m: CrewMemberState, work: CrewWorkDef, mods = getMods(state)): CycleBreakdown {
  const perf = memberPerformance(state, m, work, mods);
  return splitRevenue(work.baseIncome * perf, work.operatingCost, m.contract.sharePct);
}

function resolveCycle(state: GameState, m: CrewMemberState, work: CrewWorkDef, at: number, rng: Rng, mods: Modifiers): PayoutRecord {
  const perf = memberPerformance(state, m, work, mods);
  let gross = work.baseIncome * perf * rng.range(0.85, 1.15);
  let outcome: PayoutRecord["outcome"] = "success";
  const successP = Math.min(0.98, work.successBase + (m.level - 1) * 0.01 + (m.morale - 60) / 400);
  if (!rng.chance(successP)) {
    outcome = "complication";
    gross *= 0.45;
  }
  if (work.risk > 0) {
    const p = effectiveRisk(work.risk, state.player.stats.heat, mods);
    if (rng.chance(p)) {
      outcome = "bust";
      gross = 0;
      adjustStat(state, "heat", 10);
      m.loyalty = clamp(m.loyalty - 10, 0, 100);
      m.morale = clamp(m.morale - 10, 0, 100);
      state.stats.busts += 1;
      logEvent(state, `${CREW_MEMBER_MAP[m.defId]?.name}'s ${work.name} cycle was busted. Heat up.`, "bad", at);
    } else {
      adjustStat(state, "heat", work.risk * 6);
    }
  }
  const split = splitRevenue(gross, work.operatingCost, m.contract.sharePct);
  if (split.gross < split.operatingCost) {
    chargeExpense(state, split.operatingCost - split.gross, "hk", `Operating deficit: ${work.name}`, at);
  }
  if (split.net <= 0) {
    m.unpaid += 1;
  } else {
    m.unpaid = 0;
  }
  m.totalGross += split.gross;
  m.totalEarned += split.memberShare;
  m.cyclesCompleted += 1;
  m.xp += work.xp;
  while (m.xp >= BALANCE.hk.levelXp(m.level)) {
    m.xp -= BALANCE.hk.levelXp(m.level);
    m.level += 1;
  }
  if (split.hkRevenue > 0) {
    addCash(state, split.hkRevenue, "crew", `${work.name} (${CREW_MEMBER_MAP[m.defId]?.nickname ?? "crew"})`, at);
    state.stats.crewIncome += split.hkRevenue;
  }
  state.hk.totalRevenue += split.hkRevenue;
  state.hk.totalPaidToCrew += split.memberShare;
  const record: PayoutRecord = { id: uid("pay"), at, memberId: m.id, workId: work.id, outcome, ...split };
  state.hk.payouts.unshift(record);
  if (state.hk.payouts.length > BALANCE.hk.payoutHistoryLimit) state.hk.payouts.length = BALANCE.hk.payoutHistoryLimit;
  return record;
}

/** Advances every member's work/training up to `at`. Each cycle is paid exactly once. */
export function processCrew(state: GameState, at: number, rng: Rng, mods: Modifiers): { payouts: PayoutRecord[]; trainings: string[] } {
  const payouts: PayoutRecord[] = [];
  const trainings: string[] = [];
  for (const m of state.hk.members) {
    const a = m.assignment;
    if (a.kind === "training") {
      if (a.endsAt <= at) {
        const program = TRAINING_MAP[a.programId];
        if (program) {
          m.skills[program.skill] = Math.min(10, m.skills[program.skill] + program.skillGain);
          if (program.id === "tr_freelance") m.skills.computing = Math.min(10, m.skills.computing + 1);
          m.xp += program.xpGain;
          while (m.xp >= BALANCE.hk.levelXp(m.level)) {
            m.xp -= BALANCE.hk.levelXp(m.level);
            m.level += 1;
          }
          m.trainingsCompleted += 1;
          state.stats.trainingsCompleted += 1;
          m.morale = clamp(m.morale + 5, 0, 100);
          trainings.push(`${CREW_MEMBER_MAP[m.defId]?.name ?? "Member"} finished ${program.name}`);
          logEvent(state, `${CREW_MEMBER_MAP[m.defId]?.name} completed ${program.name}.`, "good", a.endsAt);
        }
        m.assignment = { kind: "idle" };
      }
    } else if (a.kind === "work") {
      const work = CREW_WORK_MAP[a.workId];
      if (!work) {
        m.assignment = { kind: "idle" };
        continue;
      }
      let guard = 0;
      while (a.cycleStartedAt + work.cycleMs <= at && guard++ < 10_000) {
        const cycleEnd = a.cycleStartedAt + work.cycleMs;
        payouts.push(resolveCycle(state, m, work, cycleEnd, rng, mods));
        a.cycleStartedAt = cycleEnd;
        a.cycles += 1;
      }
    }
  }
  const newTier = computeTier(state);
  if (newTier > state.hk.tier) {
    state.hk.tier = newTier;
    logEvent(state, `Your organisation reached tier ${newTier}: ${hkTierInfo(newTier).name}!`, "good", at);
  }
  return { payouts, trainings };
}

/** Daily morale/loyalty bookkeeping. Returns messages about departures. */
export function processCrewDay(state: GameState, at: number, mods: Modifiers): string[] {
  const notes: string[] = [];
  const capacity = hkCapacity(state, mods);
  const overcrowded = state.hk.members.length > capacity;
  const poorFacilities = state.hk.hqLevel <= 1 ? 2 : 0;
  for (const m of [...state.hk.members]) {
    const def = CREW_MEMBER_MAP[m.defId];
    let morale = m.morale + (BALANCE.hk.moraleBaseline - m.morale) * 0.15 + mods.crewMorale - poorFacilities;
    if (overcrowded) morale -= BALANCE.hk.overcrowdMoralePenalty;
    if (m.assignment.kind === "idle") morale -= 2;
    m.morale = clamp(morale, 0, 100);
    if (m.unpaid > 0) m.loyalty -= BALANCE.hk.loyaltyDecayUnpaidPerDay;
    if (m.morale >= 70) m.loyalty += 1;
    else if (m.morale < 40) m.loyalty -= 2;
    if (m.morale < 35) m.complaints += 1;
    m.loyalty = clamp(m.loyalty, 0, 100);
    if (m.loyalty <= BALANCE.hk.loyaltyLeaveThreshold) {
      state.hk.members = state.hk.members.filter((x) => x.id !== m.id);
      state.hk.departed.push(m.defId);
      notes.push(`${def?.name ?? "A crew member"} left the Kingdom after being mistreated.`);
      logEvent(state, `${def?.name ?? "A crew member"} quit. Loyalty hit rock bottom.`, "bad", at);
    }
  }
  return notes;
}

export function memberDef(m: CrewMemberState): CrewMemberDef | undefined {
  return CREW_MEMBER_MAP[m.defId];
}
