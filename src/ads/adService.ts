/**
 * Client-side advertising service. Loads the bundled default manifest, applies
 * a locally edited manifest (from the admin dashboard, stored in IndexedDB),
 * selects eligible campaigns per placement and tracks impressions/clicks
 * locally. Local counters are per device only — not global analytics.
 */
import { DEFAULT_AD_MANIFEST } from "@/data/ads/defaultManifest";
import { getDb, type AdStatRecord } from "@/persistence/db";
import { adManifestSchema, parseAdManifest, type AdCampaign, type AdManifest, type AdPlacement } from "@/schemas/ads";
import { dayKey } from "@/utils/time";

export interface AdContext {
  districtId?: string;
  device: "desktop" | "mobile";
  now: number;
}

type Listener = () => void;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let manifest: AdManifest = adManifestSchema.parse(DEFAULT_AD_MANIFEST);
let usingLocal = false;
let stats = new Map<string, AdStatRecord>();
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();
const rotation = new Map<string, number>();

function notify() {
  for (const l of Array.from(listeners)) l();
}

export function subscribeAds(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export async function loadAds(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const db = getDb();
      const local = await db.adManifests.get("local");
      if (local) {
        const parsed = parseAdManifest(local.manifest);
        if (parsed.ok) {
          manifest = parsed.manifest;
          usingLocal = true;
        }
      }
      const rows = await db.adStats.toArray();
      stats = new Map(rows.map((r) => [r.campaignId, r]));
    } catch {
      // storage unavailable: keep defaults in memory
    }
    loaded = true;
    notify();
  })();
  return loadPromise;
}

export function getAdManifest(): AdManifest {
  return manifest;
}

export function isUsingLocalManifest(): boolean {
  return usingLocal;
}

export function getDefaultManifest(): AdManifest {
  return adManifestSchema.parse(DEFAULT_AD_MANIFEST);
}

export async function saveLocalManifest(next: AdManifest): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseAdManifest(next);
  if (!parsed.ok) return parsed;
  try {
    await getDb().adManifests.put({ key: "local", manifest: parsed.manifest, updatedAt: Date.now() });
  } catch (e) {
    return { ok: false, error: `Could not store manifest locally: ${(e as Error).message}` };
  }
  manifest = parsed.manifest;
  usingLocal = true;
  notify();
  return { ok: true };
}

export async function resetLocalManifest(): Promise<void> {
  try {
    await getDb().adManifests.delete("local");
  } catch {
    // ignore
  }
  manifest = getDefaultManifest();
  usingLocal = false;
  notify();
}

export function getAdStats(): Map<string, AdStatRecord> {
  return stats;
}

export function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return `${basePath}${url}`;
  return url;
}

function withinSchedule(c: AdCampaign, now: number): boolean {
  if (c.startAt && new Date(c.startAt).getTime() > now) return false;
  if (c.endAt && new Date(c.endAt).getTime() < now) return false;
  return true;
}

export function eligibleCampaigns(placement: AdPlacement, ctx: AdContext, source: AdManifest = manifest): AdCampaign[] {
  const today = dayKey(ctx.now);
  return source.campaigns.filter((c) => {
    if (!c.enabled || c.placement !== placement) return false;
    if (!withinSchedule(c, ctx.now)) return false;
    if (c.districts.length && ctx.districtId && !c.districts.includes(ctx.districtId as AdCampaign["districts"][number])) return false;
    if (c.devices.length && !c.devices.includes(ctx.device)) return false;
    if (c.frequencyCapPerDay > 0) {
      const s = stats.get(c.id);
      if (s && s.dayKey === today && s.dayImpressions >= c.frequencyCapPerDay) return false;
    }
    return true;
  });
}

/** Highest priority wins; ties rotate round-robin per placement. */
export function selectCampaign(placement: AdPlacement, ctx: AdContext, source: AdManifest = manifest): AdCampaign | null {
  const pool = eligibleCampaigns(placement, ctx, source);
  if (pool.length === 0) return null;
  const top = Math.max(...pool.map((c) => c.priority));
  const best = pool.filter((c) => c.priority === top).sort((a, b) => a.id.localeCompare(b.id));
  const idx = rotation.get(placement) ?? 0;
  rotation.set(placement, idx + 1);
  return best[idx % best.length] ?? null;
}

async function persistStat(rec: AdStatRecord) {
  try {
    await getDb().adStats.put(rec);
  } catch {
    // ignore storage failures for ad stats
  }
}

export function recordImpression(campaignId: string, now = Date.now()) {
  const today = dayKey(now);
  const prev = stats.get(campaignId) ?? { campaignId, impressions: 0, clicks: 0, dayKey: today, dayImpressions: 0, lastShownAt: 0 };
  const rec: AdStatRecord = {
    ...prev,
    impressions: prev.impressions + 1,
    dayKey: today,
    dayImpressions: prev.dayKey === today ? prev.dayImpressions + 1 : 1,
    lastShownAt: now,
  };
  stats.set(campaignId, rec);
  void persistStat(rec);
}

export function recordClick(campaignId: string, now = Date.now()) {
  const prev = stats.get(campaignId) ?? { campaignId, impressions: 0, clicks: 0, dayKey: dayKey(now), dayImpressions: 0, lastShownAt: 0 };
  const rec: AdStatRecord = { ...prev, clicks: prev.clicks + 1 };
  stats.set(campaignId, rec);
  void persistStat(rec);
}

export async function clearAdStats() {
  stats = new Map();
  try {
    await getDb().adStats.clear();
  } catch {
    // ignore
  }
  notify();
}

/** Opens a campaign link safely in a new tab (no opener, no referrer). */
export function openAdLink(c: AdCampaign) {
  recordClick(c.id);
  if (typeof window === "undefined") return;
  const w = window.open(c.clickUrl, "_blank", "noopener,noreferrer");
  if (w) w.opener = null;
}
