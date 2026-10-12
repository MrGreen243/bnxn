import { create } from "zustand";
import type { Avatar, BackgroundId, GameState } from "@/types/game";
import { createNewGame } from "@/simulation/initialState";
import { reportToSummary, settle, simulate, type SimulateReport } from "@/simulation/engine";
import { BALANCE } from "@/data/balance";
import { ACHIEVEMENT_MAP } from "@/data/achievements";
import { PERK_MAP } from "@/data/skills";
import { DISTRICT_MAP } from "@/data/districts";
import { deleteSlot, listSlots, loadSlot, newSlotId, parseImportedSave, saveSlot, serializeSave, type LoadResult, type SaveResult, type SlotSummary } from "@/persistence/saveManager";
import { storageAvailable } from "@/persistence/db";
import { Rng } from "@/utils/rng";
import { useUiStore } from "@/store/uiStore";
import { formatNaira } from "@/utils/format";
import { ACTIVITY_MAP } from "@/data/activities";
import { refreshRecruitPool } from "@/simulation/crew/hk";

export type GamePhase = "boot" | "menu" | "playing";

export interface ActContext {
  now: number;
  rng: Rng;
}

interface GameStore {
  game: GameState | null;
  phase: GamePhase;
  slots: SlotSummary[];
  storageOk: boolean;
  lastSaveAt: number;
  saveError: string | null;
  dirty: boolean;
  saving: boolean;
  init: () => Promise<void>;
  refreshSlots: () => Promise<void>;
  newGame: (opts: { name: string; avatar: Avatar; background: BackgroundId }) => Promise<void>;
  continueSlot: (slotId: string) => Promise<LoadResult>;
  loadState: (state: GameState, notes?: string[]) => void;
  saveNow: () => Promise<SaveResult>;
  exitToMenu: () => Promise<void>;
  exportCurrent: () => string | null;
  importSave: (json: string, mode: "new" | "overwrite") => Promise<LoadResult>;
  deleteSlot: (slotId: string) => Promise<void>;
  resetCurrent: () => Promise<void>;
  tick: () => void;
  catchUp: () => SimulateReport | null;
  /** Runs a mutation on a cloned state, settles quests/achievements, and commits it. */
  act: <R>(fn: (state: GameState, ctx: ActContext) => R, opts?: { silent?: boolean }) => R;
  replaceState: (state: GameState) => void;
  setDirty: () => void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function announceSettle(result: ReturnType<typeof settle>, game: GameState) {
  const ui = useUiStore.getState();
  for (const q of result.quests) {
    if (q.kind === "completed") ui.toast(`Quest complete: ${q.title}`, "good");
    else if (q.kind === "started") ui.toast(`New quest: ${q.title}`, "info");
    else ui.toast(`${q.title}: ${q.text}`, "info");
  }
  for (const a of result.achievements) ui.toast(`Achievement: ${ACHIEVEMENT_MAP[a]?.name ?? a}`, "good");
  for (const p of result.perks) ui.toast(`Perk unlocked: ${PERK_MAP[p]?.name ?? p}`, "good");
  void game;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  phase: "boot",
  slots: [],
  storageOk: true,
  lastSaveAt: 0,
  saveError: null,
  dirty: false,
  saving: false,

  init: async () => {
    const ok = await storageAvailable();
    const slots = ok ? await listSlots() : [];
    set({ storageOk: ok, slots, phase: "menu" });
  },

  refreshSlots: async () => {
    set({ slots: await listSlots() });
  },

  newGame: async ({ name, avatar, background }) => {
    const now = Date.now();
    const state = createNewGame({ slotId: newSlotId(), name: name.trim().slice(0, 24) || "Hustler", avatar, background, now });
    const district = DISTRICT_MAP[state.player.districtId]!;
    state.player.position = { x: district.map.spawn.x * 16 + 8, y: district.map.spawn.y * 16 + 8 };
    const rng = new Rng(state.meta.rngState);
    refreshRecruitPool(state, now, rng, true);
    state.meta.rngState = rng.state;
    settle(state, now);
    get().loadState(state);
    await get().saveNow();
  },

  continueSlot: async (slotId) => {
    const result = await loadSlot(slotId);
    if (result.ok) get().loadState(result.state, result.notes);
    return result;
  },

  loadState: (state, notes = []) => {
    const now = Date.now();
    const from = state.meta.lastSimulatedAt;
    const report = simulate(state, now, { offline: true });
    state.meta.lastActiveAt = now;
    if (report.elapsedMs >= BALANCE.offline.summaryMinMs) {
      state.offline.lastSummary = reportToSummary(report, from, now);
      useUiStore.getState().setOfflineSummaryOpen(true);
    }
    set({ game: state, phase: "playing", dirty: true, saveError: null });
    const ui = useUiStore.getState();
    for (const n of notes) ui.toast(n, "info");
  },

  saveNow: async () => {
    const game = get().game;
    if (!game) return { ok: false, error: "No game loaded" };
    if (get().saving) return { ok: true, savedAt: get().lastSaveAt };
    set({ saving: true });
    const now = Date.now();
    const result = await saveSlot(game, now);
    if (result.ok) set({ lastSaveAt: now, dirty: false, saveError: null, saving: false, game: { ...game, meta: { ...game.meta, lastSavedAt: now } } });
    else set({ saveError: result.error, saving: false });
    return result;
  },

  exitToMenu: async () => {
    await get().saveNow();
    set({ game: null, phase: "menu", slots: await listSlots() });
    useUiStore.setState({ screen: null, dialogue: null, actionSheet: null, prompt: null, phoneOpen: false });
  },

  exportCurrent: () => {
    const game = get().game;
    return game ? serializeSave(game) : null;
  },

  importSave: async (json, mode) => {
    const result = parseImportedSave(json);
    if (!result.ok) return result;
    const state = result.state;
    if (mode === "new") state.meta.slotId = newSlotId();
    const saved = await saveSlot(state, Date.now());
    if (!saved.ok) return { ok: false, error: saved.error };
    set({ slots: await listSlots() });
    return result;
  },

  deleteSlot: async (slotId) => {
    await deleteSlot(slotId);
    set({ slots: await listSlots() });
  },

  resetCurrent: async () => {
    const game = get().game;
    if (game) await deleteSlot(game.meta.slotId);
    set({ game: null, phase: "menu", slots: await listSlots(), dirty: false });
    useUiStore.setState({ screen: null, dialogue: null, actionSheet: null, prompt: null, phoneOpen: false });
  },

  tick: () => {
    const game = get().game;
    if (!game) return;
    const now = Date.now();
    if (now - game.meta.lastSimulatedAt < 250) return;
    const next = clone(game);
    const report = simulate(next, now, { offline: false });
    next.meta.lastActiveAt = now;
    const ui = useUiStore.getState();
    if (report.activitiesCompleted > 0) {
      const recent = next.activities.results.slice(0, report.activitiesCompleted);
      for (const r of recent) {
        const name = ACTIVITY_MAP[r.activityId]?.name ?? "Activity";
        if (r.outcome === "bust") ui.toast(`${name}: busted! ${r.message}`, "bad");
        else {
          if (r.cash > 0) ui.float(`+${formatNaira(r.cash)}`, "money");
          ui.toast(`${name} done${r.cash > 0 ? `: ${formatNaira(r.cash)}` : ""}`, "money");
        }
      }
    }
    for (const e of report.events) ui.toast(e, "info");
    announceSettle({ quests: report.questUpdates, achievements: report.achievements, perks: report.perks }, next);
    const changed = report.activitiesCompleted > 0 || report.questUpdates.length > 0 || report.achievements.length > 0 || report.spawnedEvent || report.trainingsCompleted > 0 || report.crewIncome > 0;
    set({ game: next, dirty: get().dirty || changed });
  },

  catchUp: () => {
    const game = get().game;
    if (!game) return null;
    const now = Date.now();
    const from = game.meta.lastSimulatedAt;
    const next = clone(game);
    const report = simulate(next, now, { offline: true });
    next.meta.lastActiveAt = now;
    if (report.elapsedMs >= BALANCE.offline.summaryMinMs) {
      next.offline.lastSummary = reportToSummary(report, from, now);
      useUiStore.getState().setOfflineSummaryOpen(true);
    }
    set({ game: next, dirty: true });
    return report;
  },

  act: (fn, opts = {}) => {
    const game = get().game;
    if (!game) throw new Error("No game loaded");
    const now = Date.now();
    const next = clone(game);
    const rng = new Rng(next.meta.rngState);
    const result = fn(next, { now, rng });
    next.meta.rngState = rng.state;
    const settled = settle(next, now);
    if (!opts.silent) announceSettle(settled, next);
    set({ game: next, dirty: true });
    return result;
  },

  replaceState: (state) => set({ game: state, dirty: true }),
  setDirty: () => set({ dirty: true }),
}));

/** Convenience selector hooks. */
export const useGame = () => useGameStore((s) => s.game);
export function requireGame(): GameState {
  const g = useGameStore.getState().game;
  if (!g) throw new Error("No game loaded");
  return g;
}
