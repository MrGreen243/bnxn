"use client";
import * as React from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { CREW_MEMBER_MAP } from "@/data/crew";
import { BALANCE } from "@/data/balance";
import { Button, Empty, Money, Panel, ProgressBar, Tag, cx } from "@/components/ui";
import { canRecruit, hkCapacity, recruit, recruitCost, refreshRecruitPool } from "@/simulation/crew/hk";
import { describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { AvatarPreview } from "@/components/menu/AvatarPreview";
import { formatDuration } from "@/utils/format";
import { useNow } from "@/hooks/useNow";

export function RecruitScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [shares, setShares] = React.useState<Record<string, number>>({});
  const [selected, setSelected] = React.useState<string | null>(null);
  const now = useNow(1000);
  if (!game.hk.unlocked) return <Empty>Unlock the Hustler Kingdom first.</Empty>;
  if (game.hk.hqLevel === 0) return <Empty>Rent a headquarters (HK screen) before recruiting.</Empty>;
  const capacity = hkCapacity(game);
  const refreshIn = Math.max(0, game.hk.poolRefreshedAt + BALANCE.hk.poolRefreshMs - now);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>Crew {game.hk.members.length}/{capacity} · Pool refreshes in {formatDuration(refreshIn)}</span>
        <Button size="sm" icon={<RefreshCw size={12} />} onClick={() => { act((s, ctx) => refreshRecruitPool(s, ctx.now, ctx.rng, true)); toast("New faces in the pool.", "info"); }}>Refresh pool</Button>
      </div>
      {game.hk.recruitPool.length === 0 ? <Empty>Nobody available right now. Refresh the pool or raise your reputation.</Empty> : (
        <div className="grid gap-2 md:grid-cols-2">
          {game.hk.recruitPool.map((id) => {
            const def = CREW_MEMBER_MAP[id];
            if (!def) return null;
            const share = shares[id] ?? def.preferredSharePct;
            const check = canRecruit(game, id, share);
            const unmet = unmetRequirements(game, def.requirements);
            const cost = recruitCost(game, def);
            const open = selected === id;
            return (
              <Panel key={id} className={cx(open && "border-gold-400/60")}>
                <div className="flex items-start gap-3 text-xs">
                  <div className="shrink-0 rounded border border-ink-600 bg-ink-950 p-0.5"><AvatarPreview skin={def.palette.skin} hair={def.palette.hair} outfit={def.palette.outfit} size={3} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{def.name}</span><Tag>L{def.startLevel}</Tag><Tag color="bg-purple/30 text-ink-100">Potential {def.potential}</Tag></div>
                    <div className="text-ink-400">&quot;{def.nickname}&quot; · {def.personality}</div>
                    <p className="mt-1 text-ink-300">{def.background}</p>
                    <div className="mt-1 italic text-ink-400">&quot;{def.quote}&quot;</div>
                    <div className="mt-1 flex flex-wrap gap-1">{def.traits.map((t) => <Tag key={t}>{t}</Tag>)}</div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">{(Object.keys(def.skills) as (keyof typeof def.skills)[]).map((k) => <ProgressBar key={k} value={def.skills[k]} max={10} label={`${k} ${def.skills[k]}`} height="h-1" color="bg-accent" />)}</div>
                    <div className="mt-2 text-ink-300">Wants {def.preferredSharePct}% of net (won&apos;t go below {def.minSharePct}%). Motivation: {def.motivation}</div>
                    {unmet.length > 0 && <div className="text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex flex-1 items-center gap-2">Share <input type="range" min={BALANCE.hk.minSharePct} max={BALANCE.hk.maxSharePct} value={share} onChange={(e) => setShares({ ...shares, [id]: Number(e.target.value) })} aria-label={`Revenue share for ${def.name}`} onFocus={() => setSelected(id)} /> <span className={cx("w-10 font-pixel", share < def.minSharePct ? "text-danger" : share >= def.preferredSharePct ? "text-growth" : "text-gold-300")}>{share}%</span></label>
                  <Button variant="primary" size="sm" icon={<UserPlus size={12} />} disabled={!check.ok} title={check.ok ? undefined : check.reason} onClick={() => { const r = act((s, ctx) => recruit(s, id, share, ctx.now)); toast(r.ok ? `${def.name} joined at ${share}%.` : r.reason, r.ok ? "good" : "bad"); }} data-testid={`recruit-${id}`}>Recruit <Money amount={cost} className="text-[10px]" /></Button>
                </div>
                {!check.ok && <div className="mt-1 text-[11px] text-danger">{check.reason}</div>}
                <div className="mt-1 text-[10px] text-ink-500">A higher share than they ask for starts them with more loyalty; a lower one is refused.</div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
