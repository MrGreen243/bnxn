"use client";
import * as React from "react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { Button, Empty, Money, Panel, Stat, cx } from "@/components/ui";
import { deposit, withdraw, netWorth, investmentValue } from "@/simulation/economy/money";
import { INVESTMENT_ASSETS } from "@/data/businesses";
import { buyInvestment, sellInvestment } from "@/simulation/investments";
import { formatNairaFull, formatTime } from "@/utils/format";

export function BankScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [amount, setAmount] = React.useState("");
  const n = Math.round(Number(amount)) || 0;
  const run = (fn: typeof deposit) => {
    const r = act((s, ctx) => fn(s, n, ctx.now));
    toast(r.ok ? "Done." : r.reason, r.ok ? "good" : "bad");
    if (r.ok) setAmount("");
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1">
        <Stat label="Cash" value={<Money amount={game.player.cash} full />} />
        <Stat label="Bank" value={<Money amount={game.player.bank} full />} hint="Bank money is safe from busts, but living costs draw from it if cash runs out." />
        <Stat label="Net worth" value={<Money amount={netWorth(game)} />} />
      </div>
      <Panel title="Transfer" subtitle="Keeping cash in the bank protects it from street losses after a bust.">
        <div className="flex gap-2">
          <input type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Transfer amount" />
          <Button variant="primary" disabled={n <= 0} onClick={() => run(deposit)}>Deposit</Button>
          <Button disabled={n <= 0} onClick={() => run(withdraw)}>Withdraw</Button>
        </div>
        <div className="mt-2 flex gap-1 text-[11px]">
          {[0.25, 0.5, 1].map((f) => <Button key={f} size="sm" variant="ghost" onClick={() => setAmount(String(Math.floor(game.player.cash * f)))}>{f * 100}% cash</Button>)}
        </div>
      </Panel>
      <Panel title="Transaction history">
        {game.transactions.length === 0 ? <Empty>No transactions yet.</Empty> : (
          <ul className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-thin">
            {game.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 border-b border-ink-800 px-1 py-1 text-xs">
                <div className="min-w-0"><div className="truncate">{t.note}</div><div className="text-[10px] text-ink-500">{formatTime(t.at)} · {t.category} · {t.account}</div></div>
                <span className={cx("shrink-0 font-pixel", t.amount >= 0 ? "text-growth" : "text-danger")}>{t.amount >= 0 ? "+" : "−"}{formatNairaFull(Math.abs(t.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 120;
  const h = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / Math.max(1e-9, max - min)) * (h - 2) - 1}`).join(" ");
  const up = values[values.length - 1]! >= values[0]!;
  return <svg width={w} height={h} aria-hidden="true"><polyline fill="none" stroke={up ? "#38c172" : "#ef476f"} strokeWidth="1.5" points={pts} /></svg>;
}

export function InvestmentsScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [units, setUnits] = React.useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      <p className="rounded-md border border-ink-700 bg-ink-900 p-2 text-[11px] text-ink-400">Fictional markets for a fictional city. Prices move on their own every few minutes, including while you are away. This is a game, not investment advice.</p>
      <div className="grid grid-cols-2 gap-1"><Stat label="Portfolio value" value={<Money amount={investmentValue(game)} />} /><Stat label="Realised profit" value={<Money amount={game.stats.investmentProfit} sign />} /></div>
      {INVESTMENT_ASSETS.map((a) => {
        const price = game.investments.prices[a.id] ?? a.basePrice;
        const h = game.investments.holdings[a.id];
        const hist = game.investments.history[a.id] ?? [];
        const change = hist.length > 1 ? (price / hist[Math.max(0, hist.length - 13)]! - 1) * 100 : 0;
        const u = Math.max(0, Math.floor(Number(units[a.id] ?? "0")) || 0);
        const avg = h && h.units > 0 ? h.invested / h.units : 0;
        return (
          <div key={a.id} className="panel-raised flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
            <div className="min-w-[160px] flex-1">
              <div className="font-semibold">{a.name}</div>
              <div className="text-ink-400">{a.description}</div>
              <div className="mt-1">Price <Money amount={price} full /> <span className={change >= 0 ? "text-growth" : "text-danger"}>({change >= 0 ? "+" : ""}{change.toFixed(1)}% recent)</span></div>
              {h && h.units > 0 && <div className="text-ink-300">Holding {h.units} units · avg <Money amount={avg} full className="text-xs" /> · value <Money amount={h.units * price} className="text-xs" /></div>}
            </div>
            <Sparkline values={hist} />
            <div className="flex items-center gap-1">
              <input type="number" inputMode="numeric" min={0} value={units[a.id] ?? ""} onChange={(e) => setUnits({ ...units, [a.id]: e.target.value })} placeholder="Units" className="w-20" aria-label={`Units of ${a.name}`} />
              <Button size="sm" variant="primary" disabled={u <= 0} onClick={() => { const r = act((s, ctx) => buyInvestment(s, a.id, u, ctx.now)); toast(r.ok ? `Bought ${u} ${a.name}.` : r.reason ?? "", r.ok ? "money" : "bad"); }}>Buy</Button>
              <Button size="sm" disabled={u <= 0 || !h} onClick={() => { const r = act((s, ctx) => sellInvestment(s, a.id, u, ctx.now)); toast(r.ok ? `Sold for ${formatNairaFull(r.proceeds ?? 0)}.` : r.reason ?? "", r.ok ? "money" : "bad"); }}>Sell</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
