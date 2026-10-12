import { BALANCE } from "@/data/balance";
import { BUSINESS_MAP, INVESTMENT_MAP, PROPERTY_MAP, VEHICLE_MAP } from "@/data/businesses";
import { ITEM_MAP } from "@/data/items";
import type { GameState, Transaction } from "@/types/game";
import { uid } from "@/utils/ids";

export type MoneyResult = { ok: true } | { ok: false; reason: string };

function clampMoney(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(BALANCE.numeric.maxMoney, Math.round(v)));
}

function record(state: GameState, t: Omit<Transaction, "id">) {
  state.transactions.unshift({ id: uid("tx"), ...t });
  if (state.transactions.length > BALANCE.transactionsLimit) state.transactions.length = BALANCE.transactionsLimit;
}

/** Adds money to cash. Negative amounts are rejected; use spendCash. */
export function addCash(state: GameState, amount: number, category: string, note: string, at: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = state.player.cash;
  state.player.cash = clampMoney(before + amount);
  const actual = state.player.cash - before;
  state.stats.totalEarned += actual;
  record(state, { at, amount: actual, balanceAfter: state.player.cash, account: "cash", category, note });
  return actual;
}

/** Spends from cash. Fails without mutating when funds are insufficient. */
export function spendCash(state: GameState, amount: number, category: string, note: string, at: number): MoneyResult {
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, reason: "Invalid amount" };
  if (amount === 0) return { ok: true };
  if (state.player.cash < amount) return { ok: false, reason: `Not enough cash (need ${Math.round(amount - state.player.cash).toLocaleString()} more)` };
  state.player.cash = clampMoney(state.player.cash - amount);
  state.stats.totalSpent += amount;
  record(state, { at, amount: -amount, balanceAfter: state.player.cash, account: "cash", category, note });
  return { ok: true };
}

/**
 * Forced expense (rent, upkeep, fines). Takes from cash first, then bank, and
 * never pushes a balance negative — any shortfall is returned to the caller.
 */
export function chargeExpense(state: GameState, amount: number, category: string, note: string, at: number): { paid: number; shortfall: number } {
  if (!Number.isFinite(amount) || amount <= 0) return { paid: 0, shortfall: 0 };
  let remaining = Math.round(amount);
  const fromCash = Math.min(state.player.cash, remaining);
  if (fromCash > 0) {
    state.player.cash = clampMoney(state.player.cash - fromCash);
    remaining -= fromCash;
    record(state, { at, amount: -fromCash, balanceAfter: state.player.cash, account: "cash", category, note });
  }
  if (remaining > 0 && state.player.bank > 0) {
    const fromBank = Math.min(state.player.bank, remaining);
    state.player.bank = clampMoney(state.player.bank - fromBank);
    remaining -= fromBank;
    record(state, { at, amount: -fromBank, balanceAfter: state.player.bank, account: "bank", category, note: `${note} (bank)` });
  }
  const paid = Math.round(amount) - remaining;
  state.stats.totalSpent += paid;
  return { paid, shortfall: remaining };
}

export function deposit(state: GameState, amount: number, at: number): MoneyResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Invalid amount" };
  if (state.player.cash < amount) return { ok: false, reason: "Not enough cash" };
  state.player.cash = clampMoney(state.player.cash - amount);
  state.player.bank = clampMoney(state.player.bank + amount);
  record(state, { at, amount: -amount, balanceAfter: state.player.cash, account: "cash", category: "bank", note: "Deposit to bank" });
  record(state, { at, amount, balanceAfter: state.player.bank, account: "bank", category: "bank", note: "Deposit" });
  return { ok: true };
}

export function withdraw(state: GameState, amount: number, at: number): MoneyResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Invalid amount" };
  if (state.player.bank < amount) return { ok: false, reason: "Not enough in bank" };
  state.player.bank = clampMoney(state.player.bank - amount);
  state.player.cash = clampMoney(state.player.cash + amount);
  record(state, { at, amount: -amount, balanceAfter: state.player.bank, account: "bank", category: "bank", note: "Withdrawal" });
  record(state, { at, amount, balanceAfter: state.player.cash, account: "cash", category: "bank", note: "Withdrawal from bank" });
  return { ok: true };
}

export function inventoryValue(state: GameState): number {
  let total = 0;
  for (const [id, qty] of Object.entries(state.inventory.items)) {
    const item = ITEM_MAP[id];
    if (item) total += item.sellPrice * qty;
  }
  return total;
}

export function investmentValue(state: GameState): number {
  let total = 0;
  for (const [id, holding] of Object.entries(state.investments.holdings)) {
    const price = state.investments.prices[id] ?? INVESTMENT_MAP[id]?.basePrice ?? 0;
    total += holding.units * price;
  }
  return Math.round(total);
}

export function businessValue(state: GameState): number {
  let total = 0;
  for (const b of state.businesses.owned) {
    const def = BUSINESS_MAP[b.typeId];
    if (!def) continue;
    total += def.price * (1 + (b.level - 1) * 0.5) * 0.8;
  }
  return Math.round(total);
}

export function propertyValue(state: GameState): number {
  return state.properties.owned.reduce((sum, id) => {
    const p = PROPERTY_MAP[id];
    return sum + (p && !p.rental ? p.price * 0.9 : 0);
  }, 0);
}

export function vehicleValue(state: GameState): number {
  return state.vehicles.owned.reduce((sum, id) => sum + (VEHICLE_MAP[id]?.price ?? 0) * 0.7, 0);
}

export function netWorth(state: GameState): number {
  return Math.round(
    state.player.cash + state.player.bank + inventoryValue(state) + investmentValue(state) + businessValue(state) + propertyValue(state) + vehicleValue(state),
  );
}
