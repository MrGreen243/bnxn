"use client";
import * as React from "react";
import { Check, Home, Car, Shirt } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { PROPERTIES, VEHICLES } from "@/data/businesses";
import { ITEMS, ITEM_MAP } from "@/data/items";
import { DISTRICT_MAP } from "@/data/districts";
import { Button, Money, Tag, cx, Panel } from "@/components/ui";
import { buyProperty, buyVehicle, equipItem, moveIntoProperty, selectVehicle, sellVehicle } from "@/simulation/shop";
import { describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { describeMod } from "@/components/screens/ProfileScreen";
import { AvatarPreview } from "@/components/menu/AvatarPreview";

export function PropertyScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {PROPERTIES.map((p) => {
        const owned = game.properties.owned.includes(p.id);
        const current = game.properties.current === p.id;
        const unmet = unmetRequirements(game, p.requirements);
        const districtOk = game.player.unlockedDistricts.includes(p.district);
        return (
          <div key={p.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", current ? "border-gold-400 bg-ink-800" : owned ? "border-growth/50 bg-ink-900" : "border-ink-700 bg-ink-900")} data-testid={`property-${p.id}`}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><Home size={14} /> {p.name} <Tag>Tier {p.tier}</Tag></div>{current && <Tag color="bg-gold-500 text-ink-950">Living here</Tag>}</div>
            <div className="text-ink-400">{DISTRICT_MAP[p.district]?.name} · {p.rental ? "Rental" : "Owned property"}</div>
            <p className="text-ink-300">{p.description}</p>
            <div className="text-[11px] text-ink-300">{p.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ") || "No bonuses"}</div>
            <div className="text-[11px] text-ink-400">{p.rentPerDay > 0 ? <>Rent <Money amount={p.rentPerDay} className="text-[11px]" />/day · </> : null}Upkeep <Money amount={p.upkeepPerDay} className="text-[11px]" />/day</div>
            {!owned && unmet.length > 0 && <div className="text-[11px] text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
            {!owned && !districtOk && <div className="text-[11px] text-danger">Unlock {DISTRICT_MAP[p.district]?.name} first.</div>}
            <div className="mt-1 flex items-center justify-between">
              <span>{p.price > 0 ? <Money amount={p.price} /> : "Free"}</span>
              {owned ? (
                <Button size="sm" variant={current ? "ghost" : "primary"} disabled={current} icon={current ? <Check size={12} /> : undefined} onClick={() => act((s) => moveIntoProperty(s, p.id))}>{current ? "Current" : "Move in"}</Button>
              ) : (
                <Button size="sm" variant="primary" disabled={unmet.length > 0 || !districtOk || game.player.cash < p.price} onClick={() => ask({ title: `${p.rental ? "Rent" : "Buy"} ${p.name}?`, message: `Pay ${p.price.toLocaleString()} now. Daily costs will change to rent ${p.rentPerDay.toLocaleString()} + upkeep ${p.upkeepPerDay.toLocaleString()}.`, confirmLabel: p.rental ? "Rent" : "Buy", onConfirm: () => { const r = act((s, ctx) => buyProperty(s, p.id, ctx.now)); toast(r.ok ? `Welcome home: ${p.name}.` : r.reason ?? "", r.ok ? "good" : "bad"); } })}>{p.rental ? "Rent" : "Buy"}</Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GarageScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  return (
    <div className="space-y-3">
      <div className="panel-raised px-3 py-2 text-xs">Current ride: <span className="font-semibold">{game.vehicles.current ? VEHICLES.find((v) => v.id === game.vehicles.current)?.name : "Public transport (₦400/day)"}</span>{game.vehicles.current && <Button size="sm" variant="ghost" className="ml-2" onClick={() => act((s) => selectVehicle(s, null))}>Use public transport</Button>}</div>
      <div className="grid gap-2 md:grid-cols-2">
        {VEHICLES.map((v) => {
          const owned = game.vehicles.owned.includes(v.id);
          const current = game.vehicles.current === v.id;
          const unmet = unmetRequirements(game, v.requirements);
          return (
            <div key={v.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", current ? "border-gold-400 bg-ink-800" : owned ? "border-growth/50 bg-ink-900" : "border-ink-700 bg-ink-900")}>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><Car size={14} /> {v.name} <Tag>Tier {v.tier}</Tag></div>{current && <Tag color="bg-gold-500 text-ink-950">Driving</Tag>}</div>
              <div className="text-ink-400">{v.brand}</div>
              <p className="text-ink-300">{v.description}</p>
              <div className="text-[11px] text-ink-300">{v.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ")}</div>
              <div className="text-[11px] text-ink-400">Upkeep <Money amount={v.upkeepPerDay} className="text-[11px]" />/day</div>
              {!owned && unmet.length > 0 && <div className="text-[11px] text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
              <div className="mt-1 flex items-center justify-between">
                <Money amount={v.price} />
                <div className="flex gap-1">
                  {owned ? (<>
                    <Button size="sm" variant={current ? "ghost" : "primary"} disabled={current} onClick={() => act((s) => selectVehicle(s, v.id))}>{current ? "Selected" : "Drive"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => ask({ title: "Sell vehicle?", message: `Sell ${v.name} for ${Math.round(v.price * 0.6).toLocaleString()}?`, confirmLabel: "Sell", onConfirm: () => { const r = act((s, ctx) => sellVehicle(s, v.id, ctx.now)); toast(r.ok ? "Sold." : r.reason ?? "", r.ok ? "money" : "bad"); } })}>Sell</Button>
                  </>) : (
                    <Button size="sm" variant="primary" disabled={unmet.length > 0 || game.player.cash < v.price} onClick={() => ask({ title: `Buy ${v.name}?`, message: `Pay ${v.price.toLocaleString()}. Upkeep ${v.upkeepPerDay.toLocaleString()} per day.`, confirmLabel: "Buy", onConfirm: () => { const r = act((s, ctx) => buyVehicle(s, v.id, ctx.now)); toast(r.ok ? `New ride: ${v.name}.` : r.reason ?? "", r.ok ? "good" : "bad"); } })}>Buy</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FashionScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const openScreen = useUiStore((s) => s.openScreen);
  const wardrobe = ITEMS.filter((i) => i.category === "clothing" || i.category === "accessory");
  return (
    <div className="grid gap-3 md:grid-cols-[200px_1fr]">
      <Panel title="Your look">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-md border border-ink-600 bg-ink-950 p-2"><AvatarPreview skin={game.player.avatar.skin} hair={game.player.avatar.hair} outfit={game.player.avatar.outfit} size={5} /></div>
          <div className="text-xs"><div className="text-ink-400">Outfit</div><div className="font-semibold">{game.inventory.equipped.clothing ? ITEM_MAP[game.inventory.equipped.clothing]?.name : "—"}</div></div>
          <div className="text-xs"><div className="text-ink-400">Accessory</div><div className="font-semibold">{game.inventory.equipped.accessory ? ITEM_MAP[game.inventory.equipped.accessory]?.name : "—"}</div></div>
          <div className="text-xs text-ink-400">Lifestyle {Math.round(game.player.stats.lifestyle)} · Fame {Math.round(game.player.stats.fame)}</div>
        </div>
      </Panel>
      <div className="grid gap-2 sm:grid-cols-2">
        {wardrobe.map((item) => {
          const owned = (game.inventory.items[item.id] ?? 0) > 0;
          const equipped = game.inventory.equipped[item.category as "clothing" | "accessory"] === item.id;
          const sellsHere = item.districts.includes(game.player.districtId);
          return (
            <div key={item.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", equipped ? "border-gold-400 bg-ink-800" : owned ? "border-growth/50 bg-ink-900" : "border-ink-700 bg-ink-900")}>
              <div className="flex items-center gap-2 font-semibold"><Shirt size={13} /> {item.name} <Tag>T{item.tier}</Tag></div>
              <div className="text-ink-300">{item.description}</div>
              <div className="text-[11px] text-ink-400">{item.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ") || "Pure style"}</div>
              <div className="mt-1 flex items-center justify-between">
                <Money amount={item.price} />
                {owned ? <Button size="sm" variant={equipped ? "ghost" : "primary"} disabled={equipped} onClick={() => { const r = act((s) => equipItem(s, item.id)); if (!r.ok) toast(r.reason ?? "", "bad"); }}>{equipped ? "Wearing" : "Wear"}</Button> : (
                  <span className="text-[11px] text-ink-400">{sellsHere ? <Button size="sm" onClick={() => openScreen("shop", item.districts.includes("mainland") ? "barber" : "su_fashion")}>Find in shop</Button> : `Sold in ${item.districts.map((d) => DISTRICT_MAP[d]?.name).join(", ")}`}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
