"use client";
import * as React from "react";
import { Download, LogOut, RotateCcw, Save, Trash2, Upload, Crown } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { Button, Field, Panel, Stat, Money } from "@/components/ui";
import { APP_VERSION } from "@/data/version";
import { formatTime, formatDurationLong } from "@/utils/format";
import { PRESTIGE_RULES, performPrestige, prestigeAvailable } from "@/simulation/prestige";
import { InstallButton, usePwa } from "@/components/pwa/PwaProvider";
import { offlineCapMs } from "@/simulation/modifiers";

export function SettingsScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const replaceState = useGameStore((s) => s.replaceState);
  const exitToMenu = useGameStore((s) => s.exitToMenu);
  const resetCurrent = useGameStore((s) => s.resetCurrent);
  const ask = useUiStore((s) => s.ask);
  const toast = useUiStore((s) => s.toast);
  const openScreen = useUiStore((s) => s.openScreen);
  const { online, installed } = usePwa();
  const s = game.settings;
  const set = (patch: Partial<typeof s>) => act((g) => { Object.assign(g.settings, patch); }, { silent: true });
  const prestige = prestigeAvailable(game);
  return (
    <div className="space-y-3">
      <Panel title="Gameplay">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} /> Reduced motion</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showTooltips} onChange={(e) => set({ showTooltips: e.target.checked })} /> Show tutorial tips</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.adsEnabled} onChange={(e) => set({ adsEnabled: e.target.checked })} /> Show promotional placements (sponsored banners)</label>
          <Field label="Joystick side (mobile)"><select value={s.joystickSide} onChange={(e) => set({ joystickSide: e.target.value as "left" | "right" })}><option value="right">Joystick left, action right</option><option value="left">Joystick right, action left</option></select></Field>
          <Field label={`Pixel scale (zoom): ${s.pixelScale}×`}><input type="range" min={2} max={5} step={0.5} value={s.pixelScale} onChange={(e) => set({ pixelScale: Number(e.target.value) })} /></Field>
        </div>
      </Panel>
      <Panel title="Offline progress">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          <Stat label="Offline cap" value={formatDurationLong(offlineCapMs(game))} hint="Raise it with internet, furniture, property and HK power upgrades." />
          <Stat label="Last simulated" value={formatTime(game.meta.lastSimulatedAt)} />
          <Stat label="Connection" value={online ? "Online" : "Offline"} />
        </div>
        <p className="mt-2 text-[11px] text-ink-400">Progress is calculated from saved timestamps when you return, never from a background timer. Repeated reloads cannot claim the same rewards twice.</p>
      </Panel>
      <Panel title="App">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>Version {APP_VERSION}{installed ? " · installed" : ""}</span>
          <InstallButton size="sm" />
          <Button size="sm" icon={<Save size={12} />} onClick={() => openScreen("saves")}>Save management</Button>
          <Button size="sm" icon={<LogOut size={12} />} onClick={() => void exitToMenu()}>Save & exit to menu</Button>
        </div>
      </Panel>
      <Panel title="Legacy (prestige)" subtitle="Optional. A voluntary reset that keeps permanent bonuses.">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <Stat label="Required net worth" value={<Money amount={prestige.required} />} />
          <Stat label="Your net worth" value={<Money amount={prestige.netWorth} />} />
          <Stat label="Legacy points you'd gain" value={prestige.points} />
          <Stat label="Current legacy" value={`${game.prestige.legacyPoints} points · run ${game.prestige.runs + 1}`} />
        </div>
        <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
          <div><div className="font-semibold text-growth">Kept</div><ul className="list-inside list-disc text-ink-300">{PRESTIGE_RULES.keeps.map((k) => <li key={k}>{k}</li>)}</ul></div>
          <div><div className="font-semibold text-danger">Reset</div><ul className="list-inside list-disc text-ink-300">{PRESTIGE_RULES.resets.map((k) => <li key={k}>{k}</li>)}</ul></div>
        </div>
        <Button className="mt-2" variant="primary" icon={<Crown size={14} />} disabled={!prestige.ok} onClick={() => ask({ title: "Start a legacy run?", message: `You will gain ${prestige.points} legacy points (+${prestige.points}% income permanently) and everything listed under "Reset" will be wiped. This cannot be undone.`, danger: true, confirmLabel: "Reset and begin legacy", onConfirm: () => { const next = performPrestige(game, Date.now()); if (next) { replaceState(next); toast("A new legacy begins.", "good"); } } })}>Begin legacy run</Button>
      </Panel>
      <Panel title="Danger zone">
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" icon={<Trash2 size={12} />} onClick={() => ask({ title: "Delete this save?", message: "Your current character and all progress in this slot will be permanently deleted. Export a backup first if you want to keep it.", danger: true, confirmLabel: "Delete forever", onConfirm: () => void resetCurrent() })}>Reset game (delete save)</Button>
        </div>
      </Panel>
    </div>
  );
}

export function SavesScreen() {
  const game = useGameStore((s) => s.game)!;
  const slots = useGameStore((s) => s.slots);
  const saveNow = useGameStore((s) => s.saveNow);
  const exportCurrent = useGameStore((s) => s.exportCurrent);
  const importSave = useGameStore((s) => s.importSave);
  const refreshSlots = useGameStore((s) => s.refreshSlots);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const continueSlot = useGameStore((s) => s.continueSlot);
  const lastSaveAt = useGameStore((s) => s.lastSaveAt);
  const saveError = useGameStore((s) => s.saveError);
  const storageOk = useGameStore((s) => s.storageOk);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const closeScreen = useUiStore((s) => s.closeScreen);
  const fileRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { void refreshSlots(); }, [refreshSlots]);
  const doExport = () => {
    const json = exportCurrent();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `street-tycoon-${game.player.name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Save exported.", "good");
  };
  const doImport = async (file: File, mode: "new" | "overwrite") => {
    const text = await file.text();
    const r = await importSave(text, mode);
    if (!r.ok) toast(r.error, "bad");
    else {
      toast(mode === "overwrite" ? "Save imported. Loading…" : "Imported into a new slot.", "good");
      if (mode === "overwrite") { await continueSlot(r.state.meta.slotId); closeScreen(); }
    }
  };
  return (
    <div className="space-y-3">
      {!storageOk && <div className="rounded-md border border-danger bg-danger-dim/40 p-2 text-xs">Browser storage is unavailable. Export your save to keep it.</div>}
      {saveError && <div className="rounded-md border border-danger bg-danger-dim/40 p-2 text-xs">Last save failed: {saveError}</div>}
      <Panel title="Current game" subtitle={`Last saved ${formatTime(lastSaveAt || game.meta.lastSavedAt)} · slot ${game.meta.slotId.slice(-6)}`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<Save size={12} />} onClick={() => void saveNow().then((r) => toast(r.ok ? "Saved." : r.error, r.ok ? "good" : "bad"))} data-testid="save-now">Save now</Button>
          <Button icon={<Download size={12} />} onClick={doExport} data-testid="export-save">Export JSON</Button>
          <Button icon={<Upload size={12} />} onClick={() => fileRef.current?.click()} data-testid="import-save">Import JSON (replace current)</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import save" data-testid="import-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) ask({ title: "Replace current save?", message: "The imported file will overwrite this slot after validation. Invalid files are rejected and nothing changes.", confirmLabel: "Import", onConfirm: () => void doImport(f, "overwrite") }); e.target.value = ""; }} />
        </div>
        <p className="mt-2 text-[11px] text-ink-400">Saves are stored in this browser&apos;s IndexedDB. They do not sync between devices. Clearing site data erases them, so export backups.</p>
      </Panel>
      <Panel title="All save slots">
        <ul className="space-y-1 text-xs">
          {slots.map((slot) => (
            <li key={slot.slotId} className="flex flex-wrap items-center justify-between gap-2 panel-raised px-2 py-1.5">
              <div><span className="font-semibold">{slot.name}</span>{slot.slotId === game.meta.slotId && <span className="ml-1 text-gold-300">(current)</span>}<div className="text-ink-400">{slot.summary.district} · day {slot.summary.day} · <Money amount={slot.summary.netWorth} className="text-xs" /> · saved {formatTime(slot.updatedAt)}</div></div>
              <div className="flex gap-1">
                {slot.slotId !== game.meta.slotId && <Button size="sm" icon={<RotateCcw size={12} />} onClick={() => ask({ title: "Switch save?", message: `Save the current game and load ${slot.name}?`, confirmLabel: "Switch", onConfirm: () => void saveNow().then(() => continueSlot(slot.slotId)).then(() => closeScreen()) })}>Load</Button>}
                {slot.slotId !== game.meta.slotId && <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} aria-label={`Delete ${slot.name}`} onClick={() => ask({ title: "Delete slot?", message: `Delete ${slot.name} permanently?`, danger: true, confirmLabel: "Delete", onConfirm: () => void deleteSlot(slot.slotId) })} />}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
