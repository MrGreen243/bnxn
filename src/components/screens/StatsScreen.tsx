"use client";
import * as React from "react";
import { Lock, Trophy } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { Money, Panel, Stat, cx } from "@/components/ui";
import { businessValue, investmentValue, inventoryValue, netWorth, propertyValue, vehicleValue } from "@/simulation/economy/money";
import { businessEconomics } from "@/simulation/businesses/businesses";
import { expectedCycle } from "@/simulation/crew/hk";
import { CREW_WORK_MAP } from "@/data/crew";
import { dailyLivingCost } from "@/simulation/engine";
import { ACHIEVEMENTS } from "@/data/achievements";
import { formatDurationLong, formatNumber, formatTime } from "@/utils/format";
import { BALANCE } from "@/data/balance";

export function StatsScreen() {
  const game = useGameStore((s) => s.game)!;
  const bizNet = game.businesses.owned.reduce((s, b) => s + businessEconomics(game, b).netPerHour, 0);
  const crewNet = game.hk.members.reduce((s, m) => {
    if (m.assignment.kind !== "work") return s;
    const w = CREW_WORK_MAP[m.assignment.workId];
    if (!w) return s;
    return s + (expectedCycle(game, m, w).hkRevenue * 3_600_000) / w.cycleMs;
  }, 0);
  const living = (dailyLivingCost(game) * 3_600_000) / BALANCE.dayLengthMs;
  const categories = game.transactions.reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] ?? 0) + t.amount; return acc; }, {});
  return (
    <div className="space-y-3">
      <Panel title="Income statement (per real hour, estimated)">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          <Stat label="Business net" value={<Money amount={bizNet} sign />} />
          <Stat label="Crew (HK share)" value={<Money amount={crewNet} sign />} />
          <Stat label="Living costs" value={<Money amount={-living} />} hint="Rent, food, transport, upkeep (3 game days per real hour)." />
          <Stat label="Passive total" value={<Money amount={bizNet + crewNet - living} sign />} />
        </div>
      </Panel>
      <Panel title="Net worth breakdown">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          <Stat label="Cash + bank" value={<Money amount={game.player.cash + game.player.bank} />} />
          <Stat label="Investments" value={<Money amount={investmentValue(game)} />} />
          <Stat label="Businesses" value={<Money amount={businessValue(game)} />} />
          <Stat label="Property" value={<Money amount={propertyValue(game)} />} />
          <Stat label="Vehicles" value={<Money amount={vehicleValue(game)} />} />
          <Stat label="Inventory" value={<Money amount={inventoryValue(game)} />} />
          <Stat label="Total" value={<Money amount={netWorth(game)} />} className="border-gold-400/50" />
          <Stat label="Legacy points" value={game.prestige.legacyPoints} />
        </div>
      </Panel>
      <Panel title="Lifetime statistics">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          <Stat label="Total earned" value={<Money amount={game.stats.totalEarned} />} />
          <Stat label="Total spent" value={<Money amount={game.stats.totalSpent} />} />
          <Stat label="Activities" value={`${game.stats.activitiesCompleted} (${game.stats.legitCompleted} legit / ${game.stats.riskyCompleted} risky)`} />
          <Stat label="Busts / setbacks" value={`${game.stats.busts} / ${game.risk.setbacks}`} />
          <Stat label="Quests completed" value={game.stats.questsCompleted} />
          <Stat label="Items bought" value={game.stats.itemsBought} />
          <Stat label="Business income" value={<Money amount={game.stats.businessIncome} />} />
          <Stat label="Crew income" value={<Money amount={game.stats.crewIncome} />} />
          <Stat label="Recruits / trainings" value={`${game.stats.recruitsHired} / ${game.stats.trainingsCompleted}`} />
          <Stat label="Distance walked" value={`${formatNumber(Math.round(game.stats.distanceWalked / 16))} tiles`} />
          <Stat label="Play time" value={formatDurationLong(game.stats.playtimeMs)} />
          <Stat label="Game days" value={game.meta.gameDay} />
          <Stat label="Started" value={formatTime(game.meta.createdAt)} />
          <Stat label="Followers" value={formatNumber(game.social.followers)} />
          <Stat label="Investment profit" value={<Money amount={game.stats.investmentProfit} sign />} />
          <Stat label="Heat" value={Math.round(game.player.stats.heat)} />
        </div>
      </Panel>
      <Panel title="Recent cash flow by category">
        <ul className="grid gap-1 text-xs sm:grid-cols-3">{Object.entries(categories).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, v]) => <li key={k} className="flex justify-between panel-raised px-2 py-1"><span>{k}</span><Money amount={v} sign className="text-xs" /></li>)}</ul>
      </Panel>
    </div>
  );
}

export function AchievementsScreen() {
  const game = useGameStore((s) => s.game)!;
  const unlockedCount = Object.keys(game.achievements.unlocked).length;
  return (
    <div>
      <p className="mb-3 text-xs text-ink-300">{unlockedCount} / {ACHIEVEMENTS.length} unlocked. Achievements persist across legacy resets.</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = game.achievements.unlocked[a.id];
          const hidden = a.hidden && !at;
          return (
            <li key={a.id} className={cx("flex items-start gap-2 rounded-md border p-2 text-xs", at ? "border-gold-400/60 bg-ink-800" : "border-ink-700 bg-ink-900 opacity-70")} data-testid={`ach-${a.id}`}>
              <span className={at ? "text-gold-400" : "text-ink-500"}>{at ? <Trophy size={16} /> : <Lock size={16} />}</span>
              <div><div className="font-semibold">{hidden ? "???" : a.name}</div><div className="text-ink-300">{hidden ? "Hidden achievement." : a.description}</div>{at && <div className="text-[10px] text-ink-500">Unlocked {formatTime(at)}</div>}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
