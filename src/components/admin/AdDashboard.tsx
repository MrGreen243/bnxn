"use client";
import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Download, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2, Upload, Image as ImageIcon, BarChart3 } from "lucide-react";
import { AD_PLACEMENTS, AD_PLACEMENT_LABELS, AD_PLACEMENT_SIZES, adCampaignSchema, parseAdManifest, type AdCampaign, type AdManifest, type AdPlacement } from "@/schemas/ads";
import { clearAdStats, getAdManifest, getAdStats, getDefaultManifest, isUsingLocalManifest, loadAds, resetLocalManifest, saveLocalManifest, subscribeAds } from "@/ads/adService";
import { getDb } from "@/persistence/db";
import { Button, Field, Modal, Panel, Tag, cx } from "@/components/ui";
import { AdSlot } from "@/components/ads/AdSlot";
import { ConfirmDialog } from "@/components/dialogs/Overlays";
import { useUiStore } from "@/store/uiStore";
import { useNow } from "@/hooks/useNow";

const DISTRICTS = ["mainland", "computerVillage", "yaba", "surulere", "ikeja", "lekki", "vi", "island"] as const;
const MAX_IMAGE_BYTES = 400 * 1024;

function emptyCampaign(): AdCampaign {
  return {
    id: `campaign-${Date.now().toString(36)}`, advertiserName: "", campaignName: "", headline: "", description: "", imageUrl: "", clickUrl: "https://",
    placement: "hud_banner", startAt: null, endAt: null, enabled: true, priority: 50, districts: [], devices: [], frequencyCapPerDay: 0, label: "", notes: "", ctaText: "Learn more",
  };
}

function status(c: AdCampaign, now: number): { label: string; color: string } {
  if (!c.enabled) return { label: "Disabled", color: "bg-ink-600 text-ink-200" };
  if (c.startAt && new Date(c.startAt).getTime() > now) return { label: "Scheduled", color: "bg-accent-dim text-ink-100" };
  if (c.endAt && new Date(c.endAt).getTime() < now) return { label: "Ended", color: "bg-danger-dim text-ink-100" };
  return { label: "Live", color: "bg-growth-dim text-ink-100" };
}

export function AdDashboard() {
  const [manifest, setManifest] = React.useState<AdManifest | null>(null);
  const [local, setLocal] = React.useState(false);
  const [editing, setEditing] = React.useState<AdCampaign | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<"all" | "live" | "disabled" | "scheduled" | "ended">("all");
  const [filterPlacement, setFilterPlacement] = React.useState<AdPlacement | "all">("all");
  const [message, setMessage] = React.useState<{ text: string; kind: "good" | "bad" } | null>(null);
  const [statsTick, setStatsTick] = React.useState(0);
  const ask = useUiStore((s) => s.ask);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const now = useNow(30_000);

  React.useEffect(() => {
    const sync = () => { setManifest(getAdManifest()); setLocal(isUsingLocalManifest()); };
    void loadAds().then(sync);
    return subscribeAds(sync);
  }, []);

  const notify = (text: string, kind: "good" | "bad" = "good") => { setMessage({ text, kind }); window.setTimeout(() => setMessage(null), 4000); };

  const persist = async (next: AdManifest) => {
    const r = await saveLocalManifest({ ...next, updatedAt: new Date().toISOString() });
    if (!r.ok) notify(r.error, "bad");
    else notify("Saved locally on this device.");
  };

  if (!manifest) return <main className="p-6 text-sm text-ink-300">Loading manifest…</main>;
  const stats = getAdStats();
  const campaigns = manifest.campaigns.filter((c) => {
    if (filterPlacement !== "all" && c.placement !== filterPlacement) return false;
    if (filterStatus === "all") return true;
    return status(c, now).label.toLowerCase() === filterStatus;
  });

  const exportManifest = () => {
    const parsed = parseAdManifest(manifest);
    if (!parsed.ok) { notify(`Manifest invalid: ${parsed.error}`, "bad"); return; }
    const blob = new Blob([JSON.stringify(parsed.manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-manifest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Manifest exported. Commit it to src/data/ads/defaultManifest.ts to publish globally.");
  };

  const importManifest = async (file: File) => {
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { notify("Not valid JSON", "bad"); return; }
    const r = parseAdManifest(parsed);
    if (!r.ok) { notify(`Rejected: ${r.error}`, "bad"); return; }
    ask({ title: "Replace local manifest?", message: `Import ${r.manifest.campaigns.length} campaign(s) and overwrite the local configuration on this device?`, confirmLabel: "Import", onConfirm: () => void persist(r.manifest) });
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-ink-950 px-4 py-6 text-ink-100 scrollbar-thin">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-pixel text-2xl font-black text-gold-400">Ad Campaign Dashboard</h1>
            <p className="text-xs text-ink-400">Local configuration editor for Street Tycoon&apos;s sponsored placements.</p>
          </div>
          <Link href="/" className="text-xs text-ink-300 underline hover:text-ink-100">← Back to game</Link>
        </header>
        <div className="rounded-md border border-gold-400/40 bg-ink-900 p-3 text-xs text-ink-200">
          <div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold-400" />
            <div>
              <b>This is not a secure multi-user CMS.</b> There is no login and no server: edits are stored in this browser only and affect only this device. To publish campaigns to every player, export the manifest, review it, paste it into <code>src/data/ads/defaultManifest.ts</code> and redeploy the static site. Uploaded images are stored as data URLs in this browser (max {Math.round(MAX_IMAGE_BYTES / 1024)} KB each); for production, place approved images in <code>public/ads/</code> and reference them as <code>/ads/name.png</code>. Impression and click counts below are local to this device, not global analytics.
            </div>
          </div>
        </div>
        {message && <div className={cx("rounded-md border p-2 text-xs", message.kind === "good" ? "border-growth/60 bg-growth-dim/30" : "border-danger/60 bg-danger-dim/40")} role="status">{message.text}</div>}
        <Panel title="Manifest" subtitle={`${manifest.campaigns.length} campaign(s) · ${local ? "local override active on this device" : "bundled default manifest"} · updated ${new Date(manifest.updatedAt).toLocaleString()}`} actions={
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="primary" icon={<Plus size={12} />} onClick={() => { setEditing(emptyCampaign()); setIsNew(true); }} data-testid="new-campaign">New campaign</Button>
            <Button size="sm" icon={<Download size={12} />} onClick={exportManifest} data-testid="export-manifest">Export JSON</Button>
            <Button size="sm" icon={<Upload size={12} />} onClick={() => fileRef.current?.click()}>Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import manifest" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importManifest(f); e.target.value = ""; }} />
            <Button size="sm" icon={<RotateCcw size={12} />} onClick={() => ask({ title: "Reset to default manifest?", message: "Discard all local campaign edits on this device and restore the bundled default manifest?", danger: true, confirmLabel: "Reset", onConfirm: () => void resetLocalManifest().then(() => notify("Reset to the bundled manifest.")) })}>Reset to default</Button>
            <Button size="sm" variant="ghost" icon={<BarChart3 size={12} />} onClick={() => ask({ title: "Clear local statistics?", message: "Reset impression and click counters stored on this device?", confirmLabel: "Clear", onConfirm: () => void clearAdStats().then(() => setStatsTick((t) => t + 1)) })}>Clear stats</Button>
          </div>
        }>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1">Status <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="w-auto"><option value="all">All</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="ended">Ended</option><option value="disabled">Disabled</option></select></label>
            <label className="flex items-center gap-1">Placement <select value={filterPlacement} onChange={(e) => setFilterPlacement(e.target.value as AdPlacement | "all")} className="w-auto"><option value="all">All</option>{AD_PLACEMENTS.map((p) => <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>)}</select></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="campaign-table" key={statsTick}>
              <thead className="text-ink-400"><tr><th className="py-1 pr-2">Campaign</th><th className="pr-2">Placement</th><th className="pr-2">Status</th><th className="pr-2">Priority</th><th className="pr-2">Schedule</th><th className="pr-2 text-right">Impr.</th><th className="pr-2 text-right">Clicks</th><th>Actions</th></tr></thead>
              <tbody>
                {campaigns.map((c) => {
                  const st = status(c, now);
                  const s = stats.get(c.id);
                  return (
                    <tr key={c.id} className="border-t border-ink-800 align-top" data-testid={`campaign-row-${c.id}`}>
                      <td className="py-1.5 pr-2"><div className="font-semibold">{c.campaignName}</div><div className="text-ink-400">{c.advertiserName} · {c.id}{c.label ? ` · ${c.label}` : ""}</div></td>
                      <td className="pr-2">{AD_PLACEMENT_LABELS[c.placement]}{c.districts.length ? <div className="text-[10px] text-ink-500">{c.districts.join(", ")}</div> : null}{c.devices.length ? <div className="text-[10px] text-ink-500">{c.devices.join(", ")}</div> : null}</td>
                      <td className="pr-2"><Tag color={st.color}>{st.label}</Tag></td>
                      <td className="pr-2">{c.priority}</td>
                      <td className="pr-2 text-[10px] text-ink-400">{c.startAt ? new Date(c.startAt).toLocaleDateString() : "—"} → {c.endAt ? new Date(c.endAt).toLocaleDateString() : "—"}{c.frequencyCapPerDay ? <div>cap {c.frequencyCapPerDay}/day</div> : null}</td>
                      <td className="pr-2 text-right">{s?.impressions ?? 0}</td>
                      <td className="pr-2 text-right">{s?.clicks ?? 0}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" aria-label="Edit" icon={<Pencil size={12} />} onClick={() => { setEditing(c); setIsNew(false); }} />
                          <Button size="sm" variant="ghost" aria-label={c.enabled ? "Disable" : "Enable"} icon={c.enabled ? <EyeOff size={12} /> : <Eye size={12} />} onClick={() => void persist({ ...manifest, campaigns: manifest.campaigns.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x)) })} />
                          <Button size="sm" variant="ghost" aria-label="Delete" icon={<Trash2 size={12} />} onClick={() => ask({ title: "Delete campaign?", message: `Delete "${c.campaignName}" from the local manifest? This cannot be undone (unless you re-import a backup).`, danger: true, confirmLabel: "Delete", onConfirm: () => void persist({ ...manifest, campaigns: manifest.campaigns.filter((x) => x.id !== c.id) }) })} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && <tr><td colSpan={8} className="py-4 text-center text-ink-500">No campaigns match the filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Placement previews" subtitle="Exactly how each placement renders in the game for the currently selected campaign of that placement.">
          <div className="grid gap-3 md:grid-cols-2">
            {AD_PLACEMENTS.map((p) => (
              <div key={p} className="rounded-md border border-ink-700 bg-ink-900 p-2">
                <div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-semibold">{AD_PLACEMENT_LABELS[p]}</span><span className="text-ink-500">{AD_PLACEMENT_SIZES[p].width}×{AD_PLACEMENT_SIZES[p].height}</span></div>
                <AdSlot placement={p} preview />
                <div className="mt-1 text-[10px] text-ink-500">{AD_PLACEMENT_SIZES[p].note}{p === "billboard" ? " The in-world billboard is drawn in the Phaser scene; this is the equivalent card." : ""}</div>
              </div>
            ))}
          </div>
        </Panel>
        {editing && <CampaignEditor campaign={editing} isNew={isNew} existingIds={manifest.campaigns.map((c) => c.id)} onClose={() => setEditing(null)} onSave={(c) => { const next = isNew ? [...manifest.campaigns, c] : manifest.campaigns.map((x) => (x.id === editing.id ? c : x)); void persist({ ...manifest, campaigns: next }); setEditing(null); }} />}
        <footer className="text-[11px] text-ink-500">Default manifest ships {getDefaultManifest().campaigns.length} demo campaigns. Features that would require a backend (shared campaign changes, authentication, global analytics, remote image hosting, real-time advertiser management) are documented in docs/ADS.md and intentionally not faked here.</footer>
      </div>
      <ConfirmDialog />
    </main>
  );
}

function CampaignEditor({ campaign, isNew, existingIds, onClose, onSave }: { campaign: AdCampaign; isNew: boolean; existingIds: string[]; onClose: () => void; onSave: (c: AdCampaign) => void }) {
  const [form, setForm] = React.useState<Record<string, unknown>>({ ...campaign, startAt: campaign.startAt ? campaign.startAt.slice(0, 16) : "", endAt: campaign.endAt ? campaign.endAt.slice(0, 16) : "" });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const build = (): { ok: true; c: AdCampaign } | { ok: false; errors: string[] } => {
    const toIso = (v: unknown) => (typeof v === "string" && v ? new Date(v).toISOString() : null);
    const candidate = { ...form, startAt: toIso(form.startAt), endAt: toIso(form.endAt), priority: Number(form.priority), frequencyCapPerDay: Number(form.frequencyCapPerDay) };
    const r = adCampaignSchema.safeParse(candidate);
    if (!r.success) return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
    if (isNew && existingIds.includes(r.data.id)) return { ok: false, errors: ["id: a campaign with this id already exists"] };
    if (r.data.startAt && r.data.endAt && r.data.startAt > r.data.endAt) return { ok: false, errors: ["endAt: must be after startAt"] };
    return { ok: true, c: r.data };
  };

  const preview = React.useMemo(() => {
    const r = build();
    return r.ok ? r.c : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) { setErrors(["Only PNG, JPEG, GIF or WebP images are accepted."]); return; }
    if (file.size > MAX_IMAGE_BYTES) { setErrors([`Image is ${Math.round(file.size / 1024)} KB; the local limit is ${Math.round(MAX_IMAGE_BYTES / 1024)} KB. Reference a hosted or bundled image instead.`]); return; }
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
    try { await getDb().adImages.put({ id: `${Date.now()}-${file.name}`, name: file.name, dataUrl, size: file.size, createdAt: Date.now() }); } catch { /* storage optional */ }
    set("imageUrl", dataUrl);
    setUploading(false);
    setErrors([]);
  };

  return (
    <Modal title={isNew ? "New campaign" : `Edit ${campaign.campaignName || campaign.id}`} onClose={onClose} size="xl" footer={
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-danger">{errors[0]}</div>
        <div className="flex gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { const r = build(); if (!r.ok) { setErrors(r.errors); return; } onSave(r.c); }} data-testid="save-campaign">Save campaign</Button></div>
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Campaign id" hint="Letters, numbers, - and _"><input value={String(form.id)} onChange={(e) => set("id", e.target.value)} disabled={!isNew} data-testid="f-id" /></Field>
          <Field label="Placement"><select value={String(form.placement)} onChange={(e) => set("placement", e.target.value)} data-testid="f-placement">{AD_PLACEMENTS.map((p) => <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>)}</select></Field>
          <Field label="Advertiser name"><input value={String(form.advertiserName)} onChange={(e) => set("advertiserName", e.target.value)} data-testid="f-advertiser" /></Field>
          <Field label="Campaign name"><input value={String(form.campaignName)} onChange={(e) => set("campaignName", e.target.value)} data-testid="f-campaign" /></Field>
          <Field label="Headline" hint="Max 90 characters, no HTML"><input value={String(form.headline)} onChange={(e) => set("headline", e.target.value)} maxLength={90} data-testid="f-headline" /></Field>
          <Field label="Call to action"><input value={String(form.ctaText)} onChange={(e) => set("ctaText", e.target.value)} maxLength={24} /></Field>
          <div className="sm:col-span-2"><Field label="Description" hint="Max 240 characters, plain text"><textarea value={String(form.description)} onChange={(e) => set("description", e.target.value)} maxLength={240} rows={2} /></Field></div>
          <div className="sm:col-span-2"><Field label="Destination URL" hint="http(s) only. javascript:, data: and other schemes are rejected."><input value={String(form.clickUrl)} onChange={(e) => set("clickUrl", e.target.value)} data-testid="f-url" /></Field></div>
          <div className="sm:col-span-2">
            <Field label="Image" hint={`Recommended ${AD_PLACEMENT_SIZES[(form.placement as AdPlacement) ?? "hud_banner"].width}×${AD_PLACEMENT_SIZES[(form.placement as AdPlacement) ?? "hud_banner"].height}. Site-relative path (/ads/x.png), https URL, or upload (stored locally). Leave empty for a text-only banner.`}>
              <div className="flex gap-2"><input value={String(form.imageUrl).startsWith("data:") ? "(uploaded image)" : String(form.imageUrl)} onChange={(e) => set("imageUrl", e.target.value)} placeholder="/ads/my-banner.png" /><label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-ink-500 bg-ink-700 px-3 text-xs"><ImageIcon size={12} /> {uploading ? "…" : "Upload"}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>{String(form.imageUrl) && <Button size="sm" variant="ghost" onClick={() => set("imageUrl", "")}>Clear</Button>}</div>
            </Field>
          </div>
          <Field label="Start (optional)"><input type="datetime-local" value={String(form.startAt)} onChange={(e) => set("startAt", e.target.value)} /></Field>
          <Field label="End (optional)"><input type="datetime-local" value={String(form.endAt)} onChange={(e) => set("endAt", e.target.value)} /></Field>
          <Field label={`Priority: ${String(form.priority)}`} hint="Higher wins; ties rotate."><input type="range" min={1} max={100} value={Number(form.priority)} onChange={(e) => set("priority", Number(e.target.value))} /></Field>
          <Field label="Frequency cap per day (0 = unlimited)"><input type="number" min={0} max={1000} value={Number(form.frequencyCapPerDay)} onChange={(e) => set("frequencyCapPerDay", Number(e.target.value))} /></Field>
          <Field label="Districts (empty = all)"><div className="flex flex-wrap gap-1">{DISTRICTS.map((d) => { const sel = (form.districts as string[]).includes(d); return <button key={d} type="button" onClick={() => set("districts", sel ? (form.districts as string[]).filter((x) => x !== d) : [...(form.districts as string[]), d])} className={cx("rounded px-2 py-0.5 text-[11px]", sel ? "bg-gold-500 text-ink-950" : "bg-ink-700 text-ink-200")} aria-pressed={sel}>{d}</button>; })}</div></Field>
          <Field label="Devices (empty = all)"><div className="flex gap-1">{(["desktop", "mobile"] as const).map((d) => { const sel = (form.devices as string[]).includes(d); return <button key={d} type="button" onClick={() => set("devices", sel ? (form.devices as string[]).filter((x) => x !== d) : [...(form.devices as string[]), d])} className={cx("rounded px-2 py-0.5 text-[11px]", sel ? "bg-gold-500 text-ink-950" : "bg-ink-700 text-ink-200")} aria-pressed={sel}>{d}</button>; })}</div></Field>
          <Field label="Label"><input value={String(form.label)} onChange={(e) => set("label", e.target.value)} maxLength={60} /></Field>
          <Field label="Enabled"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.enabled)} onChange={(e) => set("enabled", e.target.checked)} /> Campaign is active</label></Field>
          <div className="sm:col-span-2"><Field label="Internal notes"><textarea value={String(form.notes)} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} /></Field></div>
          {errors.length > 0 && <ul className="list-inside list-disc text-xs text-danger sm:col-span-2" data-testid="form-errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-300">Live preview</div>
          {preview ? <AdSlot placement={preview.placement} campaignOverride={preview} preview /> : <div className="rounded-md border border-dashed border-danger/60 p-3 text-xs text-danger">Fix validation errors to preview.</div>}
          <p className="mt-2 text-[11px] text-ink-500">Rendered with the same component the game uses. Ads are always labelled &quot;Sponsored&quot;, open in a new tab with no opener, and cannot contain scripts or HTML.</p>
        </div>
      </div>
    </Modal>
  );
}
