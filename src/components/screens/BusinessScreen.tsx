"use client";
import * as React from "react";
import { ArrowUpCircle, Coins, Store } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { BUSINESSES, BUSINESS_MAP } from "@/data/businesses";
import { DISTRICT_MAP } from "@/data/districts";
import { Button, Empty, Money, Panel, Stat, Tabs, Tag, cx } from "@/components/ui";
import { businessEconomics, buyBusiness, canBuyBusiness, collectBusiness, sellBusiness, upgradeBusiness } from "@/simulation/businesses/businesses";
import { describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { bumpDaily } from "@/simulation/daily";
import { formatNaira } from "@/utils/format";
import { AdSlot } from "@/components/ads/AdSlot";
import { useNow } from "@/hooks/useNow";

export function BusinessScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const [tab, setTab] = React.useState<"owned" | "market" | "directory">(game.businesses.owned.length ? "owned" : "market");
  const now = useNow(5000);
  const totals = game.businesses.owned.reduce((acc, b) => { const e = businessEconomics(game, b); acc.net += e.netPerHour; acc.uncollected += b.uncollected; return acc; }, { net: 0, uncollected: 0 });
  const collectAll = () => {
    const total = act((s, ctx) => { const a = collectBusiness(s, "all", ctx.now); if (a > 0) bumpDaily(s, "collect"); return a; });
    toast(total > 0 ? `Collected ${formatNaira(total)}.` : "Nothing to collect yet.", total > 0 ? "money" : "info");
  };
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-1">
        <Stat label="Businesses" value={game.businesses.owned.length} />
        <Stat label="Net per hour" value={<Money amount={totals.net} sign />} />
        <Stat label="Uncollected" value={<Money amount={totals.uncollected} />} />
      </div>
      <Tabs tabs={[{ id: "owned", label: `Portfolio (${game.businesses.owned.length})` }, { id: "market", label: "For sale" }, { id: "directory", label: "Directory" }]} value={tab} onChange={setTab} />
      {tab === "owned" && (game.businesses.owned.length === 0 ? <Empty>You own nothing yet. Check &quot;For sale&quot;.</Empty> : (
        <div>
          <div className="mb-2 flex justify-end"><Button variant="primary" icon={<Coins size={14} />} onClick={collectAll} data-testid="collect-all">Collect all</Button></div>
          <div className="grid gap-2 md:grid-cols-2">
            {game.businesses.owned.map((b) => {
              const def = BUSINESS_MAP[b.typeId]!;
              const e = businessEconomics(game, b);
              const disrupted = b.lastEventAt > now;
              return (
                <Panel key={b.id} title={`${def.name} · L${b.level}`} subtitle={`${DISTRICT_MAP[def.district]?.name} · ${def.staffRequired} staff`}>
                  {disrupted && <Tag color="bg-danger-dim text-ink-100" className="mb-2">Disrupted — no revenue for now</Tag>}
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <Stat label="Revenue/h" value={<Money amount={e.revenuePerHour} />} />
                    <Stat label="Costs/h" value={<Money amount={-(e.expensesPerHour + e.wagesPerHour)} />} hint={`Operating ${e.expensesPerHour.toLocaleString()} + wages ${e.wagesPerHour.toLocaleString()}`} />
                    <Stat label="Net/h" value={<Money amount={e.netPerHour} sign />} />
                    <Stat label="Demand" value={`×${e.demand.toFixed(2)}`} hint="Rises with fame." />
                    <Stat label="Uncollected" value={<Money amount={b.uncollected} />} hint="Caps at 12 hours of revenue — collect regularly." />
                    <Stat label="Lifetime net" value={<Money amount={b.totalRevenue - b.totalCosts} sign />} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="sm" variant="primary" disabled={b.uncollected < 1} onClick={() => { const t = act((s, ctx) => collectBusiness(s, b.id, ctx.now)); toast(`Collected ${formatNaira(t)}.`, "money"); }}>Collect</Button>
                    {e.upgradeCost !== null && <Button size="sm" variant="success" icon={<ArrowUpCircle size={12} />} disabled={game.player.cash < e.upgradeCost} onClick={() => { const r = act((s, ctx) => upgradeBusiness(s, b.id, ctx.now)); toast(r.ok ? "Upgraded!" : r.reason ?? "", r.ok ? "good" : "bad"); }}>Upgrade <Money amount={e.upgradeCost} className="text-[10px]" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => ask({ title: "Sell business?", message: `Sell ${def.name} for roughly 60% of its value plus uncollected income?`, danger: true, confirmLabel: "Sell", onConfirm: () => { const r = act((s, ctx) => sellBusiness(s, b.id, ctx.now)); toast(r.ok ? `Sold for ${formatNaira(r.amount ?? 0)}.` : r.reason ?? "", r.ok ? "money" : "bad"); } })}>Sell</Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      ))}
      {tab === "market" && (
        <div className="grid gap-2 md:grid-cols-2">
          {BUSINESSES.map((def) => {
            const owned = game.businesses.owned.some((b) => b.typeId === def.id);
            const check = canBuyBusiness(game, def.id);
            const unmet = unmetRequirements(game, def.requirements);
            const districtOk = game.player.unlockedDistricts.includes(def.district);
            return (
              <div key={def.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", owned ? "border-growth/50 bg-ink-900" : "border-ink-700 bg-ink-900")} data-testid={`biz-${def.id}`}>
                <div className="flex items-center gap-2 font-semibold"><Store size={14} /> {def.name}{owned && <Tag color="bg-growth-dim text-ink-100">Owned</Tag>}</div>
                <div className="text-ink-400">{DISTRICT_MAP[def.district]?.name} · {def.staffRequired} staff · {def.flavor}</div>
                <p className="text-ink-300">{def.description}</p>
                <div className="text-[11px] text-ink-300">Base <Money amount={def.revenuePerHour} className="text-[11px]" />/h revenue · <Money amount={def.expensesPerHour + def.staffWagePerHour * def.staffRequired} className="text-[11px]" />/h costs · managed by {def.managementSkill}</div>
                {!districtOk && <div className="text-[11px] text-danger">Unlock {DISTRICT_MAP[def.district]?.name} first.</div>}
                {unmet.length > 0 && <div className="text-[11px] text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
                <div className="mt-1 flex items-center justify-between"><Money amount={def.price} /><Button size="sm" variant="primary" disabled={!check.ok} title={check.reason} onClick={() => ask({ title: `Buy ${def.name}?`, message: `Pay ${def.price.toLocaleString()}. It generates income while you play and while you're away (up to the offline cap).`, confirmLabel: "Buy", onConfirm: () => { const r = act((s, ctx) => buyBusiness(s, def.id, ctx.now)); toast(r.ok ? `You now own ${def.name}!` : r.reason ?? "", r.ok ? "good" : "bad"); setTab("owned"); } })} data-testid={`buy-${def.id}`}>{owned ? "Owned" : check.ok ? "Buy" : check.reason}</Button></div>
              </div>
            );
          })}
        </div>
      )}
      {tab === "directory" && (
        <div className="space-y-2">
          <p className="text-xs text-ink-400">Businesses of {DISTRICT_MAP[game.player.districtId]?.name}. Sponsored listings are clearly labelled.</p>
          <div className="grid gap-2 sm:grid-cols-[128px_1fr]">
            <AdSlot placement="directory_listing" />
            <ul className="space-y-1 text-xs">
              {DISTRICT_MAP[game.player.districtId]?.map.buildings.map((b) => <li key={b.id} className="panel-raised px-2 py-1">{b.label} <span className="text-ink-500">· {b.kind}</span></li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
