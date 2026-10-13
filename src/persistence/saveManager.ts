import { APP_VERSION } from "@/data/version";
import { DISTRICT_MAP } from "@/data/districts";
import { netWorth } from "@/simulation/economy/money";
import { exportedSaveSchema, validateGameState } from "@/schemas/save";
import type { GameState } from "@/types/game";
import { getDb, type SaveRecord } from "@/persistence/db";
import { migrateSave, reconcileContent } from "@/persistence/migrations";
import { uid } from "@/utils/ids";

export type SaveResult = { ok: true; savedAt: number } | { ok: false; error: string };
export type LoadResult = { ok: true; state: GameState; notes: string[] } | { ok: false; error: string };

export interface SlotSummary {
  slotId: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  summary: SaveRecord["summary"];
}

export function newSlotId(): string {
  return uid("slot");
}

/** Validates, migrates and repairs an untrusted save object. */
export function prepareLoadedState(raw: unknown): LoadResult {
  const migrated = migrateSave(raw);
  if (!migrated.ok) return migrated;
  const notes: string[] = [];
  if (migrated.migratedFrom !== null) notes.push(`Migrated save from version ${migrated.migratedFrom}.`);
  const reconciled = reconcileContent(migrated.raw);
  if (reconciled.removed.length) notes.push(`Removed ${reconciled.removed.length} reference(s) to content that no longer exists.`);
  const validated = validateGameState(reconciled.raw);
  if (!validated.ok) return { ok: false, error: `Save rejected: ${validated.error}` };
  return { ok: true, state: validated.state, notes };
}

export async function listSlots(): Promise<SlotSummary[]> {
  try {
    const rows = await getDb().saves.orderBy("updatedAt").reverse().toArray();
    return rows.map((r) => ({ slotId: r.slotId, name: r.name, updatedAt: r.updatedAt, createdAt: r.createdAt, summary: r.summary }));
  } catch {
    return [];
  }
}

export async function loadSlot(slotId: string): Promise<LoadResult> {
  try {
    const row = await getDb().saves.get(slotId);
    if (!row) return { ok: false, error: "Save slot not found" };
    return prepareLoadedState(row.data);
  } catch (e) {
    return { ok: false, error: `Could not read storage: ${(e as Error).message}` };
  }
}

/**
 * Persists a state. The state is validated first so a corrupt in-memory
 * object can never overwrite a good save on disk.
 */
export async function saveSlot(state: GameState, now: number): Promise<SaveResult> {
  const validated = validateGameState({ ...state, meta: { ...state.meta, lastSavedAt: now } });
  if (!validated.ok) return { ok: false, error: `Refusing to save an invalid state: ${validated.error}` };
  const data = validated.state;
  const record: SaveRecord = {
    slotId: data.meta.slotId,
    name: data.player.name,
    updatedAt: now,
    createdAt: data.meta.createdAt,
    version: data.version,
    data,
    summary: {
      cash: data.player.cash,
      netWorth: netWorth(data),
      district: DISTRICT_MAP[data.player.districtId]?.name ?? data.player.districtId,
      day: data.meta.gameDay,
      playtimeMs: data.stats.playtimeMs,
    },
  };
  try {
    await getDb().saves.put(record);
    return { ok: true, savedAt: now };
  } catch (e) {
    const err = e as Error;
    const quota = /quota|QuotaExceeded/i.test(err.name + err.message);
    return { ok: false, error: quota ? "Browser storage is full. Free space or export your save." : `Could not write save: ${err.message}` };
  }
}

export async function deleteSlot(slotId: string): Promise<void> {
  await getDb().saves.delete(slotId);
}

export function serializeSave(state: GameState): string {
  return JSON.stringify({ app: "street-tycoon", exportedAt: new Date().toISOString(), appVersion: APP_VERSION, state }, null, 2);
}

export function parseImportedSave(json: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "File is not valid JSON" };
  }
  const wrapped = exportedSaveSchema.safeParse(parsed);
  const raw = wrapped.success ? wrapped.data.state : parsed;
  return prepareLoadedState(raw);
}
