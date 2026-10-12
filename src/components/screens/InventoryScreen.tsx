"use client";
import * as React from "react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { ITEM_MAP } from "@/data/items";
import { Button, Empty, Money, Panel, Tag, Tabs, cx } from "@/components/ui";
import { equipItem, inventoryCapacity, inventoryCount, sellItem, unequipItem, consumeItem } from "@/simulation/shop";
import { EQUIP_SLOTS, type EquipSlot } from "@/types/game";
import { describeMod } from "@/components/screens/ProfileScreen";

const SLOT_LABELS: Record<EquipSlot, string> = { phone: "Phone", computer: "Computer", internet: "Internet", furniture: "Furniture", clothing: "Clothing", accessory: "Accessory", businessEquipment: "Business equipment" };

export function InventoryScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const ask = useUiStore((s) => s.ask);
  const [tab, setTab] = React.useState<"equipment" | "items">("equipment");
  const owned = Object.entries(game.inventory.items).filter(([, q]) => q > 0).map(([id, qty]) => ({ def: ITEM_MAP[id]!, qty })).filter((x) => x.def);
  const consumables = owned.filter((x) => x.def.category === "consumable" || x.def.category === "collectible");
  const gear = owned.filter((x) => EQUIP_SLOTS.includes(x.def.category as EquipSlot));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-300">
        <span>Capacity {inventoryCount(game)}/{inventoryCapacity(game)}</span>
      </div>
      <Tabs tabs={[{ id: "equipment", label: "Equipment" }, { id: "items", label: "Items & collectibles" }]} value={tab} onChange={setTab} />
      {tab === "equipment" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {EQUIP_SLOTS.map((slot) => {
            const equippedId = game.inventory.equipped[slot];
            const equipped = equippedId ? ITEM_MAP[equippedId] : null;
            const options = gear.filter((g) => g.def.category === slot);
            return (
              <Panel key={slot} title={SLOT_LABELS[slot]} subtitle={equipped ? `Equipped: ${equipped.name} (tier ${equipped.tier})` : "Nothing equipped"}>
                {options.length === 0 ? <Empty>No {SLOT_LABELS[slot].toLowerCase()} owned. Shops around the city sell upgrades.</Empty> : (
                  <ul className="space-y-1">
                    {options.map(({ def }) => (
                      <li key={def.id} className={cx("flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs", equippedId === def.id ? "border-gold-400/60 bg-ink-800" : "border-ink-700 bg-ink-900")}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="font-semibold">{def.name}</span><Tag>T{def.tier}</Tag></div>
                          <div className="text-[11px] text-ink-300">{def.description}</div>
                          <div className="text-[10px] text-ink-400">{def.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ") || "No bonuses"}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {equippedId === def.id ? <Button size="sm" variant="ghost" onClick={() => act((s) => unequipItem(s, slot))}>Unequip</Button> : <Button size="sm" variant="primary" onClick={() => { const r = act((s) => equipItem(s, def.id)); if (!r.ok) toast(r.reason ?? "", "bad"); }}>Equip</Button>}
                          {def.sellPrice > 0 && def.tier > 1 && (
                            <Button size="sm" variant="ghost" onClick={() => ask({ title: "Sell item?", message: `Sell ${def.name} for ${def.sellPrice.toLocaleString()}?`, confirmLabel: "Sell", onConfirm: () => { const r = act((s, ctx) => sellItem(s, def.id, ctx.now)); toast(r.ok ? "Sold." : r.reason ?? "", r.ok ? "money" : "bad"); } })}>Sell <Money amount={def.sellPrice} className="text-[10px]" /></Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      ) : consumables.length === 0 ? <Empty>No consumables or collectibles. Food restores energy; collectibles raise fame and appreciate in value.</Empty> : (
        <ul className="grid gap-2 md:grid-cols-2">
          {consumables.map(({ def, qty }) => (
            <li key={def.id} className="panel-raised flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <div>
                <div className="flex items-center gap-2"><span className="font-semibold">{def.name}</span><Tag>×{qty}</Tag><Tag color="bg-ink-800 text-ink-300">{def.category}</Tag></div>
                <div className="text-ink-300">{def.description}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                {def.category === "consumable" && <Button size="sm" variant="primary" onClick={() => { const r = act((s, ctx) => consumeItem(s, def.id, ctx.now)); toast(r.ok ? `Used ${def.name}.` : r.reason ?? "", r.ok ? "good" : "bad"); }} data-testid={`use-${def.id}`}>Use</Button>}
                {def.sellPrice > 0 && <Button size="sm" variant="ghost" onClick={() => { const r = act((s, ctx) => sellItem(s, def.id, ctx.now)); toast(r.ok ? "Sold." : r.reason ?? "", r.ok ? "money" : "bad"); }}>Sell <Money amount={def.sellPrice} className="text-[10px]" /></Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
