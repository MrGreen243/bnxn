"use client";
import * as React from "react";
import { ArrowUpCircle, Castle, Lock, Users, Wrench } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { BALANCE } from "@/data/balance";
import { CREW_MEMBER_MAP, CREW_WORK_MAP, FACILITIES } from "@/data/crew";
import { Button, Money, Panel, ProgressBar, Stat, Tag, cx, Empty } from "@/components/ui";
import { hkCapacity, hkTierInfo, hqUpgradeCost, nextTierProgress, upgradeFacility, upgradeHq } from "@/simulation/crew/hk";
import { describeRequirement, checkRequirement } from "@/simulation/requirements";
import { describeMod } from "@/components/screens/ProfileScreen";
import { formatNaira } from "@/utils/format";
import type { Requirement } from "@/types/game";

export function HkScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const openScreen = useUiStore((s) => s.openScreen);
  if (!game.hk.unlocked) {
    const reqs: Requirement[] = [
      { type: "skill", skill: "management", level: BALANCE.hk.unlock.managementLevel },
      { type: "cash", amount: BALANCE.hk.unlock.cash },
      { type: "stat", stat: "credibility", min: BALANCE.hk.unlock.credibility },
      { type: "stat", stat: "streetRep", min: BALANCE.hk.unlock.streetRep },
    ];
    return (
      <div className="space-y-3">
        <Panel title="Hustler Kingdom" subtitle="A crew under one roof: recruit, train, assign work, share revenue. Unlocked through Tunde's quest.">
          <p className="text-xs text-ink-300">Reach Management level 3 and talk to Tunde on the mainland to start &quot;Foundation of a Kingdom&quot;. Then meet these requirements and tell him to open the doors:</p>
          <ul className="mt-2 space-y-1 text-xs">{reqs.map((r, i) => { const ok = checkRequirement(game, r); return <li key={i} className={ok ? "text-growth" : "text-ink-300"}>{ok ? "✓" : "○"} {describeRequirement(r)}</li>; })}</ul>
          <div className="mt-2 text-xs text-ink-400">Quest status: {game.quests.completed.includes("q_hk_foundation") ? "complete" : game.quests.active.q_hk_foundation ? `stage ${game.quests.active.q_hk_foundation.stage + 1}/5` : "not started"}</div>
        </Panel>
      </div>
    );
  }
  const tier = hkTierInfo(game.hk.tier);
  const next = nextTierProgress(game);
  const capacity = hkCapacity(game);
  const nextCost = hqUpgradeCost(game.hk.hqLevel + 1);
  const avgMorale = game.hk.members.length ? game.hk.members.reduce((s, m) => s + m.morale, 0) / game.hk.members.length : 0;
  const avgLoyalty = game.hk.members.length ? game.hk.members.reduce((s, m) => s + m.loyalty, 0) / game.hk.members.length : 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
        <Stat label="Tier" value={<span className="inline-flex items-center gap-1"><Castle size={14} /> {tier.tier}. {tier.name}</span>} />
        <Stat label="Headquarters" value={BALANCE.hk.hqNames[game.hk.hqLevel]} />
        <Stat label="Crew" value={`${game.hk.members.length} / ${capacity}`} hint="Capacity from HQ level, perks and facilities." />
        <Stat label="HK revenue (lifetime)" value={<Money amount={game.hk.totalRevenue} />} />
        <Stat label="Paid to crew" value={<Money amount={game.hk.totalPaidToCrew} />} />
        <Stat label="Avg morale" value={`${Math.round(avgMorale)}`} />
        <Stat label="Avg loyalty" value={`${Math.round(avgLoyalty)}`} />
        <Stat label="Working / training" value={`${game.hk.members.filter((m) => m.assignment.kind === "work").length} / ${game.hk.members.filter((m) => m.assignment.kind === "training").length}`} />
      </div>
      {next && (
        <Panel title={`Next tier: ${next.next.name}`}>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <ProgressBar value={next.members} max={next.next.members || 1} label={`Members ${next.members}/${next.next.members}`} />
            <ProgressBar value={next.revenue} max={next.next.revenue || 1} label={`HK revenue ${formatNaira(next.revenue)}/${formatNaira(next.next.revenue)}`} color="bg-growth" />
          </div>
        </Panel>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Headquarters" subtitle="Bigger HQ, bigger crew. Upgrades change the HQ interior on the mainland.">
          <ol className="space-y-1 text-xs">
            {BALANCE.hk.hqNames.slice(1).map((name, i) => {
              const level = i + 1;
              const have = game.hk.hqLevel >= level;
              const isNext = game.hk.hqLevel + 1 === level;
              return (
                <li key={name} className={cx("flex items-center justify-between rounded-md border px-2 py-1.5", have ? "border-growth/50 bg-growth-dim/10" : isNext ? "border-gold-400/60 bg-ink-800" : "border-ink-700 bg-ink-900 text-ink-500")}>
                  <span>{level}. {name} <Tag>{BALANCE.hk.hqCapacity[level]} slots</Tag></span>
                  {have ? <Tag color="bg-growth-dim text-ink-100">Owned</Tag> : isNext ? <Button size="sm" variant="primary" icon={<ArrowUpCircle size={12} />} disabled={game.player.cash < (nextCost ?? 0)} onClick={() => ask({ title: `Upgrade to ${name}?`, message: `Pay ${(nextCost ?? 0).toLocaleString()} to expand the headquarters to ${BALANCE.hk.hqCapacity[level]} crew slots.`, confirmLabel: "Upgrade", onConfirm: () => { const r = act((s, ctx) => upgradeHq(s, ctx.now)); toast(r.ok ? `HQ upgraded: ${name}` : r.reason, r.ok ? "good" : "bad"); } })} data-testid="hq-upgrade">{game.hk.hqLevel === 0 ? "Rent" : "Upgrade"} <Money amount={nextCost ?? 0} className="text-[10px]" /></Button> : <Lock size={12} />}
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex gap-1">
            <Button size="sm" icon={<Users size={12} />} onClick={() => openScreen("crew")}>Crew roster</Button>
            <Button size="sm" variant="primary" onClick={() => openScreen("recruit")} disabled={game.hk.hqLevel === 0}>Recruit</Button>
            <Button size="sm" onClick={() => openScreen("contracts")}>Contracts</Button>
          </div>
        </Panel>
        <Panel title="Facilities" subtitle="Each level adds a permanent bonus.">
          {game.hk.hqLevel === 0 ? <Empty>Rent a headquarters to install facilities.</Empty> : (
            <ul className="space-y-1 text-xs">
              {FACILITIES.map((f) => {
                const level = game.hk.facilities[f.id] ?? 0;
                const locked = game.hk.hqLevel < f.minHqLevel;
                const cost = f.costs[level + 1];
                return (
                  <li key={f.id} className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5">
                    <div className="flex items-center justify-between"><span className="font-semibold inline-flex items-center gap-1"><Wrench size={12} /> {f.name} <Tag>L{level}/{f.maxLevel}</Tag></span>
                      {locked ? <span className="text-[10px] text-ink-500">HQ L{f.minHqLevel}</span> : level >= f.maxLevel ? <Tag color="bg-growth-dim text-ink-100">Max</Tag> : <Button size="sm" variant="success" disabled={game.player.cash < (cost ?? 0)} onClick={() => { const r = act((s, ctx) => upgradeFacility(s, f.id, ctx.now)); toast(r.ok ? `${f.name} upgraded.` : r.reason, r.ok ? "good" : "bad"); }}>Upgrade <Money amount={cost ?? 0} className="text-[10px]" /></Button>}
                    </div>
                    <div className="text-ink-400">{f.description}</div>
                    <div className="text-[10px] text-ink-500">Per level: {f.modifiersPerLevel.map((m) => describeMod(m.key, m.value)).join(", ")}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent payouts" subtitle="Gross → operating costs → net → member share → HK revenue. Same formula everywhere.">
        {game.hk.payouts.length === 0 ? <Empty>No crew work completed yet. Assign members to work.</Empty> : <PayoutTable limit={8} />}
      </Panel>
    </div>
  );
}

export function PayoutTable({ limit, memberId }: { limit?: number; memberId?: string }) {
  const game = useGameStore((s) => s.game)!;
  const rows = game.hk.payouts.filter((p) => !memberId || p.memberId === memberId).slice(0, limit ?? 50);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="text-ink-400"><tr><th className="py-1 pr-2">Member</th><th className="pr-2">Work</th><th className="pr-2 text-right">Gross</th><th className="pr-2 text-right">Costs</th><th className="pr-2 text-right">Net</th><th className="pr-2 text-right">Member</th><th className="pr-2 text-right">HK</th><th>Result</th></tr></thead>
        <tbody>
          {rows.map((p) => {
            const m = game.hk.members.find((x) => x.id === p.memberId);
            const name = m ? CREW_MEMBER_MAP[m.defId]?.nickname : "Former member";
            return (
              <tr key={p.id} className="border-t border-ink-800">
                <td className="py-1 pr-2">{name}</td><td className="pr-2">{CREW_WORK_MAP[p.workId]?.name ?? p.workId}</td>
                <td className="pr-2 text-right"><Money amount={p.gross} className="text-[11px]" /></td><td className="pr-2 text-right"><Money amount={-p.operatingCost} className="text-[11px]" /></td>
                <td className="pr-2 text-right"><Money amount={p.net} className="text-[11px]" /></td><td className="pr-2 text-right"><Money amount={p.memberShare} className="text-[11px]" /></td>
                <td className="pr-2 text-right"><Money amount={p.hkRevenue} className="text-[11px] text-growth" /></td>
                <td><Tag color={p.outcome === "success" ? "bg-growth-dim text-ink-100" : p.outcome === "bust" ? "bg-danger-dim text-ink-100" : "bg-ink-600"}>{p.outcome}</Tag></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
