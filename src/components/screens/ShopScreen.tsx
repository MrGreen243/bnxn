"use client";
import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { SHOP_MAP, SHOPS } from "@/data/districts";
import { ITEM_MAP } from "@/data/items";
import { Button, Empty, Money, Tag, cx } from "@/components/ui";
import { buyItem, itemPrice } from "@/simulation/shop";
import { describeRequirement, unmetRequirements } from "@/simulation/requirements";
import { describeMod } from "@/components/screens/ProfileScreen";
import type { EquipSlot } from "@/types/game";
import { EQUIP_SLOTS } from "@/types/game";
import { AdSlot } from "@/components/ads/AdSlot";

export function ShopScreen({ shopId }: { shopId: string | null }) {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const toast = useUiStore((s) => s.toast);
  const shop = (shopId && SHOP_MAP[shopId]) || SHOPS[0]!;
  const items = shop.items.map((id) => ITEM_MAP[id]).filter(Boolean);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-2 font-semibold"><ShoppingBag size={14} /> {shop.name}</div><span>Cash: <Money amount={game.player.cash} /></span></div>
      {items.length === 0 ? <Empty>Shelves are empty.</Empty> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const price = itemPrice(game, item!.id);
            const owned = game.inventory.items[item!.id] ?? 0;
            const isGear = EQUIP_SLOTS.includes(item!.category as EquipSlot);
            const currentTier = isGear ? (game.inventory.equipped[item!.category as EquipSlot] ? ITEM_MAP[game.inventory.equipped[item!.category as EquipSlot]!]?.tier ?? 0 : 0) : 0;
            const unmet = unmetRequirements(game, item!.requirements);
            const canBuy = unmet.length === 0 && game.player.cash >= price && (item!.stackable || owned === 0);
            return (
              <li key={item!.id} className={cx("flex flex-col gap-1 rounded-md border p-3 text-xs", owned && !item!.stackable ? "border-growth/50 bg-ink-900" : "border-ink-700 bg-ink-900")} data-testid={`shop-item-${item!.id}`}>
                <div className="flex items-center gap-2 font-semibold">{item!.name} <Tag>T{item!.tier}</Tag>{isGear && item!.tier > currentTier && <Tag color="bg-growth-dim text-ink-100">Upgrade</Tag>}{owned > 0 && <Tag color="bg-ink-600">Owned{item!.stackable ? ` ×${owned}` : ""}</Tag>}</div>
                <div className="text-ink-300">{item!.description}</div>
                <div className="text-[11px] text-ink-400">{item!.modifiers.map((m) => describeMod(m.key, m.value)).join(" · ")}{item!.effects?.length ? "Consumable" : ""}</div>
                {unmet.length > 0 && <div className="text-[11px] text-danger">Requires: {unmet.map(describeRequirement).join(", ")}</div>}
                <div className="mt-1 flex items-center justify-between">
                  <span><Money amount={price} />{price !== item!.price && <span className="ml-1 text-[10px] text-ink-500 line-through">{item!.price.toLocaleString()}</span>}</span>
                  <Button size="sm" variant="primary" disabled={!canBuy} onClick={() => { const r = act((s, ctx) => buyItem(s, item!.id, ctx.now)); toast(r.ok ? `Bought ${item!.name}.` : r.reason ?? "", r.ok ? "money" : "bad"); }} data-testid={`buy-${item!.id}`}>{owned > 0 && !item!.stackable ? "Owned" : "Buy"}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {shop.id.includes("cv_") || shop.id === "cafe" || shop.id === "lk_tech" ? <AdSlot placement="computer_screen" /> : null}
    </div>
  );
}
