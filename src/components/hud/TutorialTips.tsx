"use client";
import * as React from "react";
import { Lightbulb, X } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";

const TIPS: { id: string; when: (g: GameState) => boolean; text: string }[] = [
  { id: "move", when: () => true, text: "Welcome to Mainland Corner. Move with WASD/arrows or the joystick. Tunde is waiting outside your room — walk up to him and press E." },
  { id: "jobs", when: (g) => g.quests.flags.intro_done === true, text: "Jobs are on buildings (bakery, café) and in the Jobs screen. Rewards lock in at start and pay when done — you can queue several." },
  { id: "energy", when: (g) => g.player.energy < 30, text: "Low energy. Buy food at the bakery, eat at home, or rest. Energy also regenerates slowly on its own." },
  { id: "upgrade", when: (g) => g.player.cash >= 45_000 && (g.inventory.items.phone_2 ?? 0) === 0, text: "You can afford a Budget Android at the Fix-It kiosk. Better phones and computers unlock more work and multiply rewards." },
  { id: "offline", when: (g) => g.stats.activitiesCompleted >= 3, text: "Offline-eligible jobs keep finishing while the app is closed. Queue a few before you leave." },
  { id: "district", when: (g) => (g.skills.levels.computing?.level ?? 1) >= 4 && !g.player.unlockedDistricts.includes("computerVillage"), text: "Computing is level 4. With ₦30,000 you can unlock Computer Village from the World Map or the Motor Park." },
  { id: "hk", when: (g) => (g.skills.levels.management?.level ?? 1) >= 3 && !g.hk.unlocked, text: "Management is growing. Talk to Tunde about the Hustler Kingdom — a crew that earns while you sleep." },
  { id: "heat", when: (g) => g.player.stats.heat >= 40, text: "Heat is rising. Investigators notice patterns. Lie low, see Barrister Okafor in Ikeja, or keep it legit." },
  { id: "business", when: (g) => g.player.cash >= 180_000 && g.businesses.owned.length === 0, text: "₦180,000 buys a Phone Accessories Shop on the mainland — your first passive income. Check the Businesses screen." },
];

export function TutorialTips() {
  const game = useGameStore((s) => s.game);
  const act = useGameStore((s) => s.act);
  if (!game || !game.settings.showTooltips) return null;
  const tip = TIPS.find((t) => !game.tutorial.shownTips.includes(t.id) && t.when(game));
  if (!tip) return null;
  const dismiss = () => act((s) => { s.tutorial.shownTips.push(tip.id); s.tutorial.step += 1; if (s.tutorial.step >= 6) s.tutorial.completed = true; }, { silent: true });
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--safe-top)+52px)] z-30 w-[min(92vw,440px)] -translate-x-1/2 animate-slide-up rounded-md border border-gold-400/50 bg-ink-900/95 p-2 text-xs shadow-xl md:left-auto md:right-3 md:translate-x-0 md:top-auto md:bottom-3" role="note" data-testid={`tip-${tip.id}`}>
      <div className="flex items-start gap-2">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-gold-400" />
        <p className="flex-1 text-ink-100">{tip.text}</p>
        <button onClick={dismiss} aria-label="Dismiss tip" className="touch-target -m-2 flex items-center justify-center text-ink-400 hover:text-ink-100"><X size={16} /></button>
      </div>
    </div>
  );
}
