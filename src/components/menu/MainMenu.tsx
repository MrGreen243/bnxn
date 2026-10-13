"use client";
import * as React from "react";
import { Download, Play, Plus, Trash2, Upload, Megaphone, HelpCircle } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { Button, Panel, Money } from "@/components/ui";
import { CharacterCreation } from "@/components/menu/CharacterCreation";
import { formatDurationLong, formatTime } from "@/utils/format";
import { APP_VERSION } from "@/data/version";
import { AdSlot } from "@/components/ads/AdSlot";
import { InstallButton } from "@/components/pwa/PwaProvider";
import { HelpContent } from "@/components/screens/HelpScreen";
import { Modal } from "@/components/ui";

export function MainMenu() {
  const slots = useGameStore((s) => s.slots);
  const storageOk = useGameStore((s) => s.storageOk);
  const continueSlot = useGameStore((s) => s.continueSlot);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const importSave = useGameStore((s) => s.importSave);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const [creating, setCreating] = React.useState(false);
  const [help, setHelp] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    const text = await file.text();
    const r = await importSave(text, "new");
    if (!r.ok) toast(r.error, "bad");
    else toast("Save imported into a new slot.", "good");
  };

  if (creating) return <CharacterCreation onCancel={() => setCreating(false)} />;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,_#1b2233,_#0b0d12_60%)] px-4 py-8 scrollbar-thin">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <p className="font-pixel text-xs uppercase tracking-[0.4em] text-gold-400">Lagos, Nigeria</p>
          <h1 className="font-pixel text-5xl font-black tracking-tight text-ink-100 drop-shadow-[0_3px_0_#e0a526] sm:text-6xl">STREET TYCOON</h1>
          <p className="mt-2 text-sm text-ink-300">From a rented room on the mainland to a citywide empire. Hustle, upgrade, recruit, and manage the consequences.</p>
        </header>
        {!storageOk && (
          <div className="mb-4 rounded-md border border-danger bg-danger-dim/40 p-3 text-sm">
            Browser storage is unavailable (private mode or blocked). You can play, but progress will not be saved.
          </div>
        )}
        <Panel title="Continue" subtitle="Saves live in this browser only. Clearing site data erases them — export regularly.">
          {slots.length === 0 ? (
            <p className="text-sm text-ink-400">No saves yet. Start a new game below.</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((slot) => (
                <li key={slot.slotId} className="panel-raised flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <div className="font-semibold">{slot.name}</div>
                    <div className="text-xs text-ink-400">
                      {slot.summary.district} · Day {slot.summary.day} · <Money amount={slot.summary.netWorth} /> net worth · played {formatDurationLong(slot.summary.playtimeMs)} · saved {formatTime(slot.updatedAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={() => void continueSlot(slot.slotId).then((r) => { if (!r.ok) toast(r.error, "bad"); })}>
                      Continue
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Delete save ${slot.name}`} icon={<Trash2 size={14} />} onClick={() => ask({ title: "Delete save?", message: `Delete ${slot.name}'s save permanently? This cannot be undone.`, danger: true, confirmLabel: "Delete", onConfirm: () => void deleteSlot(slot.slotId) })} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="lg" icon={<Plus size={18} />} onClick={() => setCreating(true)} data-testid="new-game">
              New Game
            </Button>
            <Button size="lg" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
              Import save
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import save file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
            <InstallButton />
            <Button size="lg" icon={<HelpCircle size={16} />} onClick={() => setHelp(true)}>Help</Button>
          </div>
        </Panel>
        <div className="mx-auto mt-4 max-w-sm">
          <AdSlot placement="loading_screen" compact />
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <span>v{APP_VERSION} · Fictional characters, businesses and events. No real-world instructions.</span>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/admin/ads/`} className="inline-flex items-center gap-1 hover:text-ink-200">
            <Megaphone size={12} /> Ad dashboard
          </a>
          <span className="inline-flex items-center gap-1"><Download size={12} /> Install as an app from your browser menu</span>
        </footer>
      </div>
      {help && (
        <Modal title="Help & Tutorial" onClose={() => setHelp(false)} size="lg">
          <HelpContent />
        </Modal>
      )}
    </main>
  );
}
