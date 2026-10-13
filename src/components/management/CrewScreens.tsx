"use client";
import * as React from "react";
import { Gift, UserMinus } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { CREW_MEMBER_MAP, CREW_WORK_MAP, TRAINING_MAP } from "@/data/crew";
import { Button, Empty, Money, Panel, ProgressBar, Stat, Tag, cx } from "@/components/ui";
import { dismissMember, expectedCycle, giveBonus } from "@/simulation/crew/hk";
import { BALANCE } from "@/data/balance";
import { formatDuration, formatTime } from "@/utils/format";
import { AvatarPreview } from "@/components/menu/AvatarPreview";
import { PayoutTable } from "@/components/management/HkScreen";
import type { CrewMemberState } from "@/types/game";
import { useNow } from "@/hooks/useNow";

function assignmentLabel(m: CrewMemberState, now: number): string {
  if (m.assignment.kind === "idle") return "Idle";
  if (m.assignment.kind === "training") return `Training: ${TRAINING_MAP[m.assignment.programId]?.name} (${formatDuration(Math.max(0, m.assignment.endsAt - now))})`;
  const work = CREW_WORK_MAP[m.assignment.workId];
  return `Working: ${work?.name} (cycle ${formatDuration(Math.max(0, m.assignment.cycleStartedAt + (work?.cycleMs ?? 0) - now))})`;
}

export function MemberCard({ m, onOpen }: { m: CrewMemberState; onOpen: () => void }) {
  const def = CREW_MEMBER_MAP[m.defId];
  const now = useNow(1000);
  if (!def) return null;
  return (
    <button onClick={onOpen} className={cx("flex w-full items-start gap-3 rounded-md border p-2 text-left text-xs transition-colors hover:border-gold-400/60", m.loyalty < 25 ? "border-danger/50 bg-danger-dim/10" : "border-ink-700 bg-ink-900")} data-testid={`member-${m.defId}`}>
      <div className="shrink-0 rounded border border-ink-600 bg-ink-950 p-0.5"><AvatarPreview skin={def.palette.skin} hair={def.palette.hair} outfit={def.palette.outfit} size={2} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="font-semibold">{def.name}</span><Tag>L{m.level}</Tag><Tag color="bg-ink-800 text-gold-300">{m.contract.sharePct}% share</Tag></div>
        <div className="text-ink-400">&quot;{def.nickname}&quot; · {assignmentLabel(m, now)}</div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
          <ProgressBar value={m.morale} max={100} label="Morale" color={m.morale >= 60 ? "bg-growth" : m.morale >= 35 ? "bg-gold-500" : "bg-danger"} height="h-1" />
          <ProgressBar value={m.loyalty} max={100} label="Loyalty" color={m.loyalty >= 50 ? "bg-accent" : m.loyalty >= 25 ? "bg-gold-500" : "bg-danger"} height="h-1" />
        </div>
        {m.unpaid > 0 && <div className="mt-1 text-[10px] text-danger">{m.unpaid} unpaid cycle(s) — loyalty is dropping.</div>}
      </div>
    </button>
  );
}

export function CrewScreen() {
  const game = useGameStore((s) => s.game)!;
  const openScreen = useUiStore((s) => s.openScreen);
  if (!game.hk.unlocked) return <Empty>Unlock the Hustler Kingdom first.</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <Button variant="primary" onClick={() => openScreen("recruit")} disabled={game.hk.hqLevel === 0}>Recruit</Button>
        <Button onClick={() => openScreen("training")}>Assignments</Button>
        <Button onClick={() => openScreen("contracts")}>Contracts</Button>
      </div>
      {game.hk.members.length === 0 ? <Empty>{game.hk.hqLevel === 0 ? "Rent a headquarters in the HK screen, then recruit." : "Nobody yet. Recruit from the pool."}</Empty> : (
        <div className="grid gap-2 md:grid-cols-2">{game.hk.members.map((m) => <MemberCard key={m.id} m={m} onOpen={() => openScreen("crewMember", m.id)} />)}</div>
      )}
      {game.hk.departed.length > 0 && <p className="text-[11px] text-ink-500">Departed: {game.hk.departed.map((id) => CREW_MEMBER_MAP[id]?.name ?? id).join(", ")}</p>}
    </div>
  );
}

export function CrewMemberScreen({ memberId }: { memberId: string | null }) {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const openScreen = useUiStore((s) => s.openScreen);
  const now = useNow(1000);
  const m = game.hk.members.find((x) => x.id === memberId);
  if (!m) return <Empty>Member not found.</Empty>;
  const def = CREW_MEMBER_MAP[m.defId]!;
  const work = m.assignment.kind === "work" ? CREW_WORK_MAP[m.assignment.workId] : null;
  const expected = work ? expectedCycle(game, m, work) : null;
  const xpNeeded = BALANCE.hk.levelXp(m.level);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded border border-ink-600 bg-ink-950 p-1"><AvatarPreview skin={def.palette.skin} hair={def.palette.hair} outfit={def.palette.outfit} size={4} /></div>
        <div className="text-xs">
          <div className="font-pixel text-base font-bold text-gold-400">{def.name} <span className="text-xs font-normal text-ink-400">&quot;{def.nickname}&quot;</span></div>
          <div className="text-ink-300">{def.background}</div>
          <div className="mt-1 italic text-ink-400">&quot;{def.quote}&quot;</div>
          <div className="mt-1 flex flex-wrap gap-1">{def.traits.map((t) => <Tag key={t} color="bg-purple/30 text-ink-100">{t}</Tag>)}<Tag>Potential {def.potential}/10</Tag></div>
          <div className="mt-1 text-ink-400">Personality: {def.personality} · Motivation: {def.motivation}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
        <Stat label="Level" value={`${m.level} (${m.xp}/${xpNeeded} XP)`} />
        <Stat label="Contract" value={`${m.contract.sharePct}% share (v${m.contract.version})`} hint={`Signed ${formatTime(m.contract.signedAt)}`} />
        <Stat label="Morale / Loyalty" value={`${Math.round(m.morale)} / ${Math.round(m.loyalty)}`} />
        <Stat label="Status" value={assignmentLabel(m, now)} />
        <Stat label="Total gross" value={<Money amount={m.totalGross} />} />
        <Stat label="Earned (their share)" value={<Money amount={m.totalEarned} />} />
        <Stat label="Cycles / trainings" value={`${m.cyclesCompleted} / ${m.trainingsCompleted}`} />
        <Stat label="Complaints" value={m.complaints} hint="Rises when morale is low or contracts are refused." />
      </div>
      <Panel title="Skills">
        <div className="grid gap-1 sm:grid-cols-2">{(Object.keys(m.skills) as (keyof typeof m.skills)[]).map((k) => <ProgressBar key={k} value={m.skills[k]} max={10} label={`${k} ${m.skills[k]}/10`} color="bg-accent" />)}</div>
      </Panel>
      {expected && work && (
        <Panel title={`Expected per cycle: ${work.name}`}>
          <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
            <div><div className="text-ink-400">Gross</div><Money amount={expected.gross} /></div><div><div className="text-ink-400">Costs</div><Money amount={-expected.operatingCost} /></div><div><div className="text-ink-400">Net</div><Money amount={expected.net} /></div><div><div className="text-ink-400">Member {m.contract.sharePct}%</div><Money amount={expected.memberShare} /></div><div><div className="text-ink-400">HK</div><Money amount={expected.hkRevenue} className="text-growth" /></div>
          </div>
        </Panel>
      )}
      <div className="flex flex-wrap gap-1">
        <Button variant="primary" onClick={() => openScreen("training", m.id)}>Assign work / training</Button>
        <Button onClick={() => openScreen("contracts")}>Renegotiate contract</Button>
        <Button icon={<Gift size={12} />} onClick={() => ask({ title: "Give a bonus?", message: "Pay a ₦25,000 bonus. Loyalty and morale rise (about +5 each).", confirmLabel: "Pay bonus", onConfirm: () => { const r = act((s, ctx) => giveBonus(s, m.id, 25_000, ctx.now)); toast(r.ok ? "Bonus paid. They smiled." : r.reason, r.ok ? "good" : "bad"); } })}>Bonus ₦25k</Button>
        <Button variant="danger" icon={<UserMinus size={12} />} onClick={() => ask({ title: "Dismiss member?", message: `${def.name} will leave and cannot be re-recruited. Other members lose a little loyalty.`, danger: true, confirmLabel: "Dismiss", onConfirm: () => { act((s, ctx) => dismissMember(s, m.id, ctx.now)); openScreen("crew"); } })}>Dismiss</Button>
      </div>
      <Panel title="Performance history"><PayoutTable memberId={m.id} limit={15} /></Panel>
      {m.contractHistory.length > 0 && <Panel title="Contract history"><ul className="text-xs">{m.contractHistory.map((c) => <li key={c.version}>v{c.version}: {c.sharePct}% signed {formatTime(c.signedAt)}</li>)}<li className="text-gold-300">v{m.contract.version}: {m.contract.sharePct}% (current)</li></ul></Panel>}
    </div>
  );
}
