"use client";
import * as React from "react";
import { AlertTriangle, Clock, ListPlus, Play, X, Zap } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { ACTIVITIES, ACTIVITY_MAP } from "@/data/activities";
import type { ActivityCategory } from "@/data/types";
import { Button, Empty, Money, Panel, ProgressBar, Tabs, Tag, cx } from "@/components/ui";
import { activitySlots } from "@/simulation/modifiers";
import { cancelActivity, dequeueActivity, previewActivity, queueActivity } from "@/simulation/idle/activities";
import { describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { formatDuration, formatPct } from "@/utils/format";
import { tryStartActivity } from "@/components/game/interactions";
import { SKILL_MAP } from "@/data/skills";
import { DISTRICT_MAP } from "@/data/districts";
import { useNow } from "@/hooks/useNow";

const CATS: { id: ActivityCategory | "all" | "here"; label: string }[] = [
  { id: "here", label: "This district" }, { id: "all", label: "All" }, { id: "delivery", label: "Delivery" }, { id: "digital", label: "Digital" }, { id: "creative", label: "Creative" }, { id: "trade", label: "Trade" }, { id: "service", label: "Service" }, { id: "risky", label: "Opportunities" },
];

export function ActivitiesScreen({ category }: { category: string | null }) {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [tab, setTab] = React.useState<ActivityCategory | "all" | "here">((category as ActivityCategory) ?? "here");
  const now = useNow(1000);
  const slots = activitySlots(game);
  const list = ACTIVITIES.filter((a) => {
    if (tab === "here") return a.district === game.player.districtId || a.district === "any";
    if (tab === "all") return true;
    return a.category === tab;
  }).filter((a) => a.legit || game.quests.flags.met_chidi === true || a.requirements.some((r) => r.type === "stat" && r.stat === "streetRep"));
  const previews = list.map((a) => previewActivity(game, a, now)).sort((a, b) => Number(b.available) - Number(a.available));

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      <div>
        <Tabs tabs={CATS} value={tab} onChange={setTab} />
        {previews.length === 0 ? <Empty>No work here yet. Explore other districts or unlock more skills.</Empty> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {previews.map((p) => {
              const unmet = unmetRequirements(game, p.def.requirements);
              const district = DISTRICT_MAP[p.def.district as keyof typeof DISTRICT_MAP];
              return (
                <li key={p.def.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", p.def.legit ? "border-ink-700 bg-ink-900" : "border-danger/40 bg-danger-dim/10", !p.available && "opacity-70")} data-testid={`activity-${p.def.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink-100">{p.def.name}</div>
                      <div className="text-[11px] italic text-ink-400">{p.def.flavor}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!p.def.legit && <Tag color="bg-danger-dim text-ink-100">Risky</Tag>}
                      {p.def.offline ? <Tag color="bg-growth-dim text-ink-100">Offline OK</Tag> : <Tag>Online only</Tag>}
                    </div>
                  </div>
                  <p className="text-ink-300">{p.def.description}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-300">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatDuration(p.durationMs)}</span>
                    <span className="inline-flex items-center gap-1"><Zap size={11} /> {p.def.energyCost} energy</span>
                    {p.rewardMax > 0 && <span><Money amount={p.rewardMin} /> – <Money amount={p.rewardMax} /></span>}
                    {p.risk > 0 && <span className="inline-flex items-center gap-1 text-danger"><AlertTriangle size={11} /> {formatPct(p.risk)} bust chance</span>}
                    <span className="text-accent">{Object.entries(p.def.xp).map(([k, v]) => `${SKILL_MAP[k]?.name} +${v}`).join(", ")}</span>
                    {p.multiplier !== 1 && <span className="text-gold-300">×{p.multiplier.toFixed(2)} from skills & gear</span>}
                    {p.def.district !== "any" && district && <span className="text-ink-500">{district.name}</span>}
                  </div>
                  {unmet.length > 0 && <div className="text-[11px] text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
                  {p.reasons.length > 0 && unmet.length === 0 && <div className="text-[11px] text-danger">{p.reasons.join(" · ")}{p.restrictedUntil > now ? ` (${formatDuration(p.restrictedUntil - now)})` : ""}</div>}
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="primary" disabled={!p.available || game.player.energy < p.def.energyCost} onClick={() => tryStartActivity(p.def.id)} icon={<Play size={12} />} data-testid={`start-${p.def.id}`}>
                      {game.activities.running.length >= slots ? "Slots busy" : "Start"}
                    </Button>
                    <Button size="sm" disabled={!p.available} onClick={() => { const r = act((s) => queueActivity(s, p.def.id)); toast(r.ok ? "Queued." : r.reason ?? "", r.ok ? "info" : "bad"); }} icon={<ListPlus size={12} />}>Queue</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <Panel title={`Active (${game.activities.running.length}/${slots})`} subtitle="Rewards are locked in at start and paid on completion. Offline-eligible jobs finish while you're away.">
          {game.activities.running.length === 0 ? <Empty>Nothing running. Start a job.</Empty> : (
            <ul className="space-y-2">
              {game.activities.running.map((r) => {
                const def = ACTIVITY_MAP[r.activityId];
                return (
                  <li key={r.instanceId} className="panel-raised px-2 py-2 text-xs">
                    <div className="flex items-center justify-between"><span className="font-semibold">{def?.name}</span><button className="text-ink-400 hover:text-danger" aria-label="Cancel activity" onClick={() => act((s) => cancelActivity(s, r.instanceId))}><X size={14} /></button></div>
                    <ProgressBar value={Math.min(r.endsAt - r.startedAt, now - r.startedAt)} max={r.endsAt - r.startedAt} className="mt-1" color={def?.legit ? "bg-growth" : "bg-danger"} />
                    <div className="mt-1 flex justify-between text-[10px] text-ink-400"><span>{formatDuration(Math.max(0, r.endsAt - now))} left</span><span>Pays <Money amount={r.cashReward} className="text-[10px]" /></span></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title={`Queue (${game.activities.queue.length})`} subtitle="Starts automatically when a slot frees up.">
          {game.activities.queue.length === 0 ? <Empty>Queue is empty.</Empty> : (
            <ul className="space-y-1">
              {game.activities.queue.map((id, i) => (
                <li key={`${id}_${i}`} className="flex items-center justify-between panel-raised px-2 py-1 text-xs"><span>{i + 1}. {ACTIVITY_MAP[id]?.name}</span><button className="text-ink-400 hover:text-danger" aria-label="Remove from queue" onClick={() => act((s) => dequeueActivity(s, i))}><X size={14} /></button></li>
              ))}
            </ul>
          )}
        </Panel>
        {game.activities.results.length > 0 && (
          <Panel title="Recent results">
            <ul className="space-y-1">
              {game.activities.results.slice(0, 6).map((r) => (
                <li key={r.id} className={cx("rounded-md border px-2 py-1 text-[11px]", r.outcome === "bust" ? "border-danger/50 bg-danger-dim/20" : "border-ink-700 bg-ink-900")}>
                  <div className="flex justify-between"><span className="font-semibold">{ACTIVITY_MAP[r.activityId]?.name}</span>{r.cash > 0 && <Money amount={r.cash} className="text-[11px]" />}</div>
                  <div className="text-ink-300">{r.message}</div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
