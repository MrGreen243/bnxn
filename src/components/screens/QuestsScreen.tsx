"use client";
import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { QUESTS, QUEST_MAP } from "@/data/quests";
import { NPC_MAP } from "@/data/npcs";
import { Empty, Panel, ProgressBar, Tabs, Tag, cx } from "@/components/ui";
import { conditionProgress } from "@/simulation/progression/quests";
import { checkAll } from "@/simulation/requirements";

export function QuestsScreen() {
  const game = useGameStore((s) => s.game)!;
  const [tab, setTab] = React.useState<"active" | "available" | "completed">("active");
  const active = Object.entries(game.quests.active).map(([id, p]) => ({ def: QUEST_MAP[id]!, p })).filter((x) => x.def);
  const completed = game.quests.completed.map((id) => QUEST_MAP[id]).filter(Boolean);
  const available = QUESTS.filter((q) => !game.quests.active[q.id] && (!game.quests.completed.includes(q.id) || q.repeatable) && checkAll(game, q.requirements) && !q.autoStart && !q.id.startsWith("q_intro"));
  return (
    <div>
      <Tabs tabs={[{ id: "active", label: "Active", badge: active.length }, { id: "available", label: "Available" }, { id: "completed", label: "Completed" }]} value={tab} onChange={setTab} />
      {tab === "active" && (active.length === 0 ? <Empty>No active quests. Talk to people around the city.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {active.map(({ def, p }) => (
            <Panel key={def.id} title={def.title} subtitle={`${def.kind === "story" ? `Chapter ${def.chapter}` : "Side quest"} · from ${NPC_MAP[def.giver]?.name ?? def.giver}`}>
              <p className="mb-2 text-xs text-ink-300">{def.summary}</p>
              <ol className="space-y-1.5">
                {def.stages.map((st, i) => {
                  const done = i < p.stage;
                  const current = i === p.stage;
                  const prog = current ? conditionProgress(game, st.condition) : null;
                  return (
                    <li key={st.id} className={cx("rounded-md border px-2 py-1.5 text-xs", current ? "border-gold-400/60 bg-ink-800" : done ? "border-growth/40 bg-growth-dim/10 text-ink-400" : "border-ink-700 bg-ink-900 text-ink-500")}>
                      <div className="flex items-center gap-2">{done ? <CheckCircle2 size={14} className="text-growth" /> : <Circle size={14} />}<span className={done ? "line-through" : ""}>{st.objective}</span></div>
                      {current && st.hint && <div className="ml-6 text-[11px] text-ink-400">{st.hint}</div>}
                      {prog && prog.target > 0 && <ProgressBar value={prog.current} max={prog.target} className="ml-6 mt-1 w-auto" label={`${Math.min(prog.current, prog.target).toLocaleString()} / ${prog.target.toLocaleString()}`} height="h-1.5" />}
                    </li>
                  );
                })}
              </ol>
              <div className="mt-2 text-[11px] text-ink-400">Reward: {def.rewards.map(describeReward).filter(Boolean).join(", ")}</div>
            </Panel>
          ))}
        </div>
      ))}
      {tab === "available" && (available.length === 0 ? <Empty>Nothing new. Keep progressing and talking to NPCs.</Empty> : (
        <ul className="grid gap-2 md:grid-cols-2">
          {available.map((q) => (
            <li key={q.id} className="panel-raised px-3 py-2 text-xs"><div className="flex items-center gap-2"><span className="font-semibold">{q.title}</span><Tag>{q.kind}</Tag></div><div className="text-ink-300">{q.summary}</div><div className="text-[11px] text-ink-400">Talk to {NPC_MAP[q.giver]?.name ?? q.giver} to start.</div></li>
          ))}
        </ul>
      ))}
      {tab === "completed" && (completed.length === 0 ? <Empty>No completed quests yet.</Empty> : (
        <ul className="grid gap-2 md:grid-cols-2">{completed.map((q) => <li key={q!.id} className="panel-raised px-3 py-2 text-xs"><span className="font-semibold">{q!.title}</span> <Tag color="bg-growth-dim text-ink-100">Done</Tag><div className="text-ink-400">{q!.summary}</div></li>)}</ul>
      ))}
    </div>
  );
}

function describeReward(e: { type: string; amount?: number; skill?: string; stat?: string; itemId?: string }): string {
  switch (e.type) {
    case "cash": return `₦${(e.amount ?? 0).toLocaleString()}`;
    case "xp": return `${e.skill} +${e.amount} XP`;
    case "stat": return `${e.stat} ${(e.amount ?? 0) > 0 ? "+" : ""}${e.amount}`;
    case "item": return `item: ${e.itemId}`;
    case "hkUnlock": return "Hustler Kingdom unlocked";
    case "followers": return `+${e.amount} followers`;
    default: return "";
  }
}
