"use client";
import * as React from "react";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { Button, Modal, Money, cx } from "@/components/ui";
import { NPC_MAP } from "@/data/npcs";
import { EVENT_MAP } from "@/data/events";
import { availableChoices, chooseDialogue, continueDialogue } from "@/simulation/npc";
import { resolveEvent } from "@/simulation/events/events";
import { checkAll, describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { performAction, tryStartActivity } from "@/components/game/interactions";
import { formatDurationLong } from "@/utils/format";
import { AvatarPreview } from "@/components/menu/AvatarPreview";

export function DialogueOverlay() {
  const dialogue = useUiStore((s) => s.dialogue);
  const setDialogue = useUiStore((s) => s.setDialogue);
  const openScreen = useUiStore((s) => s.openScreen);
  const game = useGameStore((s) => s.game);
  const act = useGameStore((s) => s.act);
  if (!dialogue || !game) return null;
  const npc = NPC_MAP[dialogue.npcId];
  const node = dialogue.node;
  const choices = availableChoices(game, node);
  const applyRequests = (r: { openScreen?: string; startActivity?: string }) => {
    if (r.openScreen) openScreen(r.openScreen);
    if (r.startActivity) tryStartActivity(r.startActivity);
  };
  const pick = (i: number) => {
    const result = act((s, ctx) => chooseDialogue(s, dialogue.npcId, node, i, ctx.now));
    applyRequests(result.requests);
    if (result.next) setDialogue({ npcId: dialogue.npcId, node: result.next });
    else setDialogue(null);
  };
  const next = () => {
    if (node.next) {
      const n = act((s, ctx) => continueDialogue(s, dialogue.npcId, node, ctx.now));
      if (n) setDialogue({ npcId: dialogue.npcId, node: n });
      else setDialogue(null);
    } else setDialogue(null);
  };
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[calc(var(--safe-bottom)+12px)]" role="dialog" aria-label={`Conversation with ${npc?.name ?? "someone"}`}>
      <div className="panel animate-slide-up w-full max-w-2xl p-3">
        <div className="flex gap-3">
          {npc && (
            <div className="hidden shrink-0 rounded-md border border-ink-600 bg-ink-950 p-1 sm:block">
              <AvatarPreview skin={npc.palette.skin} hair={npc.palette.hair} outfit={npc.palette.outfit} size={3} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-pixel text-sm font-bold text-gold-400">{node.speaker ?? npc?.name ?? "???"} <span className="text-xs font-normal text-ink-400">— {npc?.role}</span></div>
            <p className="mt-1 text-sm leading-relaxed text-ink-100">{node.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {choices.length > 0 ? (
                choices.map(({ choice, available }, i) => {
                  const unmet = unmetRequirements(game, choice.requirements);
                  return (
                    <Button key={i} variant={i === 0 ? "primary" : "secondary"} size="sm" disabled={!available} onClick={() => pick(i)} title={unmet.length ? `Requires: ${unmet.map(describeRequirement).join(", ")}` : undefined} data-testid="dialogue-choice">
                      {choice.text}
                      {!available && unmet.length > 0 && <span className="ml-1 text-[10px] text-ink-400">({describeRequirement(unmet[0]!)})</span>}
                    </Button>
                  );
                })
              ) : (
                <Button variant="primary" size="sm" onClick={next} data-testid="dialogue-next">{node.next ? "Continue" : "Okay"}</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionSheet() {
  const sheet = useUiStore((s) => s.actionSheet);
  const setActionSheet = useUiStore((s) => s.setActionSheet);
  const game = useGameStore((s) => s.game);
  if (!sheet || !game) return null;
  return (
    <Modal title={sheet.title} onClose={() => setActionSheet(null)} size="sm">
      <div className="flex flex-col gap-2" data-testid="action-sheet">
        {sheet.actions.map((a, i) => {
          const label = a.type === "talk" ? `Talk to ${NPC_MAP[a.npcId]?.name ?? a.npcId}` : a.type === "jobs" ? a.label ?? "Jobs" : a.type === "shop" ? a.label ?? "Shop" : a.type === "enter" ? a.label ?? "Enter" : a.type === "collect" ? a.label ?? "Collect revenue" : a.label;
          return (
            <Button key={i} variant={i === 0 ? "primary" : "secondary"} size="lg" className="justify-start" onClick={() => performAction(a, sheet.target)}>
              {label}
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}

export function ConfirmDialog() {
  const confirm = useUiStore((s) => s.confirm);
  const close = useUiStore((s) => s.closeConfirm);
  if (!confirm) return null;
  return (
    <Modal title={confirm.title} onClose={close} size="sm" footer={
      <div className="flex justify-end gap-2">
        <Button onClick={close}>Cancel</Button>
        <Button variant={confirm.danger ? "danger" : "primary"} onClick={() => { confirm.onConfirm(); close(); }} data-testid="confirm-yes">{confirm.confirmLabel ?? "Confirm"}</Button>
      </div>
    }>
      <p className="text-sm text-ink-200">{confirm.message}</p>
    </Modal>
  );
}

export function OfflineSummaryDialog() {
  const open = useUiStore((s) => s.offlineSummaryOpen);
  const setOpen = useUiStore((s) => s.setOfflineSummaryOpen);
  const summary = useGameStore((s) => s.game?.offline.lastSummary ?? null);
  if (!open || !summary) return null;
  return (
    <Modal title="Welcome back" onClose={() => setOpen(false)} size="md" footer={<div className="flex justify-end"><Button variant="primary" onClick={() => setOpen(false)} data-testid="offline-close">Let&apos;s go</Button></div>}>
      <p className="mb-3 flex items-center gap-2 text-sm text-ink-300"><Clock size={14} /> You were away for {formatDurationLong(summary.elapsedMs)}{summary.cappedMs < summary.elapsedMs ? ` (simulated ${formatDurationLong(summary.cappedMs)} — offline cap)` : ""}.</p>
      {summary.clockWarning && <p className="mb-3 flex items-center gap-2 rounded border border-danger/60 bg-danger-dim/30 p-2 text-xs"><AlertTriangle size={14} /> Unusually large time jump detected. Rewards were capped as a safeguard.</p>}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Row label="Cash earned"><Money amount={summary.cashEarned} /></Row>
        <Row label="Expenses"><Money amount={-summary.expenses} /></Row>
        <Row label="Activities completed">{summary.activitiesCompleted}</Row>
        <Row label="Business income"><Money amount={summary.businessIncome} /></Row>
        <Row label="Crew income (HK share)"><Money amount={summary.crewIncome} /></Row>
        <Row label="Paid to crew"><Money amount={summary.crewPaid} /></Row>
        <Row label="Trainings finished">{summary.trainingsCompleted}</Row>
      </div>
      {summary.events.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-300">What happened</div>
          <ul className="list-inside list-disc space-y-1 text-xs text-ink-200">{summary.events.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-raised flex items-center justify-between px-3 py-2">
      <span className="text-xs text-ink-300">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

export function EventDialog() {
  const pending = useGameStore((s) => s.game?.events.pending[0] ?? null);
  const game = useGameStore((s) => s.game);
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const openScreen = useUiStore((s) => s.openScreen);
  const setEventOpen = useUiStore((s) => s.setEventOpen);
  const dialogue = useUiStore((s) => s.dialogue);
  const screen = useUiStore((s) => s.screen);
  const [result, setResult] = React.useState<string | null>(null);
  const visible = !!pending && !dialogue && !screen;
  React.useEffect(() => setEventOpen(visible), [visible, setEventOpen]);
  if (!game) return null;
  if (result) {
    return (
      <Modal title="Outcome" onClose={() => setResult(null)} size="sm" footer={<div className="flex justify-end"><Button variant="primary" onClick={() => setResult(null)}>Continue</Button></div>}>
        <p className="text-sm">{result}</p>
      </Modal>
    );
  }
  if (!visible || !pending) return null;
  const def = EVENT_MAP[pending.defId];
  if (!def) return null;
  return (
    <Modal title={<span className="inline-flex items-center gap-2"><Sparkles size={16} /> {def.title}</span>} size="md">
      <p className="text-sm leading-relaxed text-ink-100">{def.text}</p>
      <div className="mt-4 flex flex-col gap-2">
        {def.choices.map((c, i) => {
          const ok = checkAll(game, c.requirements);
          const unmet = unmetRequirements(game, c.requirements);
          return (
            <Button key={i} variant={i === 0 ? "primary" : "secondary"} className={cx("justify-start text-left")} disabled={!ok} data-testid="event-choice" onClick={() => {
              const r = act((s, ctx) => resolveEvent(s, pending.id, i, ctx.now));
              if (!r.ok) toast(r.reason ?? "Can't do that", "bad");
              else {
                setResult(r.text ?? null);
                if (r.requests?.openScreen) openScreen(r.requests.openScreen);
              }
            }}>
              <span>{c.label}{!ok && unmet.length ? <span className="ml-2 text-[10px] text-ink-400">({describeRequirement(unmet[0]!)})</span> : null}</span>
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const floating = useUiStore((s) => s.floating);
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-[calc(var(--safe-top)+56px)] z-40 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-1 px-3" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={cx("animate-slide-up w-full rounded-md border px-3 py-1.5 text-xs shadow-lg backdrop-blur", t.kind === "good" ? "border-growth/60 bg-growth-dim/70 text-ink-100" : t.kind === "bad" ? "border-danger/60 bg-danger-dim/80 text-ink-100" : t.kind === "money" ? "border-gold-400/60 bg-ink-900/90 text-gold-300" : "border-ink-500 bg-ink-900/90 text-ink-100")}>
            {t.text}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
        {floating.map((f, i) => (
          <div key={f.id} className={cx("animate-float-up font-pixel absolute whitespace-nowrap text-lg font-bold drop-shadow-[0_2px_0_#000]", f.kind === "money" ? "text-gold-300" : f.kind === "xp" ? "text-accent" : f.kind === "bad" ? "text-danger" : "text-ink-100")} style={{ left: `${(i % 3) * 30 - 30}px`, top: `${-i * 14}px` }}>
            {f.text}
          </div>
        ))}
      </div>
    </>
  );
}
