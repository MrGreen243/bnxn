import { BALANCE } from "@/data/balance";
import { ITEM_MAP } from "@/data/items";
import type { Effect, GameState, ReputationKey } from "@/types/game";
import { addCash, spendCash } from "@/simulation/economy/money";
import { addSkillXp } from "@/simulation/progression/skills";
import { getMods, maxEnergy } from "@/simulation/modifiers";
import { clamp } from "@/utils/format";
import { uid } from "@/utils/ids";

export interface EffectRequests {
  openScreen?: string;
  startActivity?: string;
  startQuests: string[];
}

export function logEvent(state: GameState, text: string, kind: "info" | "good" | "bad" | "money", at: number) {
  state.events.log.unshift({ at, text, kind });
  if (state.events.log.length > BALANCE.events.logLimit) state.events.log.length = BALANCE.events.logLimit;
}

export function adjustStat(state: GameState, stat: ReputationKey, amount: number) {
  if (stat === "fame" && amount > 0) amount *= getMods(state).fameGain;
  const v = state.player.stats[stat] + amount;
  state.player.stats[stat] = Math.round(clamp(v, BALANCE.reputation.min, BALANCE.reputation.max) * 10) / 10;
}

export function addPost(state: GameState, text: string, author: string, at: number, kind: "player" | "npc" | "news" = "player") {
  state.social.posts.unshift({ id: uid("post"), at, author, text, likes: Math.round(50 + state.social.followers * 0.02), kind });
  if (state.social.posts.length > BALANCE.social.postLimit) state.social.posts.length = BALANCE.social.postLimit;
  state.social.lastPostAt = at;
}

export function addItem(state: GameState, itemId: string, qty = 1) {
  state.inventory.items[itemId] = (state.inventory.items[itemId] ?? 0) + qty;
}

/** Applies a list of data-driven effects to the state. Returns UI requests (screen opens, etc.). */
export function applyEffects(state: GameState, effects: Effect[] | undefined, at: number, _ctx: { memberId?: string } = {}): EffectRequests {
  const req: EffectRequests = { startQuests: [] };
  if (!effects) return req;
  for (const e of effects) {
    switch (e.type) {
      case "cash":
        if (e.amount >= 0) addCash(state, e.amount, "reward", e.note ?? "Reward", at);
        else {
          const r = spendCash(state, -e.amount, "expense", e.note ?? "Expense", at);
          if (!r.ok) {
            // Forced effects (events) can't bounce; take what's available.
            state.player.cash = 0;
          }
        }
        break;
      case "stat":
        adjustStat(state, e.stat, e.amount);
        break;
      case "xp":
        addSkillXp(state, e.skill, e.amount);
        break;
      case "item":
        addItem(state, e.itemId, e.qty ?? 1);
        break;
      case "flag":
        state.quests.flags[e.key] = e.value;
        break;
      case "startQuest":
        req.startQuests.push(e.questId);
        break;
      case "relationship":
        state.npcs.relationships[e.npcId] = clamp((state.npcs.relationships[e.npcId] ?? 0) + e.amount, -100, 100);
        break;
      case "unlockDistrict":
        if (!state.player.unlockedDistricts.includes(e.districtId)) state.player.unlockedDistricts.push(e.districtId);
        break;
      case "log":
        logEvent(state, e.text, e.kind ?? "info", at);
        break;
      case "energy":
        state.player.energy = clamp(state.player.energy + e.amount, 0, maxEnergy(state));
        break;
      case "hkUnlock":
        state.hk.unlocked = true;
        state.hk.tier = Math.max(1, state.hk.tier);
        state.quests.flags.hk_unlocked = true;
        break;
      case "crewLoyalty":
        for (const m of state.hk.members) {
          if (e.memberId && m.id !== e.memberId) continue;
          m.loyalty = clamp(m.loyalty + e.amount, 0, 100);
        }
        break;
      case "crewMorale":
        for (const m of state.hk.members) m.morale = clamp(m.morale + e.amount, 0, 100);
        break;
      case "restrict":
        state.activities.restrictions[e.category] = Math.max(state.activities.restrictions[e.category] ?? 0, at + e.ms);
        break;
      case "loseItem": {
        const id = state.inventory.equipped[e.slot];
        if (id && ITEM_MAP[id] && ITEM_MAP[id]!.tier > 1) {
          state.inventory.items[id] = Math.max(0, (state.inventory.items[id] ?? 1) - 1);
          if ((state.inventory.items[id] ?? 0) === 0) delete state.inventory.items[id];
          // fall back to the best remaining item in the slot
          const fallback = Object.keys(state.inventory.items)
            .map((i) => ITEM_MAP[i])
            .filter((it) => it && it.category === e.slot)
            .sort((a, b) => b!.tier - a!.tier)[0];
          state.inventory.equipped[e.slot] = fallback ? fallback.id : null;
        }
        break;
      }
      case "post":
        addPost(state, e.text, e.author === "player" || !e.author ? state.player.name : e.author, at, e.author === "player" || !e.author ? "player" : "npc");
        break;
      case "followers":
        state.social.followers = Math.max(0, state.social.followers + e.amount);
        break;
      case "businessDisruption":
        for (const b of state.businesses.owned) b.lastEventAt = at + e.hours * 3_600_000;
        break;
      case "openScreen":
        req.openScreen = e.screen;
        break;
      case "startActivity":
        req.startActivity = e.activityId;
        break;
      default:
        break;
    }
  }
  return req;
}
