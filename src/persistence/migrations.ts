import { CONTENT_VERSION, SAVE_VERSION } from "@/data/version";
import { ACTIVITY_MAP } from "@/data/activities";
import { CREW_MEMBER_MAP, CREW_WORK_MAP, TRAINING_MAP } from "@/data/crew";
import { BUSINESS_MAP, PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { ITEM_MAP } from "@/data/items";
import { QUEST_MAP } from "@/data/quests";
import { EQUIP_SLOTS } from "@/types/game";

type Raw = Record<string, unknown>;

/**
 * Save migrations, keyed by the version they upgrade FROM. Each migration
 * receives the raw (untrusted) object and returns a new object at version+1.
 * Version 0 is the pre-release shape (no `daily`/`social` sections and
 * contract `version` missing); it exists so the migration path is exercised.
 */
export const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  0: (raw) => {
    const r = { ...raw } as Raw;
    const now = Date.now();
    if (!r.social) r.social = { posts: [], followers: 100, lastPostAt: now };
    if (!r.daily) r.daily = { dayKey: "", objectives: [] };
    const hk = (r.hk as Raw | undefined) ?? {};
    const members = Array.isArray(hk.members) ? (hk.members as Raw[]) : [];
    hk.members = members.map((m) => {
      const contract = (m.contract as Raw | undefined) ?? { sharePct: 30, signedAt: now };
      return { ...m, contract: { version: 1, ...contract }, contractHistory: (m.contractHistory as Raw[] | undefined) ?? [], complaints: (m.complaints as number | undefined) ?? 0 };
    });
    r.hk = { unlocked: false, tier: 0, hqLevel: 0, facilities: {}, recruitPool: [], poolRefreshedAt: 0, payouts: [], totalRevenue: 0, totalPaidToCrew: 0, departed: [], ...hk };
    r.version = 1;
    return r;
  },
};

export function migrateSave(input: unknown): { ok: true; raw: Raw; migratedFrom: number | null } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Save is not an object" };
  let raw = input as Raw;
  const start = typeof raw.version === "number" ? raw.version : 0;
  let version = start;
  if (version > SAVE_VERSION) return { ok: false, error: `Save version ${version} is newer than this game (${SAVE_VERSION}). Update the app.` };
  let guard = 0;
  while (version < SAVE_VERSION && guard++ < 50) {
    const m = MIGRATIONS[version];
    if (!m) return { ok: false, error: `No migration from save version ${version}` };
    raw = m(raw);
    version = typeof raw.version === "number" ? raw.version : version + 1;
  }
  raw.version = SAVE_VERSION;
  return { ok: true, raw, migratedFrom: start < SAVE_VERSION ? start : null };
}

/**
 * Content reconciliation: when content ships without an item/quest/activity a
 * save references, drop the dangling reference instead of crashing.
 */
export function reconcileContent(raw: Raw): { raw: Raw; removed: string[] } {
  const removed: string[] = [];
  const inv = raw.inventory as Raw | undefined;
  if (inv && inv.items && typeof inv.items === "object") {
    const items = inv.items as Record<string, number>;
    for (const id of Object.keys(items)) if (!ITEM_MAP[id]) { delete items[id]; removed.push(`item:${id}`); }
    const equipped = (inv.equipped ?? {}) as Record<string, string | null>;
    for (const slot of EQUIP_SLOTS) {
      if (equipped[slot] && !ITEM_MAP[equipped[slot]!]) { equipped[slot] = null; removed.push(`equipped:${slot}`); }
      if (!(slot in equipped)) equipped[slot] = null;
    }
    inv.equipped = equipped;
  }
  const act = raw.activities as Raw | undefined;
  if (act) {
    if (Array.isArray(act.running)) act.running = (act.running as Raw[]).filter((r) => { const ok = !!ACTIVITY_MAP[r.activityId as string]; if (!ok) removed.push(`run:${r.activityId}`); return ok; });
    if (Array.isArray(act.queue)) act.queue = (act.queue as string[]).filter((id) => { const ok = !!ACTIVITY_MAP[id]; if (!ok) removed.push(`queue:${id}`); return ok; });
  }
  const quests = raw.quests as Raw | undefined;
  if (quests && quests.active && typeof quests.active === "object") {
    for (const id of Object.keys(quests.active as Raw)) if (!QUEST_MAP[id]) { delete (quests.active as Raw)[id]; removed.push(`quest:${id}`); }
  }
  const biz = raw.businesses as Raw | undefined;
  if (biz && Array.isArray(biz.owned)) biz.owned = (biz.owned as Raw[]).filter((b) => { const ok = !!BUSINESS_MAP[b.typeId as string]; if (!ok) removed.push(`business:${b.typeId}`); return ok; });
  const props = raw.properties as Raw | undefined;
  if (props && Array.isArray(props.owned)) {
    props.owned = (props.owned as string[]).filter((id) => !!PROPERTY_MAP[id]);
    if (!(props.owned as string[]).length) (props.owned as string[]).push("prop_shared");
    if (!PROPERTY_MAP[props.current as string]) props.current = (props.owned as string[])[0];
  }
  const veh = raw.vehicles as Raw | undefined;
  if (veh && Array.isArray(veh.owned)) {
    veh.owned = (veh.owned as string[]).filter((id) => !!VEHICLE_MAP[id]);
    if (veh.current && !VEHICLE_MAP[veh.current as string]) veh.current = null;
  }
  const hk = raw.hk as Raw | undefined;
  if (hk && Array.isArray(hk.members)) {
    hk.members = (hk.members as Raw[]).filter((m) => { const ok = !!CREW_MEMBER_MAP[m.defId as string]; if (!ok) removed.push(`crew:${m.defId}`); return ok; })
      .map((m) => {
        const a = m.assignment as Raw | undefined;
        if (a?.kind === "work" && !CREW_WORK_MAP[a.workId as string]) return { ...m, assignment: { kind: "idle" } };
        if (a?.kind === "training" && !TRAINING_MAP[a.programId as string]) return { ...m, assignment: { kind: "idle" } };
        return m;
      });
    if (Array.isArray(hk.recruitPool)) hk.recruitPool = (hk.recruitPool as string[]).filter((id) => !!CREW_MEMBER_MAP[id]);
  }
  raw.contentVersion = CONTENT_VERSION;
  return { raw, removed };
}
