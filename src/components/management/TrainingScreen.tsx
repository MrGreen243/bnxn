"use client";
import * as React from "react";
import { BookOpen, Briefcase, Square } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { CREW_MEMBER_MAP, CREW_WORK, CREW_WORK_MAP, TRAINING_MAP, TRAINING_PROGRAMS } from "@/data/crew";
import { Button, Empty, Money, Tabs, Tag, cx } from "@/components/ui";
import { assignTraining, assignWork, canAssignTraining, canAssignWork, expectedCycle, unassign } from "@/simulation/crew/hk";
import { getMods } from "@/simulation/modifiers";
import { effectiveRisk } from "@/simulation/risk/risk";
import { formatDuration, formatPct } from "@/utils/format";
import { useNow } from "@/hooks/useNow";

export function TrainingScreen({ memberId }: { memberId: string | null }) {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [sel, setSel] = React.useState<string | null>(memberId ?? game.hk.members[0]?.id ?? null);
  const [tab, setTab] = React.useState<"work" | "training">("work");
  const now = useNow(1000);
  if (!game.hk.unlocked) return <Empty>Unlock the Hustler Kingdom first.</Empty>;
  if (game.hk.members.length === 0) return <Empty>No crew members yet. Recruit first.</Empty>;
  const m = game.hk.members.find((x) => x.id === sel) ?? game.hk.members[0]!;
  const def = CREW_MEMBER_MAP[m.defId]!;
  const mods = getMods(game);
  return (
    <div className="grid gap-3 md:grid-cols-[200px_1fr]">
      <div className="space-y-1">
        {game.hk.members.map((x) => {
          const d = CREW_MEMBER_MAP[x.defId];
          return (
            <button key={x.id} onClick={() => setSel(x.id)} className={cx("w-full rounded-md border px-2 py-1.5 text-left text-xs", x.id === m.id ? "border-gold-400 bg-ink-800" : "border-ink-700 bg-ink-900")}>
              <div className="font-semibold">{d?.nickname}</div>
              <div className="text-[10px] text-ink-400">{x.assignment.kind === "idle" ? "Idle" : x.assignment.kind === "work" ? CREW_WORK_MAP[x.assignment.workId]?.name : TRAINING_MAP[x.assignment.programId]?.name}</div>
            </button>
          );
        })}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <div><span className="font-semibold">{def.name}</span> · L{m.level} · {m.contract.sharePct}% share · morale {Math.round(m.morale)}</div>
          {m.assignment.kind !== "idle" && <Button size="sm" variant="ghost" icon={<Square size={12} />} onClick={() => { const r = act((s) => unassign(s, m.id)); toast(r.ok ? "Unassigned." : r.reason, r.ok ? "info" : "bad"); }}>Stop current</Button>}
        </div>
        {m.assignment.kind === "training" && <div className="mb-2 rounded-md border border-accent/40 bg-ink-800 p-2 text-xs">Training {TRAINING_MAP[m.assignment.programId]?.name}: {formatDuration(Math.max(0, m.assignment.endsAt - now))} left. Training can&apos;t be interrupted.</div>}
        <Tabs tabs={[{ id: "work", label: "Work assignments" }, { id: "training", label: "Training programs" }]} value={tab} onChange={setTab} />
        {tab === "work" ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {CREW_WORK.map((w) => {
              const check = canAssignWork(game, m.id, w.id);
              const exp = expectedCycle(game, m, w, mods);
              const risk = w.risk > 0 ? effectiveRisk(w.risk, game.player.stats.heat, mods) : 0;
              const active = m.assignment.kind === "work" && m.assignment.workId === w.id;
              return (
                <div key={w.id} className={cx("rounded-md border p-2 text-xs", active ? "border-gold-400 bg-ink-800" : w.legit ? "border-ink-700 bg-ink-900" : "border-danger/40 bg-danger-dim/10", !check.ok && !active && "opacity-70")} data-testid={`work-${w.id}`}>
                  <div className="flex items-center justify-between"><span className="font-semibold inline-flex items-center gap-1"><Briefcase size={12} /> {w.name}</span><div className="flex gap-1">{!w.legit && <Tag color="bg-danger-dim text-ink-100">Risky</Tag>}<Tag>Tier {w.minHkTier}+</Tag></div></div>
                  <div className="text-ink-300">{w.description}</div>
                  <div className="mt-1 text-[11px] text-ink-400">Needs: {Object.entries(w.requiredSkills).map(([k, v]) => `${k} ${v}`).join(", ")}{w.requiredFacility ? ` · ${w.requiredFacility.id.replace("fac_", "")} L${w.requiredFacility.level}` : ""} · cycle {formatDuration(w.cycleMs)}{risk > 0 ? ` · ${formatPct(risk)} bust risk` : ""}</div>
                  <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[10px]"><div><div className="text-ink-500">Gross</div><Money amount={exp.gross} className="text-[11px]" /></div><div><div className="text-ink-500">Costs</div><Money amount={-exp.operatingCost} className="text-[11px]" /></div><div><div className="text-ink-500">Member</div><Money amount={exp.memberShare} className="text-[11px]" /></div><div><div className="text-ink-500">HK</div><Money amount={exp.hkRevenue} className="text-[11px] text-growth" /></div></div>
                  {!check.ok && !active && <div className="mt-1 text-[11px] text-danger">{check.reason}</div>}
                  <div className="mt-1 text-right"><Button size="sm" variant={active ? "ghost" : "primary"} disabled={active || !check.ok} onClick={() => { const r = act((s, ctx) => assignWork(s, m.id, w.id, ctx.now)); toast(r.ok ? `${def.nickname} is now on ${w.name}.` : r.reason, r.ok ? "good" : "bad"); }} data-testid={`assign-${w.id}`}>{active ? "Assigned" : "Assign"}</Button></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {TRAINING_PROGRAMS.map((t) => {
              const check = canAssignTraining(game, m.id, t.id);
              const duration = Math.round(t.durationMs / mods.crewTrainingSpeed);
              return (
                <div key={t.id} className={cx("rounded-md border border-ink-700 bg-ink-900 p-2 text-xs", !check.ok && "opacity-70")} data-testid={`training-${t.id}`}>
                  <div className="flex items-center justify-between"><span className="font-semibold inline-flex items-center gap-1"><BookOpen size={12} /> {t.name}</span><Tag>+{t.skillGain} {t.skill}</Tag></div>
                  <div className="text-ink-300">{t.description}</div>
                  <div className="mt-1 text-[11px] text-ink-400">{formatDuration(duration)} · {t.xpGain} XP{t.requiredFacility ? ` · needs ${t.requiredFacility.id.replace("fac_", "")} L${t.requiredFacility.level}` : ""} · {def.trainingPreference === t.id ? "preferred by this member" : ""}</div>
                  {!check.ok && <div className="mt-1 text-[11px] text-danger">{check.reason}</div>}
                  <div className="mt-1 flex items-center justify-between"><Money amount={t.cost} /><Button size="sm" variant="primary" disabled={!check.ok} onClick={() => { const r = act((s, ctx) => assignTraining(s, m.id, t.id, ctx.now)); toast(r.ok ? `${def.nickname} started ${t.name}.` : r.reason, r.ok ? "good" : "bad"); }} data-testid={`train-${t.id}`}>Start</Button></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
