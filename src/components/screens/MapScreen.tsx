"use client";
import * as React from "react";
import { Lock, MapPin, Navigation } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { DISTRICTS } from "@/data/districts";
import { Button, Money, Tag, cx } from "@/components/ui";
import { canUnlockDistrict, travelCost, travelTo } from "@/simulation/progression/districts";
import { describeRequirement } from "@/simulation/requirements";
import { gameEvents } from "@/game/engine/events";

export function MapScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const close = useUiStore((s) => s.closeScreen);
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {DISTRICTS.map((d) => {
        const unlocked = game.player.unlockedDistricts.includes(d.id);
        const here = game.player.districtId === d.id && !game.player.interiorId;
        const check = canUnlockDistrict(game, d.id);
        const cost = travelCost(game, d.id);
        const visited = game.player.discoveredLocations.includes(`district:${d.id}`) || d.id === "mainland";
        return (
          <div key={d.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", here ? "border-gold-400 bg-ink-800" : unlocked ? "border-ink-600 bg-ink-900" : "border-ink-700 bg-ink-950 opacity-80")} style={{ borderLeftColor: d.palette.accent, borderLeftWidth: 4 }} data-testid={`district-${d.id}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><MapPin size={14} style={{ color: d.palette.accent }} /><span className="font-semibold text-ink-100">{d.name}</span>{here && <Tag color="bg-gold-500 text-ink-950">You are here</Tag>}{!unlocked && <Lock size={12} className="text-ink-500" />}</div>
              <span className="text-[10px] text-ink-400">×{d.priceMultiplier} prices</span>
            </div>
            <div className="italic text-ink-400">{d.tagline}</div>
            <p className="text-ink-300">{visited || unlocked ? d.description : "Undiscovered. Meet the requirements to unlock."}</p>
            {!unlocked && check.unmet.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px]">{d.requirements.map((r, i) => <li key={i} className={check.unmet.includes(r) ? "text-danger" : "text-growth"}>{check.unmet.includes(r) ? "✗" : "✓"} {describeRequirement(r)}</li>)}</ul>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-400">{here ? "" : cost > 0 ? <>Travel: <Money amount={cost} className="text-[11px]" /></> : "Walk"}</span>
              <Button size="sm" variant={unlocked ? "primary" : check.ok ? "success" : "secondary"} disabled={here || (!unlocked && !check.ok)} icon={<Navigation size={12} />} onClick={() => {
                const r = act((s, ctx) => travelTo(s, d.id, ctx.now));
                if (!r.ok) { toast(r.reason ?? "", "bad"); return; }
                toast(`Arrived in ${d.name}.`, "info");
                close();
                const g = useGameStore.getState().game!;
                gameEvents.emit("world:setLocation", { districtId: g.player.districtId, interiorId: null, x: g.player.position.x, y: g.player.position.y });
              }} data-testid={`travel-${d.id}`}>
                {unlocked ? "Travel" : check.ok ? "Unlock & travel" : "Locked"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
