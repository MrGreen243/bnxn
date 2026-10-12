import type { InteractionActionDef } from "@/data/types";
import { BUSINESS_MAP } from "@/data/businesses";
import { gameEvents, type InteractionTarget } from "@/game/engine/events";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { collectBusiness } from "@/simulation/businesses/businesses";
import { spendCash } from "@/simulation/economy/money";
import { adjustStat } from "@/simulation/effects";
import { maxEnergy } from "@/simulation/modifiers";
import { startDialogue } from "@/simulation/npc";
import { addSkillXp } from "@/simulation/progression/skills";
import { startActivity } from "@/simulation/idle/activities";
import { bumpDaily } from "@/simulation/daily";
import { formatNaira } from "@/utils/format";
import { openAdLink, selectCampaign } from "@/ads/adService";
import type { GameState } from "@/types/game";

let returnPosition: { x: number; y: number } | null = null;

function parseCost(label?: string): number {
  const m = label?.match(/₦([\d,]+)/);
  return m ? Number(m[1]!.replace(/,/g, "")) : 0;
}

/** Decide which of a target's actions make sense right now. */
export function availableActions(game: GameState, target: InteractionTarget): InteractionActionDef[] {
  return target.actions.filter((a) => {
    if (a.type === "collect") return game.businesses.owned.some((b) => BUSINESS_MAP[b.typeId]?.district === game.player.districtId);
    return true;
  });
}

export function resolveInteraction(target: InteractionTarget) {
  const game = useGameStore.getState().game;
  if (!game) return;
  const ui = useUiStore.getState();
  const actions = availableActions(game, target);
  if (actions.length === 0) return;
  if (target.kind === "npc" || target.kind === "exit" || actions.length === 1) {
    performAction(actions[0]!, target);
    return;
  }
  ui.setActionSheet({ title: target.label, actions, target });
}

export function performAction(action: InteractionActionDef, target: InteractionTarget) {
  const store = useGameStore.getState();
  const ui = useUiStore.getState();
  const game = store.game;
  if (!game) return;
  ui.setActionSheet(null);
  switch (action.type) {
    case "talk": {
      const node = store.act((s, ctx) => startDialogue(s, action.npcId, ctx.now));
      if (node) ui.setDialogue({ npcId: action.npcId, node });
      else ui.toast("They have nothing to say right now.", "info");
      break;
    }
    case "shop":
      ui.openScreen("shop", action.shopId);
      break;
    case "jobs":
      ui.openScreen("activities", action.category ?? null);
      break;
    case "screen":
      ui.openScreen(action.screen);
      break;
    case "enter":
      returnPosition = { x: target.x, y: target.y + 10 };
      store.act((s) => {
        s.player.interiorId = action.interiorId;
        if (!s.player.discoveredLocations.includes(`interior:${action.interiorId}`)) s.player.discoveredLocations.push(`interior:${action.interiorId}`);
      }, { silent: true });
      gameEvents.emit("world:setLocation", { districtId: game.player.districtId, interiorId: action.interiorId });
      break;
    case "collect": {
      const total = store.act((s, ctx) => {
        const amount = collectBusiness(s, "all", ctx.now);
        if (amount > 0) bumpDaily(s, "collect");
        return amount;
      });
      if (total > 0) {
        ui.float(`+${formatNaira(total)}`, "money");
        ui.toast(`Collected ${formatNaira(total)} from your businesses.`, "money");
      } else ui.toast("Nothing to collect yet.", "info");
      break;
    }
    case "train": {
      const result = store.act((s, ctx) => {
        const r = spendCash(s, action.cost, "training", `${action.label ?? "Training"}`, ctx.now);
        if (!r.ok) return r;
        const gain = addSkillXp(s, action.skill, action.xp);
        return { ok: true as const, gain };
      });
      if (!result.ok) ui.toast(result.reason, "bad");
      else {
        ui.float(`+${result.gain.amount} XP`, "xp");
        ui.toast(`${action.skill} +${result.gain.amount} XP${result.gain.levelsGained ? ` — level ${result.gain.newLevel}!` : ""}`, "good");
      }
      break;
    }
    case "rest": {
      const cost = parseCost(action.label);
      const result = store.act((s, ctx) => {
        if (cost > 0) {
          const r = spendCash(s, cost, "living", action.label ?? "Rest", ctx.now);
          if (!r.ok) return r;
          s.player.energy = maxEnergy(s);
          if (cost >= 5_000) adjustStat(s, "lifestyle", 1);
          return { ok: true as const, text: "Energy fully restored." };
        }
        s.player.energy = Math.min(maxEnergy(s), s.player.energy + 30);
        return { ok: true as const, text: "You rested a little. +30 energy." };
      });
      ui.toast(result.ok ? result.text : result.reason, result.ok ? "good" : "bad");
      break;
    }
    case "custom":
      handleCustom(action.id, target);
      break;
  }
}

function handleCustom(id: string, target: InteractionTarget) {
  const store = useGameStore.getState();
  const ui = useUiStore.getState();
  const game = store.game;
  if (!game) return;
  switch (id) {
    case "exit":
      exitInterior();
      break;
    case "ad_click": {
      if (!game.settings.adsEnabled) {
        ui.toast("Promotional placements are disabled in Settings.", "info");
        return;
      }
      const ad = selectCampaign("billboard", { districtId: game.player.districtId, device: ui.isMobile ? "mobile" : "desktop", now: Date.now() });
      if (!ad) {
        ui.toast("An empty billboard. Advertise here via the ad dashboard.", "info");
        return;
      }
      ui.ask({
        title: "Sponsored billboard",
        message: `${ad.headline} — ${ad.advertiserName}. Open ${new URL(ad.clickUrl).hostname} in a new tab?`,
        confirmLabel: "Open link",
        onConfirm: () => openAdLink(ad),
      });
      break;
    }
    case "pray": {
      const r = store.act((s, ctx) => {
        const res = spendCash(s, 500, "living", "Offering at Grace Chapel", ctx.now);
        if (!res.ok) return res;
        adjustStat(s, "credibility", 0.5);
        adjustStat(s, "heat", -1);
        s.player.energy = Math.min(maxEnergy(s), s.player.energy + 10);
        return { ok: true as const };
      });
      ui.toast(r.ok ? "You gave thanks. Heat −1, a little peace of mind." : r.reason, r.ok ? "good" : "bad");
      break;
    }
    case "eat_home": {
      const r = store.act((s, ctx) => {
        const res = spendCash(s, 300, "living", "Home-cooked meal", ctx.now);
        if (!res.ok) return res;
        s.player.energy = Math.min(maxEnergy(s), s.player.energy + 20);
        return { ok: true as const };
      });
      ui.toast(r.ok ? "Indomie and egg. +20 energy." : r.reason, r.ok ? "good" : "bad");
      break;
    }
    default:
      void target;
  }
}

export function exitInterior() {
  const store = useGameStore.getState();
  const game = store.game;
  if (!game || !game.player.interiorId) return;
  const pos = returnPosition;
  store.act((s) => {
    s.player.interiorId = null;
    if (pos) s.player.position = pos;
  }, { silent: true });
  gameEvents.emit("world:setLocation", { districtId: game.player.districtId, interiorId: null, x: pos?.x, y: pos?.y });
}

/** Starts an activity from anywhere in the UI with consistent feedback. */
export function tryStartActivity(activityId: string): boolean {
  const store = useGameStore.getState();
  const ui = useUiStore.getState();
  const result = store.act((s, ctx) => startActivity(s, activityId, ctx.now, ctx.rng));
  if (!result.ok) {
    ui.toast(result.reason, "bad");
    return false;
  }
  ui.toast("Activity started.", "info");
  return true;
}
