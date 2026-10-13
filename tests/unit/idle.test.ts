import { describe, expect, it } from "vitest";
import { makeGame, rng, T0 } from "./helpers";
import { simulate } from "@/simulation/engine";
import { startActivity, queueActivity } from "@/simulation/idle/activities";
import { buyBusiness, businessEconomics } from "@/simulation/businesses/businesses";
import { BALANCE } from "@/data/balance";
import { offlineCapMs } from "@/simulation/modifiers";
import { assignWork, recruit, upgradeHq } from "@/simulation/crew/hk";
import { applyEffects } from "@/simulation/effects";
import { CREW_WORK_MAP } from "@/data/crew";
import { assignTraining } from "@/simulation/crew/hk";

const HOUR = 3_600_000;

function withHk(cash = 50_000_000) {
  const g = makeGame({ cash });
  applyEffects(g, [{ type: "hkUnlock" }], T0);
  expect(upgradeHq(g, T0).ok).toBe(true);
  g.hk.recruitPool = ["cm_seun"];
  expect(recruit(g, "cm_seun", 30, T0).ok).toBe(true);
  return g;
}

describe("offline / idle simulation", () => {
  it("offline earnings use elapsed time and are capped", () => {
    const g = makeGame({ cash: 1_000_000 });
    g.skills.levels.business.level = 2;
    buyBusiness(g, "biz_accessories", T0);
    g.events.nextEventAt = T0 + 1e12; // isolate from random events (they can disrupt businesses)
    const econ = businessEconomics(g, g.businesses.owned[0]!);
    const cap = offlineCapMs(g);
    const report = simulate(g, T0 + cap + 10 * HOUR, { offline: true });
    expect(report.capped).toBe(true);
    expect(report.simulatedMs).toBe(cap);
    // uncollected is capped at 12h of production and net accrues per hour
    const expectedNet = Math.min(econ.revenuePerHour * BALANCE.businesses.uncollectedCapHours, (econ.netPerHour * cap) / HOUR);
    expect(g.businesses.owned[0]!.uncollected).toBeCloseTo(expectedNet, -2);
    expect(g.meta.lastSimulatedAt).toBe(T0 + cap + 10 * HOUR);
  });

  it("reloading cannot duplicate collected rewards", () => {
    const g = makeGame({ cash: 8_000 });
    startActivity(g, "deliver_bread", T0, rng());
    const later = T0 + 10 * 60_000;
    simulate(g, later, { offline: true });
    const cashAfterFirst = g.player.cash;
    expect(cashAfterFirst).toBeGreaterThan(8_000);
    // simulate again at the same time, and once more slightly later
    simulate(g, later, { offline: true });
    simulate(g, later + 1, { offline: true });
    expect(g.player.cash).toBe(cashAfterFirst);
    expect(g.stats.activitiesCompleted).toBe(1);
  });

  it("handles multiple simultaneous activities and the queue", () => {
    const g = makeGame({ cash: 100_000 });
    g.skills.perks.push("computing_18"); // +1 slot
    expect(startActivity(g, "deliver_bread", T0, rng()).ok).toBe(true);
    expect(startActivity(g, "cafe_typing", T0, rng()).ok).toBe(true);
    expect(startActivity(g, "market_runner", T0, rng()).ok).toBe(false); // slots full
    expect(queueActivity(g, "market_runner").ok).toBe(true);
    simulate(g, T0 + 30 * 60_000, { offline: true });
    expect(g.stats.activitiesCompleted).toBe(3);
    expect(g.activities.queue).toHaveLength(0);
    expect(g.activities.running).toHaveLength(0);
  });

  it("business and crew income is accounted for exactly once across many small steps", () => {
    const a = withHk();
    const b = structuredClone(a);
    assignWork(a, a.hk.members[0]!.id, "cw_freelance_dev", T0);
    assignWork(b, b.hk.members[0]!.id, "cw_freelance_dev", T0);
    const cycle = CREW_WORK_MAP.cw_freelance_dev!.cycleMs;
    // a: one big jump; b: many small ticks. Same RNG seed => identical outcome.
    simulate(a, T0 + cycle * 3, { offline: true });
    for (let t = T0; t < T0 + cycle * 3; t += 15_000) simulate(b, t + 15_000, { offline: false });
    expect(a.hk.members[0]!.cyclesCompleted).toBe(3);
    expect(b.hk.members[0]!.cyclesCompleted).toBe(3);
    expect(a.hk.payouts).toHaveLength(3);
    expect(b.hk.payouts).toHaveLength(3);
    expect(a.stats.crewIncome).toBe(b.stats.crewIncome);
    expect(a.hk.totalPaidToCrew).toBe(b.hk.totalPaidToCrew);
    for (const p of a.hk.payouts) expect(p.net).toBe(p.memberShare + p.hkRevenue);
  });

  it("crew training completes offline and improves skills", () => {
    const g = withHk();
    const m = g.hk.members[0]!;
    const before = m.skills.computing;
    expect(assignTraining(g, m.id, "tr_computing", T0).ok).toBe(true);
    const report = simulate(g, T0 + HOUR, { offline: true });
    expect(report.trainingsCompleted).toBe(1);
    expect(g.hk.members[0]!.skills.computing).toBe(before + 1);
    expect(g.hk.members[0]!.assignment.kind).toBe("idle");
    expect(g.stats.trainingsCompleted).toBe(1);
  });

  it("large time jumps do not generate unlimited rewards and flag the clock", () => {
    const g = makeGame({ cash: 1_000_000 });
    g.skills.levels.business.level = 2;
    buyBusiness(g, "biz_accessories", T0);
    const report = simulate(g, T0 + 400 * 24 * HOUR, { offline: true });
    expect(report.clockWarning).toBe(true);
    expect(report.capped).toBe(true);
    expect(report.simulatedMs).toBeLessThanOrEqual(BALANCE.offline.hardCapHours * HOUR);
    const backwards = simulate(g, T0, { offline: true });
    expect(backwards.clockWarning).toBe(true);
    expect(backwards.simulatedMs).toBe(0);
  });

  it("random events spawn and auto-resolve with their safe default while offline", () => {
    const g = makeGame({ cash: 1_000_000 });
    g.skills.levels.business.level = 2;
    buyBusiness(g, "biz_accessories", T0);
    const report = simulate(g, T0 + 6 * HOUR, { offline: true });
    expect(report.spawnedEvent).toBe(true);
    expect(report.events.some((e) => e.startsWith("Event:"))).toBe(true);
    expect(g.events.pending).toHaveLength(0);
    expect(g.events.log.length).toBeGreaterThan(0);
  });

  it("charges living costs per in-game day and decays heat", () => {
    const g = makeGame({ cash: 50_000 });
    g.player.stats.heat = 20;
    simulate(g, T0 + BALANCE.dayLengthMs * 2 + 1000, { offline: true });
    expect(g.meta.gameDay).toBe(3);
    expect(g.player.cash).toBeLessThan(50_000);
    expect(g.player.stats.heat).toBeLessThan(20);
  });
});
