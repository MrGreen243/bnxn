"use client";
import * as React from "react";
import { Check, Lock } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { SKILLS } from "@/data/skills";
import { Panel, ProgressBar, Tag, cx } from "@/components/ui";
import { levelFromXp } from "@/simulation/progression/skills";
import { describeMod } from "@/components/screens/ProfileScreen";

export function SkillsScreen() {
  const game = useGameStore((s) => s.game)!;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {SKILLS.map((skill) => {
        const st = game.skills.levels[skill.id];
        const lv = levelFromXp(st?.xp ?? 0);
        return (
          <Panel key={skill.id} title={`${skill.name} · L${lv.level}`} subtitle={skill.description}>
            <ProgressBar value={lv.into} max={lv.needed || 1} label={lv.needed ? `${lv.into} / ${lv.needed} XP` : "MAX"} color="bg-accent" />
            <ul className="mt-3 space-y-1">
              {skill.perks.map((perk) => {
                const unlocked = game.skills.perks.includes(perk.id);
                return (
                  <li key={perk.id} className={cx("flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs", unlocked ? "border-growth/50 bg-growth-dim/20" : "border-ink-700 bg-ink-900")}>
                    <span className="mt-0.5">{unlocked ? <Check size={14} className="text-growth" /> : <Lock size={14} className="text-ink-500" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-semibold">{perk.name}</span><Tag>L{perk.level}</Tag></div>
                      <div className="text-ink-300">{perk.description}</div>
                      <div className="text-[10px] text-ink-400">{perk.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ")}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}
