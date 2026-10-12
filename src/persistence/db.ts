import Dexie, { type EntityTable } from "dexie";
import type { GameState } from "@/types/game";
import type { AdManifest } from "@/schemas/ads";

export interface SaveRecord {
  slotId: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  version: number;
  data: GameState;
  summary: { cash: number; netWorth: number; district: string; day: number; playtimeMs: number };
}

export interface AdManifestRecord {
  key: "local";
  manifest: AdManifest;
  updatedAt: number;
}

export interface AdStatRecord {
  campaignId: string;
  impressions: number;
  clicks: number;
  dayKey: string;
  dayImpressions: number;
  lastShownAt: number;
}

export interface AdImageRecord {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  createdAt: number;
}

export class StreetTycoonDB extends Dexie {
  saves!: EntityTable<SaveRecord, "slotId">;
  adManifests!: EntityTable<AdManifestRecord, "key">;
  adStats!: EntityTable<AdStatRecord, "campaignId">;
  adImages!: EntityTable<AdImageRecord, "id">;

  constructor() {
    super("street-tycoon");
    this.version(1).stores({
      saves: "slotId, updatedAt",
      adManifests: "key",
      adStats: "campaignId",
      adImages: "id, createdAt",
    });
  }
}

let instance: StreetTycoonDB | null = null;
export function getDb(): StreetTycoonDB {
  if (!instance) instance = new StreetTycoonDB();
  return instance;
}

/** For tests: replace the singleton. */
export function resetDbForTests() {
  instance?.close();
  instance = null;
}

export async function storageAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === "undefined") return false;
    await getDb().open();
    return true;
  } catch {
    return false;
  }
}
