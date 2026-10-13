"use client";
import * as React from "react";
import { Briefcase, Castle, Map as MapIcon, Menu, Smartphone, Save, User, Flame, Star, BadgeCheck, Eye, Zap, Hand, Store, Backpack, BookOpen, Sparkles, Settings, Trophy, BarChart3, Landmark, Home, Car, Shirt, HelpCircle, Users, ListChecks } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore, type ScreenId } from "@/store/uiStore";
import { Button, Money, ProgressBar, cx } from "@/components/ui";
import { maxEnergy } from "@/simulation/modifiers";
import { ACTIVITY_MAP } from "@/data/activities";
import { DISTRICT_MAP, INTERIOR_MAP } from "@/data/districts";
import { formatDuration, formatTime } from "@/utils/format";
import { gameEvents } from "@/game/engine/events";
import { VirtualJoystick } from "@/components/game/VirtualJoystick";
import { AdSlot } from "@/components/ads/AdSlot";
import { OfflineIndicator } from "@/components/pwa/PwaProvider";
import { AvatarPreview } from "@/components/menu/AvatarPreview";
import { useNow } from "@/hooks/useNow";

const NAV: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
  { id: "activities", label: "Jobs", icon: <Briefcase size={18} /> },
  { id: "quests", label: "Quests", icon: <BookOpen size={18} /> },
  { id: "skills", label: "Skills", icon: <Sparkles size={18} /> },
  { id: "inventory", label: "Inventory", icon: <Backpack size={18} /> },
  { id: "map", label: "Map", icon: <MapIcon size={18} /> },
  { id: "business", label: "Businesses", icon: <Store size={18} /> },
  { id: "hk", label: "Hustler Kingdom", icon: <Castle size={18} /> },
  { id: "crew", label: "Crew", icon: <Users size={18} /> },
  { id: "bank", label: "Bank", icon: <Landmark size={18} /> },
  { id: "property", label: "Property", icon: <Home size={18} /> },
  { id: "garage", label: "Garage", icon: <Car size={18} /> },
  { id: "fashion", label: "Fashion", icon: <Shirt size={18} /> },
  { id: "profile", label: "Profile", icon: <User size={18} /> },
  { id: "stats", label: "Statistics", icon: <BarChart3 size={18} /> },
  { id: "achievements", label: "Achievements", icon: <Trophy size={18} /> },
  { id: "daily", label: "Daily goals", icon: <ListChecks size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  { id: "help", label: "Help", icon: <HelpCircle size={18} /> },
];

export function Hud() {
  const game = useGameStore((s) => s.game);
  const isMobile = useUiStore((s) => s.isMobile);
  const openScreen = useUiStore((s) => s.openScreen);
  const prompt = useUiStore((s) => s.prompt);
  const setPhoneOpen = useUiStore((s) => s.setPhoneOpen);
  const dirty = useGameStore((s) => s.dirty);
  const lastSaveAt = useGameStore((s) => s.lastSaveAt);
  const saveError = useGameStore((s) => s.saveError);
  const saveNow = useGameStore((s) => s.saveNow);
  const [menuOpen, setMenuOpen] = React.useState(false);
  if (!game) return null;
  const maxE = maxEnergy(game);
  const location = game.player.interiorId ? INTERIOR_MAP[game.player.interiorId]?.name : DISTRICT_MAP[game.player.districtId]?.name;
  const pendingEvents = game.events.pending.length;
  const activeQuests = Object.keys(game.quests.active).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* top bar */}
      <div className="pointer-events-auto flex items-center gap-2 border-b border-ink-700/70 bg-ink-950/85 px-2 py-1.5 pt-[calc(var(--safe-top)+6px)] backdrop-blur">
        <button className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-ink-800" onClick={() => openScreen("profile")} aria-label="Open profile">
          <div className="h-8 w-6 overflow-hidden"><AvatarPreview skin={game.player.avatar.skin} hair={game.player.avatar.hair} outfit={game.player.avatar.outfit} size={2} className="-mt-1" /></div>
          <div className="hidden text-left sm:block">
            <div className="text-xs font-semibold leading-tight">{game.player.name}</div>
            <div className="text-[10px] leading-tight text-ink-400">{location} · Day {game.meta.gameDay}</div>
          </div>
        </button>
        <div className="flex items-center gap-1 rounded-md border border-gold-500/40 bg-ink-900 px-2 py-1" data-testid="hud-cash">
          <Money amount={game.player.cash} className="text-sm font-bold" />
          {game.player.bank > 0 && <span className="hidden text-[10px] text-ink-400 sm:inline">(+<Money amount={game.player.bank} className="text-[10px]" /> bank)</span>}
        </div>
        <div className="flex min-w-[80px] items-center gap-1" title={`Energy ${Math.round(game.player.energy)}/${maxE}`}>
          <Zap size={14} className="text-accent" />
          <ProgressBar value={game.player.energy} max={maxE} color="bg-accent" className="w-16 sm:w-24" />
          <span className="text-[10px] text-ink-300">{Math.round(game.player.energy)}</span>
        </div>
        <div className="ml-auto hidden items-center gap-2 text-[11px] md:flex">
          <StatPill icon={<Eye size={12} />} label="Street" value={game.player.stats.streetRep} />
          <StatPill icon={<Star size={12} />} label="Fame" value={game.player.stats.fame} />
          <StatPill icon={<BadgeCheck size={12} />} label="Cred" value={game.player.stats.credibility} />
          <StatPill icon={<Flame size={12} />} label="Heat" value={game.player.stats.heat} danger={game.player.stats.heat >= 50} />
        </div>
        <OfflineIndicator className="ml-1" />
        <button onClick={() => void saveNow()} className={cx("ml-1 flex items-center gap-1 rounded px-1.5 py-1 text-[10px]", saveError ? "text-danger" : dirty ? "text-ink-300" : "text-growth")} title={saveError ?? `Last saved ${formatTime(lastSaveAt)}`} aria-label="Save game">
          <Save size={13} /> <span className="hidden sm:inline">{saveError ? "Save failed" : dirty ? "Unsaved" : "Saved"}</span>
        </button>
      </div>

      {/* body */}
      <div className="relative flex flex-1 overflow-hidden">
        {!isMobile && (
          <nav className="pointer-events-auto flex w-14 flex-col items-center gap-0.5 overflow-y-auto border-r border-ink-700/70 bg-ink-950/80 py-1 scrollbar-thin lg:w-40" aria-label="Game navigation">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => openScreen(n.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100 lg:px-3" title={n.label} data-testid={`nav-${n.id}`}>
                <span className="relative">{n.icon}{n.id === "quests" && activeQuests > 0 && <span className="absolute -right-1.5 -top-1 rounded-full bg-gold-500 px-1 text-[9px] font-bold text-ink-950">{activeQuests}</span>}</span>
                <span className="hidden lg:inline">{n.label}</span>
              </button>
            ))}
            <button onClick={() => setPhoneOpen(true)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gold-300 hover:bg-ink-800 lg:px-3" data-testid="nav-phone">
              <span className="relative"><Smartphone size={18} />{pendingEvents > 0 && <span className="absolute -right-1.5 -top-1 rounded-full bg-danger px-1 text-[9px] font-bold text-white">{pendingEvents}</span>}</span>
              <span className="hidden lg:inline">Phone</span>
            </button>
            <div className="mt-auto hidden w-full px-1 lg:block">
              <AdSlot placement="hud_banner" compact />
            </div>
          </nav>
        )}
        <div className="relative flex-1">
          <ActivityTicker />
          {/* interaction prompt */}
          {prompt && (
            <div className="pointer-events-auto absolute bottom-[calc(var(--safe-bottom)+96px)] left-1/2 -translate-x-1/2 sm:bottom-6">
              <Button variant="primary" size="lg" className="animate-pulse-gold shadow-xl" onClick={() => gameEvents.emit("input:action", {})} data-testid="interact-button" icon={<Hand size={16} />}>
                {prompt.kind === "npc" ? `Talk to ${prompt.label}` : prompt.kind === "exit" ? "Leave" : prompt.label}
                {!isMobile && <kbd className="ml-1 rounded bg-ink-950/40 px-1 text-[10px]">E</kbd>}
              </Button>
            </div>
          )}
          {isMobile && <VirtualJoystick side={game.settings.joystickSide === "right" ? "left" : "right"} />}
          {isMobile && (
            <button onClick={() => gameEvents.emit("input:action", {})} className={cx("pointer-events-auto absolute bottom-[calc(var(--safe-bottom)+96px)] flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-400 bg-ink-900/80 text-gold-300 shadow-xl active:bg-gold-500 active:text-ink-950", game.settings.joystickSide === "right" ? "right-6" : "left-6")} aria-label="Interact" data-testid="mobile-action">
              <Hand size={24} />
            </button>
          )}
        </div>
      </div>

      {/* mobile bottom nav + reserved ad strip */}
      {isMobile && (
        <div className="pointer-events-auto border-t border-ink-700/70 bg-ink-950/90 pb-[var(--safe-bottom)] backdrop-blur">
          <div className="px-2 pt-1"><AdSlot placement="hud_banner" compact /></div>
          <nav className="flex items-stretch justify-around" aria-label="Game navigation">
            {[
              { id: "activities", label: "Jobs", icon: <Briefcase size={20} /> },
              { id: "quests", label: "Quests", icon: <BookOpen size={20} /> },
              { id: "phone", label: "Phone", icon: <Smartphone size={20} /> },
              { id: "hk", label: "HK", icon: <Castle size={20} /> },
              { id: "menu", label: "More", icon: <Menu size={20} /> },
            ].map((n) => (
              <button key={n.id} className="touch-target flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] text-ink-300 active:text-gold-300" onClick={() => (n.id === "phone" ? setPhoneOpen(true) : n.id === "menu" ? setMenuOpen(true) : openScreen(n.id as ScreenId))} data-testid={`mnav-${n.id}`}>
                <span className="relative">{n.icon}{n.id === "phone" && pendingEvents > 0 && <span className="absolute -right-1.5 -top-1 rounded-full bg-danger px-1 text-[9px] font-bold text-white">{pendingEvents}</span>}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      )}
      {menuOpen && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end bg-ink-950/70" onClick={() => setMenuOpen(false)}>
          <div className="panel animate-slide-up grid w-full grid-cols-3 gap-1 rounded-b-none p-3 pb-[calc(var(--safe-bottom)+12px)]" onClick={(e) => e.stopPropagation()}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => { openScreen(n.id); setMenuOpen(false); }} className="touch-target flex flex-col items-center justify-center gap-1 rounded-md bg-ink-800 p-2 text-[11px] text-ink-200">
                {n.icon}{n.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5", danger ? "border-danger/60 bg-danger-dim/40 text-ink-100" : "border-ink-700 bg-ink-900 text-ink-300")} title={label}>
      {icon} {Math.round(value)}
    </span>
  );
}

function ActivityTicker() {
  const running = useGameStore((s) => s.game?.activities.running ?? []);
  const queue = useGameStore((s) => s.game?.activities.queue.length ?? 0);
  const openScreen = useUiStore((s) => s.openScreen);
  const now = useNow(1000);
  if (running.length === 0 && queue === 0) return null;
  return (
    <div className="pointer-events-auto absolute right-2 top-2 flex w-44 flex-col gap-1" data-testid="activity-ticker">
      {running.map((r) => {
        const def = ACTIVITY_MAP[r.activityId];
        const total = r.endsAt - r.startedAt;
        const done = Math.min(total, now - r.startedAt);
        return (
          <button key={r.instanceId} onClick={() => openScreen("activities")} className="panel-raised px-2 py-1 text-left">
            <div className="flex justify-between text-[10px]"><span className="truncate">{def?.name ?? r.activityId}</span><span className="text-ink-400">{formatDuration(Math.max(0, r.endsAt - now))}</span></div>
            <ProgressBar value={done} max={total} color={def?.legit === false ? "bg-danger" : "bg-growth"} height="h-1" className="mt-1" />
          </button>
        );
      })}
      {queue > 0 && <div className="text-right text-[10px] text-ink-400">+{queue} queued</div>}
    </div>
  );
}
