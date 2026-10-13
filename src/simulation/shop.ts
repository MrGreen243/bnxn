import { DISTRICT_MAP } from "@/data/districts";
import { ITEM_MAP } from "@/data/items";
import { PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import type { EquipSlot, GameState } from "@/types/game";
import { addCash, spendCash } from "@/simulation/economy/money";
import { applyEffects, logEvent } from "@/simulation/effects";
import { getMods } from "@/simulation/modifiers";
import { checkAll } from "@/simulation/requirements";
import { EQUIP_SLOTS } from "@/types/game";

export function itemPrice(state: GameState, itemId: string, districtId = state.player.districtId): number {
  const item = ITEM_MAP[itemId];
  if (!item) return 0;
  const district = DISTRICT_MAP[districtId];
  const mods = getMods(state);
  const discount = item.category === "consumable" ? 1 : mods.shopDiscount;
  return Math.round(item.price * (district?.priceMultiplier ?? 1) * discount);
}

export function inventoryCount(state: GameState): number {
  return Object.values(state.inventory.items).reduce((a, b) => a + b, 0);
}

export function inventoryCapacity(state: GameState): number {
  return state.inventory.capacity + getMods(state).inventoryCapacity;
}

export function buyItem(state: GameState, itemId: string, at: number, qty = 1): { ok: boolean; reason?: string } {
  const item = ITEM_MAP[itemId];
  if (!item) return { ok: false, reason: "Unknown item" };
  if (!checkAll(state, item.requirements)) return { ok: false, reason: "Requirements not met" };
  if (!item.stackable && (state.inventory.items[itemId] ?? 0) > 0) return { ok: false, reason: "Already owned" };
  if (inventoryCount(state) + qty > inventoryCapacity(state)) return { ok: false, reason: "Inventory full" };
  const price = itemPrice(state, itemId) * qty;
  const r = spendCash(state, price, "shop", `Bought ${item.name}${qty > 1 ? ` ×${qty}` : ""}`, at);
  if (!r.ok) return r;
  state.inventory.items[itemId] = (state.inventory.items[itemId] ?? 0) + qty;
  state.stats.itemsBought += qty;
  state.quests.flags.bought_anything = true;
  // auto-equip upgrades for equipment categories when better than current
  if (EQUIP_SLOTS.includes(item.category as EquipSlot)) {
    const slot = item.category as EquipSlot;
    const current = state.inventory.equipped[slot];
    if (!current || (ITEM_MAP[current]?.tier ?? 0) < item.tier) state.inventory.equipped[slot] = itemId;
  }
  return { ok: true };
}

export function sellItem(state: GameState, itemId: string, at: number): { ok: boolean; reason?: string } {
  const item = ITEM_MAP[itemId];
  if (!item || (state.inventory.items[itemId] ?? 0) <= 0) return { ok: false, reason: "You don't own this" };
  if (item.tier === 1 && EQUIP_SLOTS.includes(item.category as EquipSlot)) return { ok: false, reason: "Can't sell starter gear" };
  if (item.sellPrice <= 0) return { ok: false, reason: "Nobody wants this" };
  const remaining = (state.inventory.items[itemId] ?? 0) - 1;
  if (remaining <= 0) delete state.inventory.items[itemId];
  else state.inventory.items[itemId] = remaining;
  for (const slot of EQUIP_SLOTS) {
    if (state.inventory.equipped[slot] === itemId && !state.inventory.items[itemId]) {
      const fallback = Object.keys(state.inventory.items).map((i) => ITEM_MAP[i]).filter((it) => it && it.category === slot).sort((a, b) => b!.tier - a!.tier)[0];
      state.inventory.equipped[slot] = fallback ? fallback.id : null;
    }
  }
  addCash(state, item.sellPrice, "shop", `Sold ${item.name}`, at);
  return { ok: true };
}

export function equipItem(state: GameState, itemId: string): { ok: boolean; reason?: string } {
  const item = ITEM_MAP[itemId];
  if (!item || (state.inventory.items[itemId] ?? 0) <= 0) return { ok: false, reason: "You don't own this" };
  if (!EQUIP_SLOTS.includes(item.category as EquipSlot)) return { ok: false, reason: "Not equippable" };
  state.inventory.equipped[item.category as EquipSlot] = itemId;
  return { ok: true };
}

export function unequipItem(state: GameState, slot: EquipSlot): void {
  state.inventory.equipped[slot] = null;
}

export function consumeItem(state: GameState, itemId: string, at: number): { ok: boolean; reason?: string } {
  const item = ITEM_MAP[itemId];
  if (!item || (state.inventory.items[itemId] ?? 0) <= 0) return { ok: false, reason: "You don't own this" };
  if (item.category !== "consumable" || !item.effects) return { ok: false, reason: "Not usable" };
  const remaining = (state.inventory.items[itemId] ?? 0) - 1;
  if (remaining <= 0) delete state.inventory.items[itemId];
  else state.inventory.items[itemId] = remaining;
  applyEffects(state, item.effects, at);
  return { ok: true };
}

export function buyProperty(state: GameState, propertyId: string, at: number): { ok: boolean; reason?: string } {
  const p = PROPERTY_MAP[propertyId];
  if (!p) return { ok: false, reason: "Unknown property" };
  if (state.properties.owned.includes(propertyId)) return { ok: false, reason: "Already owned" };
  if (!state.player.unlockedDistricts.includes(p.district)) return { ok: false, reason: "District locked" };
  if (!checkAll(state, p.requirements)) return { ok: false, reason: "Requirements not met" };
  const r = spendCash(state, p.price, "property", `${p.rental ? "Rented" : "Bought"} ${p.name}`, at);
  if (!r.ok) return r;
  state.properties.owned.push(propertyId);
  state.properties.current = propertyId;
  state.player.stats.lifestyle = Math.min(100, state.player.stats.lifestyle + p.tier * 2);
  logEvent(state, `New home: ${p.name}.`, "good", at);
  return { ok: true };
}

export function moveIntoProperty(state: GameState, propertyId: string): { ok: boolean; reason?: string } {
  if (!state.properties.owned.includes(propertyId)) return { ok: false, reason: "Not owned" };
  state.properties.current = propertyId;
  return { ok: true };
}

export function buyVehicle(state: GameState, vehicleId: string, at: number): { ok: boolean; reason?: string } {
  const v = VEHICLE_MAP[vehicleId];
  if (!v) return { ok: false, reason: "Unknown vehicle" };
  if (state.vehicles.owned.includes(vehicleId)) return { ok: false, reason: "Already owned" };
  if (!checkAll(state, v.requirements)) return { ok: false, reason: "Requirements not met" };
  const r = spendCash(state, v.price, "vehicle", `Bought ${v.name}`, at);
  if (!r.ok) return r;
  state.vehicles.owned.push(vehicleId);
  state.vehicles.current = vehicleId;
  state.vehicles.condition[vehicleId] = 100;
  state.player.stats.lifestyle = Math.min(100, state.player.stats.lifestyle + v.tier * 2);
  logEvent(state, `New ride: ${v.name}.`, "good", at);
  return { ok: true };
}

export function selectVehicle(state: GameState, vehicleId: string | null): { ok: boolean; reason?: string } {
  if (vehicleId && !state.vehicles.owned.includes(vehicleId)) return { ok: false, reason: "Not owned" };
  state.vehicles.current = vehicleId;
  return { ok: true };
}

export function sellVehicle(state: GameState, vehicleId: string, at: number): { ok: boolean; reason?: string } {
  const v = VEHICLE_MAP[vehicleId];
  if (!v || !state.vehicles.owned.includes(vehicleId)) return { ok: false, reason: "Not owned" };
  state.vehicles.owned = state.vehicles.owned.filter((x) => x !== vehicleId);
  if (state.vehicles.current === vehicleId) state.vehicles.current = state.vehicles.owned[0] ?? null;
  addCash(state, Math.round(v.price * 0.6), "vehicle", `Sold ${v.name}`, at);
  return { ok: true };
}
