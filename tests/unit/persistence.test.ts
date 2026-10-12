import { beforeEach, describe, expect, it } from "vitest";
import { makeGame, T0 } from "./helpers";
import { deleteSlot, listSlots, loadSlot, parseImportedSave, prepareLoadedState, saveSlot, serializeSave } from "@/persistence/saveManager";
import { resetDbForTests } from "@/persistence/db";
import { validateGameState } from "@/schemas/save";
import { SAVE_VERSION } from "@/data/version";

describe("persistence", () => {
  beforeEach(async () => {
    resetDbForTests();
    for (const s of await listSlots()) await deleteSlot(s.slotId);
  });

  it("saves survive a reload (round trip through IndexedDB)", async () => {
    const g = makeGame({ cash: 123_456 });
    g.quests.flags.intro_done = true;
    const r = await saveSlot(g, T0 + 5);
    expect(r.ok).toBe(true);
    const loaded = await loadSlot("slot_test");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state.player.cash).toBe(123_456);
      expect(loaded.state.quests.flags.intro_done).toBe(true);
      expect(loaded.state.meta.lastSavedAt).toBe(T0 + 5);
    }
  });

  it("rejects invalid saves safely and never overwrites a valid save with a corrupt one", async () => {
    const g = makeGame({ cash: 10 });
    expect((await saveSlot(g, T0)).ok).toBe(true);
    const corrupt = structuredClone(g) as unknown as Record<string, unknown>;
    (corrupt.player as Record<string, unknown>).cash = -500;
    const r = await saveSlot(corrupt as never, T0 + 1);
    expect(r.ok).toBe(false);
    const loaded = await loadSlot("slot_test");
    expect(loaded.ok && loaded.state.player.cash === 10).toBe(true);
    expect(validateGameState({ hello: "world" }).ok).toBe(false);
    expect(validateGameState(null).ok).toBe(false);
  });

  it("migrates older save versions", () => {
    const g = makeGame();
    const old = structuredClone(g) as unknown as Record<string, unknown>;
    delete old.daily;
    delete old.social;
    old.version = 0;
    const hk = old.hk as Record<string, unknown>;
    hk.members = [{ id: "crew_1", defId: "cm_seun", hiredAt: T0, level: 2, xp: 0, skills: { computing: 6, creative: 2, business: 2, communication: 2, management: 1 }, loyalty: 50, morale: 60, contract: { sharePct: 30, signedAt: T0 }, assignment: { kind: "idle" }, totalGross: 0, totalEarned: 0, unpaid: 0, trainingsCompleted: 0, cyclesCompleted: 0 }];
    const r = prepareLoadedState(old);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.version).toBe(SAVE_VERSION);
      expect(r.state.daily.objectives).toEqual([]);
      expect(r.state.hk.members[0]!.contract.version).toBe(1);
      expect(r.notes.some((n) => n.includes("Migrated"))).toBe(true);
    }
    expect(prepareLoadedState({ ...old, version: 99 }).ok).toBe(false);
  });

  it("drops references to content that no longer exists instead of failing", () => {
    const g = makeGame();
    g.inventory.items.removed_item = 1;
    g.activities.queue.push("removed_activity");
    g.quests.active.removed_quest = { stage: 0, progress: {}, startedAt: T0 };
    const r = prepareLoadedState(structuredClone(g));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.inventory.items.removed_item).toBeUndefined();
      expect(r.state.activities.queue).toHaveLength(0);
      expect(r.state.quests.active.removed_quest).toBeUndefined();
    }
  });

  it("export/import round trips preserve progression", () => {
    const g = makeGame({ cash: 777 });
    g.skills.levels.business = { xp: 5000, level: 7 };
    const json = serializeSave(g);
    const r = parseImportedSave(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.player.cash).toBe(777);
      expect(r.state.skills.levels.business.level).toBe(7);
    }
    expect(parseImportedSave("{not json").ok).toBe(false);
    expect(parseImportedSave(JSON.stringify({ app: "street-tycoon", exportedAt: "x", appVersion: "1", state: { nope: true } })).ok).toBe(false);
  });

  it("keeps multiple save slots separate", async () => {
    const a = makeGame({ cash: 1 });
    const b = makeGame({ cash: 2 });
    b.meta.slotId = "slot_b";
    b.player.name = "Second";
    await saveSlot(a, T0);
    await saveSlot(b, T0 + 1);
    const slots = await listSlots();
    expect(slots.map((s) => s.slotId).sort()).toEqual(["slot_b", "slot_test"]);
    const la = await loadSlot("slot_test");
    const lb = await loadSlot("slot_b");
    expect(la.ok && la.state.player.cash).toBe(1);
    expect(lb.ok && lb.state.player.cash).toBe(2);
    await deleteSlot("slot_b");
    expect((await listSlots()).map((s) => s.slotId)).toEqual(["slot_test"]);
  });
});
