"use client";
import * as React from "react";
import { useGameStore } from "@/store/gameStore";
import { Money, Panel, ProgressBar, Stat } from "@/components/ui";
import { AvatarPreview } from "@/components/menu/AvatarPreview";
import { BACKGROUND_MAP } from "@/data/backgrounds";
import { DISTRICT_MAP } from "@/data/districts";
import { PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { netWorth } from "@/simulation/economy/money";
import { computeModifiers } from "@/simulation/modifiers";
import { dailyLivingCost } from "@/simulation/engine";
import { hkTierInfo } from "@/simulation/crew/hk";
import { formatNumber } from "@/utils/format";
import { NPC_MAP } from "@/data/npcs";

const STAT_INFO: { key: "streetRep" | "fame" | "credibility" | "heat" | "lifestyle"; label: string; color: string; desc: string }[] = [
  { key: "streetRep", label: "Street Rep", color: "bg-gold-500", desc: "Respect on the street. Unlocks risky work and some recruits." },
  { key: "fame", label: "Public Fame", color: "bg-purple", desc: "How many people know your name. Drives demand, brand deals and events." },
  { key: "credibility", label: "Business Credibility", color: "bg-accent", desc: "Trust in offices and banks. Unlocks contracts, districts and partners." },
  { key: "heat", label: "Law-Enforcement Heat", color: "bg-danger", desc: "Attention from investigators. High heat triggers investigations." },
  { key: "lifestyle", label: "Lifestyle Status", color: "bg-growth", desc: "Luxury and social standing. Opens elite districts and events." },
];

export function ProfileScreen() {
  const game = useGameStore((s) => s.game)!;
  const { sources } = computeModifiers(game);
  const bg = BACKGROUND_MAP[game.player.background];
  const prop = PROPERTY_MAP[game.properties.current];
  const veh = game.vehicles.current ? VEHICLE_MAP[game.vehicles.current] : null;
  return (
    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
      <Panel>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-md border border-ink-600 bg-ink-950 p-2"><AvatarPreview skin={game.player.avatar.skin} hair={game.player.avatar.hair} outfit={game.player.avatar.outfit} size={5} /></div>
          <div className="font-pixel text-lg font-bold text-gold-400">{game.player.name}</div>
          <div className="text-xs text-ink-300">{bg.name}</div>
          <div className="text-xs text-ink-400">{DISTRICT_MAP[game.player.districtId]?.name} · Day {game.meta.gameDay}</div>
          {game.prestige.runs > 0 && <div className="text-xs text-purple">Legacy run {game.prestige.runs} · {game.prestige.legacyPoints} points</div>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <Stat label="Net worth" value={<Money amount={netWorth(game)} />} />
          <Stat label="Cash" value={<Money amount={game.player.cash} />} />
          <Stat label="Bank" value={<Money amount={game.player.bank} />} />
          <Stat label="Daily costs" value={<Money amount={dailyLivingCost(game)} />} hint="Rent, food, transport and upkeep per in-game day (20 real minutes)." />
          <Stat label="Home" value={prop?.name ?? "—"} />
          <Stat label="Ride" value={veh?.name ?? "Public transport"} />
          <Stat label="Followers" value={formatNumber(game.social.followers)} />
          <Stat label="HK" value={game.hk.unlocked ? hkTierInfo(game.hk.tier).name : "Locked"} />
        </div>
      </Panel>
      <div className="space-y-3">
        <Panel title="Reputation & status" subtitle="Five separate values. They move independently and unlock different things.">
          <div className="space-y-2">
            {STAT_INFO.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs"><span className="font-semibold">{s.label}</span><span className="text-ink-300">{Math.round(game.player.stats[s.key])}/100</span></div>
                <ProgressBar value={game.player.stats[s.key]} max={100} color={s.color} className="mt-1" />
                <div className="text-[11px] text-ink-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Active bonuses" subtitle="Every modifier currently affecting you, from perks, gear, property, vehicles, facilities and legacy.">
          {sources.length === 0 ? <p className="text-xs text-ink-400">No bonuses yet. Buy equipment, unlock perks and upgrade your home.</p> : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {sources.map((s, i) => (
                <li key={i} className="panel-raised px-2 py-1 text-xs"><span className="font-semibold text-ink-100">{s.label}</span>: <span className="text-ink-300">{s.modifiers.map((m) => describeMod(m.key, m.value)).join(", ")}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Relationships">
          {Object.keys(game.npcs.relationships).length === 0 ? <p className="text-xs text-ink-400">Talk to people. Relationships open doors.</p> : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {Object.entries(game.npcs.relationships).map(([id, v]) => (
                <li key={id} className="flex items-center justify-between panel-raised px-2 py-1 text-xs"><span>{NPC_MAP[id]?.name ?? id}</span><span className={v >= 0 ? "text-growth" : "text-danger"}>{v > 0 ? "+" : ""}{v}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

const MULT_KEYS = new Set(["activityReward", "activityRewardLegit", "activityRewardRisky", "activitySpeed", "skillXp", "businessRevenue", "businessCosts", "crewEfficiency", "crewTrainingSpeed", "recruitCost", "shopDiscount", "energyRegen", "heatDecay", "fameGain", "rentDiscount", "travelDiscount"]);
const LABELS: Record<string, string> = {
  activityReward: "job rewards", activityRewardLegit: "legit rewards", activityRewardRisky: "risky rewards", activitySpeed: "job speed", activitySlots: "job slots", skillXp: "skill XP",
  businessRevenue: "business revenue", businessCosts: "business costs", crewEfficiency: "crew efficiency", crewTrainingSpeed: "training speed", crewMorale: "crew morale/day", recruitCost: "recruit cost",
  shopDiscount: "shop prices", offlineCapHours: "offline hours", energyRegen: "energy regen", maxEnergy: "max energy", riskReduction: "risk", heatDecay: "heat decay", fameGain: "fame gain",
  investmentReturn: "investment drift", rentDiscount: "living costs", travelDiscount: "travel cost", inventoryCapacity: "inventory", hkCapacity: "HK capacity",
};
export function describeMod(key: string, value: number): string {
  const label = LABELS[key] ?? key;
  if (MULT_KEYS.has(key)) {
    const pct = Math.round((value - 1) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% ${label}`;
  }
  if (key === "riskReduction") return `−${Math.round(value * 100)} pts ${label}`;
  if (key === "investmentReturn") return `+${(value * 100).toFixed(1)}% ${label}`;
  return `${value >= 0 ? "+" : ""}${value} ${label}`;
}
