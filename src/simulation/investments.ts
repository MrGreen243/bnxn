import { BALANCE } from "@/data/balance";
import { INVESTMENT_ASSETS, INVESTMENT_MAP } from "@/data/businesses";
import type { GameState } from "@/types/game";
import { addCash, spendCash } from "@/simulation/economy/money";
import type { Modifiers } from "@/simulation/modifiers";
import type { Rng } from "@/utils/rng";

/** Advances fictional market prices for each elapsed tick (deterministic given the RNG). */
export function tickInvestments(state: GameState, at: number, rng: Rng, mods: Modifiers): number {
  let ticks = 0;
  while (state.investments.lastTickAt + BALANCE.investments.tickMs <= at && ticks < 2000) {
    state.investments.lastTickAt += BALANCE.investments.tickMs;
    ticks++;
    for (const asset of INVESTMENT_ASSETS) {
      const price = state.investments.prices[asset.id] ?? asset.basePrice;
      const shock = (rng.next() * 2 - 1) * asset.volatility;
      const meanReversion = (asset.basePrice * (1 + 0.5 * Math.log1p(ticks)) - price) * 0.001;
      const drift = (asset.drift + mods.investmentReturn) * 0.25;
      const next = Math.max(asset.basePrice * 0.1, price * (1 + drift + shock) + meanReversion);
      state.investments.prices[asset.id] = Math.round(next * 100) / 100;
      const hist = state.investments.history[asset.id] ?? [];
      hist.push(state.investments.prices[asset.id]!);
      if (hist.length > BALANCE.investments.historyLength) hist.splice(0, hist.length - BALANCE.investments.historyLength);
      state.investments.history[asset.id] = hist;
    }
  }
  return ticks;
}

export function buyInvestment(state: GameState, assetId: string, units: number, at: number): { ok: boolean; reason?: string } {
  const asset = INVESTMENT_MAP[assetId];
  if (!asset) return { ok: false, reason: "Unknown asset" };
  if (!Number.isFinite(units) || units < asset.minUnits) return { ok: false, reason: "Invalid amount" };
  const price = state.investments.prices[assetId] ?? asset.basePrice;
  const cost = Math.round(units * price);
  const r = spendCash(state, cost, "investment", `Bought ${units} ${asset.name}`, at);
  if (!r.ok) return r;
  const h = state.investments.holdings[assetId] ?? { units: 0, invested: 0 };
  h.units += units;
  h.invested += cost;
  state.investments.holdings[assetId] = h;
  return { ok: true };
}

export function sellInvestment(state: GameState, assetId: string, units: number, at: number): { ok: boolean; reason?: string; proceeds?: number } {
  const asset = INVESTMENT_MAP[assetId];
  const h = state.investments.holdings[assetId];
  if (!asset || !h) return { ok: false, reason: "Nothing to sell" };
  if (!Number.isFinite(units) || units <= 0 || units > h.units) return { ok: false, reason: "Invalid amount" };
  const price = state.investments.prices[assetId] ?? asset.basePrice;
  const proceeds = Math.round(units * price);
  const costBasis = Math.round((h.invested * units) / h.units);
  h.units -= units;
  h.invested -= costBasis;
  if (h.units <= 0) delete state.investments.holdings[assetId];
  addCash(state, proceeds, "investment", `Sold ${units} ${asset.name}`, at);
  state.stats.investmentProfit += proceeds - costBasis;
  return { ok: true, proceeds };
}
