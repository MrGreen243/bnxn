"use client";
import * as React from "react";
import { BookOpen, Briefcase, Castle, Heart, Landmark, ListChecks, Map as MapIcon, MessageSquare, Newspaper, Sparkles, TrendingUp, X, Gift } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore, type ScreenId } from "@/store/uiStore";
import { Button, Empty, Money, ProgressBar, cx } from "@/components/ui";
import { AdSlot } from "@/components/ads/AdSlot";
import { formatNumber, formatTime } from "@/utils/format";
import { addPost, adjustStat } from "@/simulation/effects";
import { EVENT_MAP } from "@/data/events";
import { DAILY_LABELS } from "@/simulation/daily";
import { claimDaily } from "@/simulation/daily";
import { formatNaira } from "@/utils/format";
import { useNow } from "@/hooks/useNow";

const APPS: { id: ScreenId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "social", label: "Feed", icon: <MessageSquare size={20} />, color: "bg-purple" },
  { id: "activities", label: "Jobs", icon: <Briefcase size={20} />, color: "bg-gold-500" },
  { id: "quests", label: "Quests", icon: <BookOpen size={20} />, color: "bg-accent" },
  { id: "bank", label: "Bank", icon: <Landmark size={20} />, color: "bg-growth" },
  { id: "investments", label: "Invest", icon: <TrendingUp size={20} />, color: "bg-growth-dim" },
  { id: "map", label: "Map", icon: <MapIcon size={20} />, color: "bg-ink-500" },
  { id: "hk", label: "HK", icon: <Castle size={20} />, color: "bg-danger-dim" },
  { id: "events", label: "News", icon: <Newspaper size={20} />, color: "bg-ink-600" },
  { id: "daily", label: "Daily", icon: <ListChecks size={20} />, color: "bg-gold-400" },
];

export function PhoneOverlay() {
  const open = useUiStore((s) => s.phoneOpen);
  const setOpen = useUiStore((s) => s.setPhoneOpen);
  const openScreen = useUiStore((s) => s.openScreen);
  const game = useGameStore((s) => s.game);
  if (!open || !game) return null;
  const pending = game.events.pending.length;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-ink-950/60 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="animate-slide-up flex h-[80vh] w-full max-w-[360px] flex-col rounded-t-3xl border-4 border-ink-600 bg-ink-950 shadow-2xl sm:h-[640px] sm:rounded-3xl" role="dialog" aria-label="Phone" data-testid="phone">
        <div className="flex items-center justify-between px-5 pt-3 text-[11px] text-ink-300">
          <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{formatNumber(game.social.followers)} followers</span>
          <button onClick={() => setOpen(false)} aria-label="Close phone" className="touch-target flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="px-5 pb-2 pt-2">
          <div className="font-pixel text-xs text-ink-400">Day {game.meta.gameDay}</div>
          <div className="font-pixel text-2xl font-bold text-gold-400"><Money amount={game.player.cash} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 py-2">
          {APPS.map((a) => (
            <button key={a.id} onClick={() => { setOpen(false); openScreen(a.id); }} className="flex flex-col items-center gap-1 text-[11px] text-ink-200" data-testid={`app-${a.id}`}>
              <span className={cx("relative flex h-12 w-12 items-center justify-center rounded-2xl text-ink-950 shadow", a.color)}>{a.icon}{a.id === "events" && pending > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{pending}</span>}</span>
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-auto px-4 pb-4">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-ink-500">Sponsored</div>
          <AdSlot placement="phone_feed" compact />
        </div>
      </div>
    </div>
  );
}

export function SocialScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const [draft, setDraft] = React.useState("");
  const now = useNow(5000);
  const canPost = now - game.social.lastPostAt > 60_000;
  const post = () => {
    const text = draft.trim();
    if (!text) return;
    act((s, ctx) => {
      addPost(s, text, s.player.name, ctx.now, "player");
      const gain = 0.5 + Math.min(2, s.social.followers / 20_000);
      adjustStat(s, "fame", gain);
      s.social.followers += Math.round(20 + s.player.stats.fame * 8);
    });
    setDraft("");
    toast("Posted. Fame +, followers +.", "good");
  };
  return (
    <div className="space-y-3">
      <div className="panel-raised flex items-center justify-between px-3 py-2 text-xs">
        <span><span className="font-semibold">{game.player.name}</span> · {formatNumber(game.social.followers)} followers</span>
        <span className="inline-flex items-center gap-1 text-purple"><Sparkles size={12} /> Fame {Math.round(game.player.stats.fame)}</span>
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={140} placeholder={canPost ? "Post something to the timeline…" : "You posted recently. Wait a minute."} disabled={!canPost} aria-label="New post" />
        <Button variant="primary" disabled={!canPost || !draft.trim()} onClick={post}>Post</Button>
      </div>
      <ul className="space-y-2">
        {game.social.posts.map((p, i) => (
          <React.Fragment key={p.id}>
            <li className={cx("rounded-md border px-3 py-2 text-xs", p.kind === "player" ? "border-purple/40 bg-ink-800" : p.kind === "news" ? "border-ink-600 bg-ink-900" : "border-ink-700 bg-ink-900")}>
              <div className="flex justify-between text-[11px] text-ink-400"><span className="font-semibold text-ink-200">{p.author}</span><span>{formatTime(p.at)}</span></div>
              <div className="mt-1 text-ink-100">{p.text}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-400"><Heart size={11} /> {formatNumber(p.likes)}</div>
            </li>
            {i === 1 && <li><AdSlot placement="phone_feed" /></li>}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

export function EventsLogScreen() {
  const game = useGameStore((s) => s.game)!;
  return (
    <div className="space-y-3">
      {game.events.pending.length > 0 && (
        <div className="rounded-md border border-gold-400/60 bg-ink-800 p-3 text-xs">
          <div className="font-semibold text-gold-300">Waiting for your decision</div>
          <ul className="mt-1 list-inside list-disc">{game.events.pending.map((p) => <li key={p.id}>{EVENT_MAP[p.defId]?.title ?? p.defId}</li>)}</ul>
          <div className="mt-1 text-ink-400">Close all screens to respond.</div>
        </div>
      )}
      {game.events.log.length === 0 ? <Empty>Nothing has happened yet. Give it time.</Empty> : (
        <ul className="space-y-1">
          {game.events.log.map((e, i) => (
            <li key={i} className={cx("rounded-md border px-3 py-1.5 text-xs", e.kind === "good" ? "border-growth/40" : e.kind === "bad" ? "border-danger/40" : e.kind === "money" ? "border-gold-400/40" : "border-ink-700")}>
              <span className="mr-2 text-[10px] text-ink-500">{formatTime(e.at)}</span>{e.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DailyScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-400">Objectives reset every real day. Rewards scale with your wealth.</p>
      {game.daily.objectives.length === 0 ? <Empty>Objectives will appear shortly.</Empty> : game.daily.objectives.map((o) => (
        <div key={o.id} className="panel-raised px-3 py-2 text-xs">
          <div className="flex items-center justify-between"><span className="font-semibold">{DAILY_LABELS[o.kind]}</span><span className="text-gold-300 inline-flex items-center gap-1"><Gift size={12} /> {formatNaira(o.reward)}</span></div>
          <ProgressBar value={o.progress} max={o.target} className="mt-1" label={`${o.kind === "earn" ? formatNaira(Math.min(o.progress, o.target)) : Math.min(o.progress, o.target)} / ${o.kind === "earn" ? formatNaira(o.target) : o.target}`} height="h-1.5" />
          <div className="mt-1 text-right">
            <Button size="sm" variant={o.claimed ? "ghost" : "primary"} disabled={o.claimed || o.progress < o.target} onClick={() => { const r = act((s, ctx) => claimDaily(s, o.id, ctx.now)); toast(r.ok ? `Claimed ${formatNaira(o.reward)}!` : r.reason ?? "", r.ok ? "money" : "bad"); }}>{o.claimed ? "Claimed" : "Claim"}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
