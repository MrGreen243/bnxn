import { describe, expect, it } from "vitest";
import { makeGame, T0 } from "./helpers";
import { addSkillXp, autoUnlockPerks, levelFromXp, xpForLevel } from "@/simulation/progression/skills";
import { canUnlockDistrict, travelTo, unlockDistrict } from "@/simulation/progression/districts";
import { evaluateQuests, startQuest } from "@/simulation/progression/quests";
import { canRecruit, hkCapacity, recruit, renegotiateContract, upgradeHq, assignWork } from "@/simulation/crew/hk";
import { applyEffects } from "@/simulation/effects";
import { performPrestige, prestigeAvailable } from "@/simulation/prestige";
import { activitySlots } from "@/simulation/modifiers";
import { BALANCE } from "@/data/balance";
import { evaluateAchievements } from "@/simulation/progression/achievements";
import { startDialogue, chooseDialogue, continueDialogue } from "@/simulation/npc";

describe("progression", () => {
  it("skills award XP and level up on the configured curve", () => {
    const g = makeGame();
    const gain = addSkillXp(g, "computing", xpForLevel(1), { raw: true });
    expect(gain.levelsGained).toBe(1);
    expect(g.skills.levels.computing.level).toBe(2);
    expect(levelFromXp(xpForLevel(1) + xpForLevel(2)).level).toBe(3);
  });

  it("levels unlock perks that change gameplay", () => {
    const g = makeGame();
    expect(activitySlots(g)).toBe(1);
    g.skills.levels.computing = { xp: 0, level: 18 };
    const unlocked = autoUnlockPerks(g);
    expect(unlocked).toEqual(expect.arrayContaining(["computing_5", "computing_10", "computing_18"]));
    expect(activitySlots(g)).toBe(2);
  });

  it("district requirements gate unlocking and travel", () => {
    const g = makeGame({ cash: 100 });
    expect(canUnlockDistrict(g, "computerVillage").ok).toBe(false);
    expect(unlockDistrict(g, "computerVillage", T0).ok).toBe(false);
    g.skills.levels.computing.level = 4;
    g.player.cash = 50_000;
    g.quests.completed.push("q_tools");
    expect(canUnlockDistrict(g, "computerVillage").ok).toBe(true);
    const r = travelTo(g, "computerVillage", T0);
    expect(r.ok).toBe(true);
    expect(g.player.districtId).toBe("computerVillage");
    expect(g.player.unlockedDistricts).toContain("computerVillage");
    expect(g.player.cash).toBeLessThan(50_000);
  });

  it("quests auto-start and advance only when requirements are satisfied", () => {
    const g = makeGame({ cash: 100 });
    evaluateQuests(g, T0);
    expect(g.quests.active.q_intro_street).toBeDefined();
    expect(g.quests.active.q_intro_street!.stage).toBe(0);
    evaluateQuests(g, T0);
    expect(g.quests.active.q_intro_street!.stage).toBe(0);
    g.npcs.talkedTo.tunde = 1;
    evaluateQuests(g, T0);
    expect(g.quests.active.q_intro_street!.stage).toBe(1);
    g.activities.completedCounts.deliver_bread = 1;
    g.quests.flags.bought_anything = true;
    g.player.cash = 12_000;
    const updates = evaluateQuests(g, T0);
    expect(updates.some((u) => u.kind === "completed" && u.questId === "q_intro_street")).toBe(true);
    expect(g.quests.completed).toContain("q_intro_street");
    expect(g.player.cash).toBe(15_000); // 3,000 reward
  });

  it("dialogue choices apply effects and start quests", () => {
    const g = makeGame();
    const node = startDialogue(g, "tunde", T0);
    expect(node?.id).toBe("intro");
    expect(g.npcs.talkedTo.tunde).toBe(1);
    const second = continueDialogue(g, "tunde", node!, T0);
    expect(second?.id).toBe("intro2");
    const next = chooseDialogue(g, "tunde", second!, 0, T0);
    expect(next.next).toBeNull();
    expect(g.quests.flags.intro_done).toBe(true);
    expect(g.npcs.relationships.tunde).toBe(10);
  });

  it("HK recruitment respects capacity, eligibility and share limits", () => {
    const g = makeGame({ cash: 10_000_000 });
    expect(canRecruit(g, "cm_seun", 30).ok).toBe(false); // not unlocked
    applyEffects(g, [{ type: "hkUnlock" }], T0);
    expect(canRecruit(g, "cm_seun", 30).ok).toBe(false); // no HQ
    expect(upgradeHq(g, T0).ok).toBe(true);
    expect(hkCapacity(g)).toBe(BALANCE.hk.hqCapacity[1]);
    g.hk.recruitPool = ["cm_seun", "cm_amaka", "cm_kunle", "cm_blessing"];
    expect(canRecruit(g, "cm_seun", 10).ok).toBe(false); // below minimum share
    expect(recruit(g, "cm_seun", 30, T0).ok).toBe(true);
    expect(recruit(g, "cm_amaka", 35, T0).ok).toBe(true);
    expect(recruit(g, "cm_kunle", 40, T0).ok).toBe(false); // capacity 2
    expect(g.hk.members).toHaveLength(2);
    expect(recruit(g, "cm_seun", 30, T0).ok).toBe(false); // already in crew
  });

  it("contracts cannot change while a member is working and every change is logged", () => {
    const g = makeGame({ cash: 10_000_000 });
    applyEffects(g, [{ type: "hkUnlock" }], T0);
    upgradeHq(g, T0);
    g.hk.recruitPool = ["cm_seun"];
    recruit(g, "cm_seun", 30, T0);
    const m = g.hk.members[0]!;
    assignWork(g, m.id, "cw_freelance_dev", T0);
    expect(renegotiateContract(g, m.id, 40, T0).ok).toBe(false);
    m.assignment = { kind: "idle" };
    const r = renegotiateContract(g, m.id, 40, T0 + 1);
    expect(r.ok && r.accepted).toBe(true);
    expect(m.contract.sharePct).toBe(40);
    expect(m.contract.version).toBe(2);
    expect(m.contractHistory).toHaveLength(1);
    const refused = renegotiateContract(g, m.id, 15, T0 + 2); // below min 20
    expect(refused.ok && refused.accepted === false).toBe(true);
    expect(m.contract.sharePct).toBe(40);
  });

  it("achievements unlock from state", () => {
    const g = makeGame({ cash: 100_000 });
    const unlocked = evaluateAchievements(g, T0);
    expect(unlocked).toContain("ach_100k");
    expect(g.achievements.unlocked.ach_100k).toBe(T0);
    expect(evaluateAchievements(g, T0)).not.toContain("ach_100k");
  });

  it("prestige applies the intended reset rules", () => {
    const g = makeGame({ cash: 600_000_000 });
    g.achievements.unlocked.ach_100k = T0;
    g.inventory.items.col_1 = 1;
    g.skills.levels.computing.level = 20;
    expect(prestigeAvailable(g).ok).toBe(true);
    const next = performPrestige(g, T0 + 1)!;
    expect(next).not.toBeNull();
    expect(next.prestige.runs).toBe(1);
    expect(next.prestige.legacyPoints).toBeGreaterThan(0);
    expect(next.achievements.unlocked.ach_100k).toBe(T0);
    expect(next.inventory.items.col_1).toBe(1);
    expect(next.skills.levels.computing.level).toBe(1);
    expect(next.player.cash).toBeLessThan(1_000_000);
    expect(next.businesses.owned).toHaveLength(0);
    expect(prestigeAvailable(makeGame({ cash: 100 })).ok).toBe(false);
  });

  it("startQuest refuses quests whose requirements are unmet", () => {
    const g = makeGame();
    expect(startQuest(g, "q_lekki", T0)).toBe(false);
    g.player.unlockedDistricts.push("ikeja");
    expect(startQuest(g, "q_lekki", T0)).toBe(true);
  });
});
