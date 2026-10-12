import { describe, expect, it } from "vitest";
import { makeGame, rng, T0 } from "./helpers";
import { buyItem, itemPrice } from "@/simulation/shop";
import { addCash, chargeExpense, spendCash } from "@/simulation/economy/money";
import { splitRevenue } from "@/simulation/crew/hk";
import { businessEconomics, buyBusiness, upgradeCost, accrueBusinesses, collectBusiness } from "@/simulation/businesses/businesses";
import { startActivity, processActivities } from "@/simulation/idle/activities";
import { getMods } from "@/simulation/modifiers";
import { ITEM_MAP } from "@/data/items";

describe("economy", () => {
  it("buying an item deducts the correct amount and adds it to inventory", () => {
    const g = makeGame({ cash: 100_000 });
    const price = itemPrice(g, "phone_2");
    expect(price).toBe(ITEM_MAP.phone_2!.price);
    const r = buyItem(g, "phone_2", T0);
    expect(r.ok).toBe(true);
    expect(g.player.cash).toBe(100_000 - price);
    expect(g.inventory.items.phone_2).toBe(1);
    expect(g.inventory.equipped.phone).toBe("phone_2");
  });

  it("purchases fail when funds are insufficient and nothing changes", () => {
    const g = makeGame({ cash: 1_000 });
    const before = JSON.stringify(g);
    const r = buyItem(g, "phone_2", T0);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(g)).toBe(before);
  });

  it("currency never goes negative through invalid transactions", () => {
    const g = makeGame({ cash: 500 });
    expect(spendCash(g, 600, "t", "too much", T0).ok).toBe(false);
    expect(spendCash(g, -50, "t", "negative", T0).ok).toBe(false);
    expect(addCash(g, -50, "t", "negative add", T0)).toBe(0);
    const { paid, shortfall } = chargeExpense(g, 2_000, "living", "rent", T0);
    expect(paid).toBe(500);
    expect(shortfall).toBe(1_500);
    expect(g.player.cash).toBe(0);
    expect(g.player.bank).toBe(0);
  });

  it("crew revenue shares match contract terms (worked example from the design)", () => {
    const split = splitRevenue(100_000, 20_000, 25);
    expect(split).toEqual({ gross: 100_000, operatingCost: 20_000, net: 80_000, memberShare: 20_000, hkRevenue: 60_000 });
    const loss = splitRevenue(10_000, 20_000, 25);
    expect(loss.net).toBe(0);
    expect(loss.memberShare).toBe(0);
    expect(loss.hkRevenue).toBe(0);
  });

  it("business revenue and expenses are calculated and collected exactly once", () => {
    const g = makeGame({ cash: 1_000_000 });
    g.skills.levels.business.level = 2;
    expect(buyBusiness(g, "biz_accessories", T0).ok).toBe(true);
    const b = g.businesses.owned[0]!;
    const econ = businessEconomics(g, b);
    expect(econ.revenuePerHour).toBeGreaterThan(0);
    expect(econ.netPerHour).toBe(econ.revenuePerHour - econ.expensesPerHour - econ.wagesPerHour);
    const mods = getMods(g);
    accrueBusinesses(g, 3_600_000, T0 + 3_600_000, mods);
    expect(Math.round(b.uncollected)).toBe(econ.netPerHour);
    const cashBefore = g.player.cash;
    const collected = collectBusiness(g, "all", T0 + 3_600_000);
    expect(collected).toBe(Math.floor(econ.netPerHour));
    expect(g.player.cash).toBe(cashBefore + collected);
    expect(collectBusiness(g, "all", T0 + 3_600_000)).toBe(0);
  });

  it("upgrade costs scale geometrically", () => {
    const c1 = upgradeCost("biz_accessories", 1);
    const c2 = upgradeCost("biz_accessories", 2);
    const c3 = upgradeCost("biz_accessories", 3);
    expect(c2 / c1).toBeCloseTo(1.65, 1);
    expect(c3 / c2).toBeCloseTo(1.65, 1);
  });

  it("no activity generates rewards before completion", () => {
    const g = makeGame({ cash: 8_000 });
    const r = startActivity(g, "deliver_bread", T0, rng());
    expect(r.ok).toBe(true);
    expect(g.player.cash).toBe(8_000);
    processActivities(g, T0 + 10_000, rng(), false);
    expect(g.player.cash).toBe(8_000);
    expect(g.activities.running).toHaveLength(1);
    const run = g.activities.running[0]!;
    processActivities(g, run.endsAt, rng(), false);
    expect(g.activities.running).toHaveLength(0);
    expect(g.player.cash).toBeGreaterThanOrEqual(8_000);
    expect(g.stats.activitiesCompleted).toBe(1);
  });

  it("skills and equipment multiply activity rewards through one function", () => {
    const g = makeGame({ cash: 1_000_000 });
    const base = startActivity(g, "cafe_typing", T0, rng(1));
    expect(base.ok).toBe(true);
    g.activities.running = [];
    buyItem(g, "pc_3", T0);
    g.skills.levels.computing.level = 10;
    const better = startActivity(g, "cafe_typing", T0, rng(1));
    expect(better.ok).toBe(true);
    if (base.ok && better.ok) expect(better.run.cashReward).toBeGreaterThan(base.run.cashReward);
  });
});
