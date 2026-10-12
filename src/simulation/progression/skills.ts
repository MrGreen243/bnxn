import { BALANCE } from "@/data/balance";
import { ALL_PERKS } from "@/data/skills";
import type { GameState, SkillId } from "@/types/game";
import { getMods } from "@/simulation/modifiers";

export function xpForLevel(level: number): number {
  return BALANCE.skills.xpForLevel(level);
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (level < BALANCE.skills.maxLevel && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, into: remaining, needed: level >= BALANCE.skills.maxLevel ? 0 : xpForLevel(level) };
}

export interface XpGain {
  skill: SkillId;
  amount: number;
  levelsGained: number;
  newLevel: number;
}

/** Awards XP (already including modifiers if `raw` is false) and returns the gain. */
export function addSkillXp(state: GameState, skill: SkillId, amount: number, opts: { raw?: boolean } = {}): XpGain {
  const mods = opts.raw ? null : getMods(state);
  const actual = Math.max(0, Math.round(amount * (mods ? mods.skillXp : 1)));
  const entry = state.skills.levels[skill] ?? { xp: 0, level: 1 };
  const before = levelFromXp(entry.xp).level;
  entry.xp += actual;
  const after = levelFromXp(entry.xp).level;
  entry.level = after;
  state.skills.levels[skill] = entry;
  if (after >= 10) state.quests.flags.any_skill_10 = true;
  if (after >= 25) state.quests.flags.any_skill_25 = true;
  return { skill, amount: actual, levelsGained: after - before, newLevel: after };
}

export function availablePerks(state: GameState) {
  return ALL_PERKS.filter((p) => !state.skills.perks.includes(p.id));
}

export function canUnlockPerk(state: GameState, perkId: string): { ok: boolean; reason?: string } {
  const perk = ALL_PERKS.find((p) => p.id === perkId);
  if (!perk) return { ok: false, reason: "Unknown perk" };
  if (state.skills.perks.includes(perkId)) return { ok: false, reason: "Already unlocked" };
  if ((state.skills.levels[perk.skill]?.level ?? 1) < perk.level) return { ok: false, reason: `Requires level ${perk.level}` };
  for (const req of perk.requires ?? []) if (!state.skills.perks.includes(req)) return { ok: false, reason: "Requires previous perk" };
  return { ok: true };
}

export function unlockPerk(state: GameState, perkId: string): { ok: boolean; reason?: string } {
  const check = canUnlockPerk(state, perkId);
  if (!check.ok) return check;
  state.skills.perks.push(perkId);
  return { ok: true };
}

/** Perks unlock automatically once their level is reached — no manual click needed. */
export function autoUnlockPerks(state: GameState): string[] {
  const unlocked: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const perk of ALL_PERKS) {
      if (state.skills.perks.includes(perk.id)) continue;
      if (canUnlockPerk(state, perk.id).ok) {
        state.skills.perks.push(perk.id);
        unlocked.push(perk.id);
        changed = true;
      }
    }
  }
  return unlocked;
}
