import { describe, expect, it } from "vitest";
import { DISTRICTS, INTERIORS, SHOPS } from "@/data/districts";
import { ACTIVITIES } from "@/data/activities";
import { ITEM_MAP, ITEMS } from "@/data/items";
import { NPC_MAP, NPCS, DIALOGUE_MAP, DIALOGUES } from "@/data/npcs";
import { QUESTS } from "@/data/quests";
import { BUSINESSES, PROPERTIES, VEHICLES } from "@/data/businesses";
import { CREW_MEMBERS, CREW_WORK, FACILITY_MAP, TRAINING_PROGRAMS, CREW_WORK_MAP, TRAINING_MAP } from "@/data/crew";
import { EVENTS } from "@/data/events";
import { ACHIEVEMENTS } from "@/data/achievements";
import { SKILLS } from "@/data/skills";
import { buildDistrictMap, buildInteriorMap } from "@/game/world/mapBuilder";

describe("content integrity", () => {
  it("meets the launch content minimums", () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(4);
    expect(NPCS.length).toBeGreaterThanOrEqual(12);
    expect(QUESTS.filter((q) => q.kind === "story").length).toBeGreaterThanOrEqual(8);
    expect(ACTIVITIES.length + QUESTS.filter((q) => q.kind === "side").length).toBeGreaterThanOrEqual(25);
    expect(SKILLS.length).toBeGreaterThanOrEqual(9);
    expect(ITEMS.filter((i) => i.price > 0).length).toBeGreaterThanOrEqual(30);
    expect(BUSINESSES.length).toBeGreaterThanOrEqual(8);
    expect(PROPERTIES.length).toBeGreaterThanOrEqual(6);
    expect(VEHICLES.length).toBeGreaterThanOrEqual(6);
    expect(CREW_MEMBERS.length).toBeGreaterThanOrEqual(12);
    expect(TRAINING_PROGRAMS.length).toBeGreaterThanOrEqual(3);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(EVENTS.length).toBeGreaterThanOrEqual(10);
  });

  it("every cross reference points at existing content", () => {
    for (const s of SHOPS) for (const id of s.items) expect(ITEM_MAP[id], `shop ${s.id} item ${id}`).toBeDefined();
    for (const n of NPCS) expect(DIALOGUE_MAP[n.dialogueId], `dialogue for ${n.id}`).toBeDefined();
    for (const d of DIALOGUES) {
      expect(NPC_MAP[d.npcId]).toBeDefined();
      for (const e of d.entries) expect(d.nodes[e.node], `entry node ${e.node} in ${d.id}`).toBeDefined();
      for (const node of Object.values(d.nodes)) {
        if (node.next) expect(d.nodes[node.next], `next ${node.next} in ${d.id}`).toBeDefined();
        for (const c of node.choices ?? []) if (c.next) expect(d.nodes[c.next], `choice next ${c.next} in ${d.id}`).toBeDefined();
      }
    }
    for (const q of QUESTS) expect(NPC_MAP[q.giver], `giver ${q.giver}`).toBeDefined();
    for (const d of DISTRICTS) {
      for (const n of d.map.npcs) expect(NPC_MAP[n.npcId], `npc ${n.npcId} in ${d.id}`).toBeDefined();
      for (const b of d.map.buildings) for (const a of b.actions) {
        if (a.type === "talk") expect(NPC_MAP[a.npcId], `${b.id} talk ${a.npcId}`).toBeDefined();
        if (a.type === "shop") expect(SHOPS.find((s) => s.id === a.shopId), `${b.id} shop ${a.shopId}`).toBeDefined();
        if (a.type === "enter") expect(INTERIORS.find((i) => i.id === a.interiorId), `${b.id} interior ${a.interiorId}`).toBeDefined();
      }
    }
    for (const w of CREW_WORK) if (w.requiredFacility) expect(FACILITY_MAP[w.requiredFacility.id]).toBeDefined();
    for (const c of CREW_MEMBERS) expect(TRAINING_MAP[c.trainingPreference]).toBeDefined();
    expect(Object.keys(CREW_WORK_MAP).length).toBe(CREW_WORK.length);
  });

  it("buildings never overlap roads or each other and maps build without errors", () => {
    for (const d of DISTRICTS) {
      const m = d.map;
      const isRoad = (x: number, y: number) => m.roadsH.some((r) => y >= r && y < r + 3) || m.roadsV.some((c) => x >= c && x < c + 3);
      const occupied = new Set<string>();
      for (const b of m.buildings) {
        expect(b.x + b.w).toBeLessThanOrEqual(m.width);
        expect(b.y + b.h).toBeLessThanOrEqual(m.height);
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
          expect(isRoad(x, y), `${d.id}:${b.id} overlaps a road at ${x},${y}`).toBe(false);
          expect(occupied.has(`${x},${y}`), `${d.id}:${b.id} overlaps another building at ${x},${y}`).toBe(false);
          occupied.add(`${x},${y}`);
        }
        // the tile below the door must be walkable
        const doorX = b.x + Math.floor(b.w / 2);
        expect(occupied.has(`${doorX},${b.y + b.h}`)).toBe(false);
      }
      for (const n of m.npcs) expect(occupied.has(`${n.x},${n.y}`), `${d.id} npc ${n.npcId} inside a building`).toBe(false);
      expect(occupied.has(`${m.spawn.x},${m.spawn.y}`)).toBe(false);
      const built = buildDistrictMap(d, () => true);
      expect(built.ground.length).toBe(m.height);
      expect(built.interactables.length).toBeGreaterThanOrEqual(m.buildings.length);
    }
    for (const i of INTERIORS) {
      const built = buildInteriorMap(i, () => true);
      expect(built.exit).not.toBeNull();
      expect(built.interactables.some((t) => t.kind === "exit")).toBe(true);
    }
  });

  it("activities reference unlocked districts and sane rewards", () => {
    for (const a of ACTIVITIES) {
      if (a.district !== "any") expect(DISTRICTS.find((d) => d.id === a.district), `${a.id} district`).toBeDefined();
      expect(a.reward[1]).toBeGreaterThanOrEqual(a.reward[0]);
      expect(a.durationMs).toBeGreaterThan(0);
      if (!a.legit) expect(a.risk).toBeGreaterThan(0);
      expect(a.outcomes.success.length).toBeGreaterThan(0);
    }
  });
});
