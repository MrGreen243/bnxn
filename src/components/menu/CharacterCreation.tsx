"use client";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BACKGROUNDS } from "@/data/backgrounds";
import { SKILL_MAP } from "@/data/skills";
import { HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES } from "@/game/world/sprites";
import { useGameStore } from "@/store/gameStore";
import { Button, Panel, cx } from "@/components/ui";
import { AvatarPreview } from "@/components/menu/AvatarPreview";
import type { BackgroundId } from "@/types/game";

const NAMES = ["Tolu", "Emeka", "Aisha", "Kelechi", "Funmi", "Bayo", "Chisom", "Halima", "Segun", "Ngozi"];

export function CharacterCreation({ onCancel }: { onCancel: () => void }) {
  const newGame = useGameStore((s) => s.newGame);
  const [name, setName] = React.useState("");
  const [skin, setSkin] = React.useState(1);
  const [hair, setHair] = React.useState(0);
  const [outfit, setOutfit] = React.useState(2);
  const [background, setBackground] = React.useState<BackgroundId>("street");
  const [busy, setBusy] = React.useState(false);
  const cycle = (v: number, len: number, d: number) => (v + d + len) % len;

  const start = async () => {
    setBusy(true);
    await newGame({ name: name.trim() || NAMES[Math.floor(Math.random() * NAMES.length)]!, avatar: { skin, hair, outfit }, background });
  };

  return (
    <main className="flex min-h-screen items-start justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,_#1b2233,_#0b0d12_60%)] px-4 py-6 scrollbar-thin">
      <div className="w-full max-w-3xl">
        <h1 className="font-pixel mb-4 text-3xl font-black text-gold-400">Who are you?</h1>
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Panel title="Appearance">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border border-ink-600 bg-ink-950 p-3">
                <AvatarPreview skin={skin} hair={hair} outfit={outfit} size={6} />
              </div>
              {[
                { label: "Skin", value: skin, set: setSkin, len: SKIN_TONES.length, colors: SKIN_TONES },
                { label: "Hair", value: hair, set: setHair, len: HAIR_COLORS.length, colors: HAIR_COLORS },
                { label: "Outfit", value: outfit, set: setOutfit, len: OUTFIT_COLORS.length, colors: OUTFIT_COLORS },
              ].map((row) => (
                <div key={row.label} className="flex w-full items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-ink-300">{row.label}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Previous ${row.label}`} onClick={() => row.set(cycle(row.value, row.len, -1))} icon={<ChevronLeft size={16} />} />
                    <span className="inline-block h-5 w-5 rounded border border-ink-500" style={{ background: row.colors[row.value] }} />
                    <Button size="sm" variant="ghost" aria-label={`Next ${row.label}`} onClick={() => row.set(cycle(row.value, row.len, 1))} icon={<ChevronRight size={16} />} />
                  </div>
                </div>
              ))}
              <label className="w-full text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-ink-300">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Your street name" data-testid="name-input" />
              </label>
            </div>
          </Panel>
          <Panel title="Background" subtitle="A small head start, not a locked path. Every system stays open.">
            <div className="grid gap-2 sm:grid-cols-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBackground(b.id)}
                  data-testid={`bg-${b.id}`}
                  className={cx("rounded-md border p-3 text-left transition-colors", background === b.id ? "border-gold-400 bg-ink-700" : "border-ink-600 bg-ink-800 hover:border-ink-400")}
                  aria-pressed={background === b.id}
                >
                  <div className="font-semibold text-ink-100">{b.name}</div>
                  <div className="mt-1 text-xs text-ink-300">{b.description}</div>
                  <div className="mt-2 text-[11px] text-gold-300">+{b.bonusXp} {SKILL_MAP[b.bonusSkill]?.name} XP{b.startingItem ? " · starting equipment" : ""}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button onClick={onCancel}>Back</Button>
              <Button variant="primary" size="lg" onClick={() => void start()} disabled={busy} data-testid="start-game">
                {busy ? "Loading…" : "Start hustling"}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
