"use client";
import * as React from "react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { CREW_MEMBER_MAP } from "@/data/crew";
import { BALANCE } from "@/data/balance";
import { Button, Empty, Money, Panel, Tag, cx } from "@/components/ui";
import { renegotiateContract, splitRevenue } from "@/simulation/crew/hk";
import { formatTime } from "@/utils/format";

export function ContractsScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const [drafts, setDrafts] = React.useState<Record<string, number>>({});
  if (!game.hk.unlocked) return <Empty>Unlock the Hustler Kingdom first.</Empty>;
  const example = splitRevenue(100_000, 20_000, 25);
  return (
    <div className="space-y-3">
      <Panel title="How revenue sharing works" subtitle="Transparent and identical everywhere in the game.">
        <p className="text-xs text-ink-300">Each work cycle: <b>gross revenue</b> − <b>operating costs</b> = <b>net</b>. The member receives their agreed share of the net; the Kingdom keeps the rest. Example with a 25% contract:</p>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]"><div><div className="text-ink-500">Gross</div><Money amount={example.gross} /></div><div><div className="text-ink-500">Costs</div><Money amount={-example.operatingCost} /></div><div><div className="text-ink-500">Net</div><Money amount={example.net} /></div><div><div className="text-ink-500">Member 25%</div><Money amount={example.memberShare} /></div><div><div className="text-ink-500">HK</div><Money amount={example.hkRevenue} className="text-growth" /></div></div>
        <p className="mt-2 text-[11px] text-ink-400">Terms can only change while a member is idle, every change is recorded, and members refuse offers below their minimum. Cutting someone&apos;s share costs loyalty.</p>
      </Panel>
      {game.hk.members.length === 0 ? <Empty>No contracts yet.</Empty> : game.hk.members.map((m) => {
        const def = CREW_MEMBER_MAP[m.defId]!;
        const draft = drafts[m.id] ?? m.contract.sharePct;
        const busy = m.assignment.kind !== "idle";
        return (
          <div key={m.id} className="panel-raised px-3 py-2 text-xs" data-testid={`contract-${m.defId}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><span className="font-semibold">{def.name}</span> · current <Tag color="bg-ink-800 text-gold-300">{m.contract.sharePct}%</Tag> v{m.contract.version} since {formatTime(m.contract.signedAt)} · minimum {def.minSharePct}%</div>
              <div className="text-ink-400">Loyalty {Math.round(m.loyalty)} · earned <Money amount={m.totalEarned} className="text-xs" /></div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input type="range" min={BALANCE.hk.minSharePct} max={BALANCE.hk.maxSharePct} value={draft} disabled={busy} onChange={(e) => setDrafts({ ...drafts, [m.id]: Number(e.target.value) })} className="flex-1" aria-label={`New share for ${def.name}`} />
              <span className={cx("w-10 font-pixel", draft < def.minSharePct ? "text-danger" : draft < m.contract.sharePct ? "text-gold-300" : "text-growth")}>{draft}%</span>
              <Button size="sm" variant="primary" disabled={busy || draft === m.contract.sharePct} onClick={() => ask({ title: "Propose new contract?", message: `Offer ${def.name} ${draft}% (currently ${m.contract.sharePct}%). ${draft < m.contract.sharePct ? "They may accept but lose loyalty." : "Higher shares raise loyalty."} The change is logged in their contract history.`, confirmLabel: "Propose", onConfirm: () => { const r = act((s, ctx) => renegotiateContract(s, m.id, draft, ctx.now)); if (!r.ok) toast(r.reason, "bad"); else toast(r.accepted ? `${def.name} signed at ${draft}%.` : `${def.name} refused ${draft}%.`, r.accepted ? "good" : "bad"); } })}>Propose</Button>
            </div>
            {busy && <div className="mt-1 text-[11px] text-ink-500">Unassign this member before changing terms — contracts never change mid-work.</div>}
          </div>
        );
      })}
    </div>
  );
}
