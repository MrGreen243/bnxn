import { BALANCE } from "@/data/balance";
import { EVENTS, EVENT_MAP } from "@/data/events";
import type { GameState } from "@/types/game";
import { applyEffects, logEvent, type EffectRequests } from "@/simulation/effects";
import { checkAll } from "@/simulation/requirements";
import { uid } from "@/utils/ids";
import type { Rng } from "@/utils/rng";

export function eligibleEvents(state: GameState) {
  return EVENTS.filter((e) => {
    if (e.maxOccurrences !== undefined && (state.events.seenCounts[e.id] ?? 0) >= e.maxOccurrences) return false;
    if (state.events.pending.some((p) => p.defId === e.id)) return false;
    return checkAll(state, e.requirements);
  });
}

export function scheduleNextEvent(state: GameState, at: number, rng: Rng) {
  state.events.nextEventAt = at + rng.range(BALANCE.events.minIntervalMs, BALANCE.events.maxIntervalMs);
}

/** Spawns a pending event if one is due. Returns the def id or null. */
export function maybeSpawnEvent(state: GameState, at: number, rng: Rng): string | null {
  if (at < state.events.nextEventAt) return null;
  scheduleNextEvent(state, at, rng);
  if (state.events.pending.length >= 3) return null;
  const pool = eligibleEvents(state);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng.next() * total;
  let chosen = pool[pool.length - 1]!;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) {
      chosen = e;
      break;
    }
  }
  state.events.pending.push({ id: uid("ev"), defId: chosen.id, createdAt: at, context: {} });
  state.events.seenCounts[chosen.id] = (state.events.seenCounts[chosen.id] ?? 0) + 1;
  return chosen.id;
}

export function resolveEvent(state: GameState, pendingId: string, choiceIndex: number, at: number): { ok: boolean; reason?: string; text?: string; requests?: EffectRequests } {
  const idx = state.events.pending.findIndex((p) => p.id === pendingId);
  if (idx < 0) return { ok: false, reason: "Event not found" };
  const pending = state.events.pending[idx]!;
  const def = EVENT_MAP[pending.defId];
  if (!def) {
    state.events.pending.splice(idx, 1);
    return { ok: true, text: "This event no longer exists." };
  }
  const choice = def.choices[choiceIndex];
  if (!choice) return { ok: false, reason: "Invalid choice" };
  if (!checkAll(state, choice.requirements)) return { ok: false, reason: "You can't afford that choice" };
  state.events.pending.splice(idx, 1);
  const requests = applyEffects(state, choice.effects, at);
  logEvent(state, `${def.title}: ${choice.resultText}`, "info", at);
  return { ok: true, text: choice.resultText, requests };
}

/** Offline: apply the default (safe) choice, falling back to the first affordable one. */
export function autoResolveEvent(state: GameState, pendingId: string, at: number): string | null {
  const pending = state.events.pending.find((p) => p.id === pendingId);
  if (!pending) return null;
  const def = EVENT_MAP[pending.defId];
  if (!def) {
    state.events.pending = state.events.pending.filter((p) => p.id !== pendingId);
    return null;
  }
  const order = [def.offlineDefault, ...def.choices.map((_, i) => i)];
  for (const i of order) {
    const c = def.choices[i];
    if (c && checkAll(state, c.requirements)) {
      const r = resolveEvent(state, pendingId, i, at);
      return r.ok ? `${def.title} — ${c.label}: ${c.resultText}` : null;
    }
  }
  state.events.pending = state.events.pending.filter((p) => p.id !== pendingId);
  return null;
}
