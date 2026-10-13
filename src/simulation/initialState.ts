import { BALANCE } from "@/data/balance";
import { BACKGROUND_MAP } from "@/data/backgrounds";
import { INVESTMENT_ASSETS } from "@/data/businesses";
import { STARTING_EQUIPMENT } from "@/data/items";
import { CONTENT_VERSION, SAVE_VERSION } from "@/data/version";
import type { Avatar, BackgroundId, GameState, SkillId, SkillState } from "@/types/game";
import { SKILL_IDS } from "@/types/game";
import { seedFromString } from "@/utils/rng";

export interface NewGameOptions {
  slotId: string;
  name: string;
  avatar: Avatar;
  background: BackgroundId;
  now: number;
  seed?: number;
  legacyPoints?: number;
  cosmetics?: string[];
  prestigeRuns?: number;
  lifetimeNetWorth?: number;
}

export function createNewGame(opts: NewGameOptions): GameState {
  const bg = BACKGROUND_MAP[opts.background];
  const seed = opts.seed ?? seedFromString(`${opts.name}:${opts.now}`);
  const legacy = opts.legacyPoints ?? 0;
  const levels = Object.fromEntries(SKILL_IDS.map((id) => [id, { xp: 0, level: 1 } satisfies SkillState])) as Record<SkillId, SkillState>;
  const items: Record<string, number> = {};
  const equipped = {
    phone: STARTING_EQUIPMENT.phone ?? null,
    computer: STARTING_EQUIPMENT.computer ?? null,
    internet: STARTING_EQUIPMENT.internet ?? null,
    furniture: STARTING_EQUIPMENT.furniture ?? null,
    clothing: STARTING_EQUIPMENT.clothing ?? null,
    accessory: null,
    businessEquipment: null,
  };
  for (const id of Object.values(STARTING_EQUIPMENT)) items[id] = 1;
  if (bg.startingItem) {
    items[bg.startingItem] = 1;
    if (bg.startingItem.startsWith("pc_")) equipped.computer = bg.startingItem;
  }
  const state: GameState = {
    version: SAVE_VERSION,
    contentVersion: CONTENT_VERSION,
    meta: {
      slotId: opts.slotId,
      createdAt: opts.now,
      lastSavedAt: 0,
      lastSimulatedAt: opts.now,
      lastActiveAt: opts.now,
      seed,
      rngState: seed,
      gameDay: 1,
      dayProgressMs: 0,
    },
    player: {
      name: opts.name,
      avatar: opts.avatar,
      background: opts.background,
      cash: BALANCE.startingCash + BALANCE.backgroundBonusCash[opts.background] + legacy * BALANCE.prestige.startingCashPerPoint,
      bank: 0,
      energy: BALANCE.energy.max,
      districtId: "mainland",
      position: { x: 0, y: 0 },
      interiorId: null,
      unlockedDistricts: ["mainland"],
      discoveredLocations: [],
      stats: { streetRep: 0, fame: 0, credibility: 0, heat: 0, lifestyle: 0 },
    },
    skills: { levels, perks: [] },
    inventory: { items, equipped, capacity: 20 },
    activities: { running: [], queue: [], completedCounts: {}, restrictions: {}, results: [] },
    quests: { active: {}, completed: [], flags: {}, choices: {} },
    npcs: { relationships: {}, talkedTo: {} },
    businesses: { owned: [] },
    properties: { owned: ["prop_shared"], current: "prop_shared" },
    vehicles: { owned: [], current: null, condition: {} },
    hk: { unlocked: false, tier: 0, hqLevel: 0, facilities: {}, members: [], recruitPool: [], poolRefreshedAt: 0, payouts: [], totalRevenue: 0, totalPaidToCrew: 0, departed: [] },
    investments: {
      prices: Object.fromEntries(INVESTMENT_ASSETS.map((a) => [a.id, a.basePrice])),
      history: Object.fromEntries(INVESTMENT_ASSETS.map((a) => [a.id, [a.basePrice]])),
      holdings: {},
      lastTickAt: opts.now,
    },
    risk: { investigation: null, confinedUntil: 0, setbacks: 0, bustCount: 0, lastConsequence: null },
    events: { pending: [], log: [], nextEventAt: opts.now + BALANCE.events.minIntervalMs, seenCounts: {} },
    achievements: { unlocked: {} },
    prestige: { legacyPoints: legacy, runs: opts.prestigeRuns ?? 0, lifetimeNetWorth: opts.lifetimeNetWorth ?? 0, cosmetics: opts.cosmetics ?? [] },
    stats: {
      totalEarned: 0, totalSpent: 0, activitiesCompleted: 0, riskyCompleted: 0, legitCompleted: 0, questsCompleted: 0, itemsBought: 0,
      businessIncome: 0, crewIncome: 0, investmentProfit: 0, distanceWalked: 0, playtimeMs: 0, busts: 0, recruitsHired: 0, trainingsCompleted: 0, daysSurvived: 0,
    },
    transactions: [],
    settings: { reducedMotion: false, sound: true, adsEnabled: true, joystickSide: "right", pixelScale: 3, showTooltips: true, autoCollect: false },
    tutorial: { step: 0, completed: false, shownTips: [] },
    offline: { lastSummary: null },
    social: { posts: [{ id: "p0", at: opts.now, author: "Lagos Daily", text: "Fuel price 'stable' for third consecutive day. Residents suspicious.", likes: 420, kind: "news" }], followers: 120, lastPostAt: opts.now },
    daily: { dayKey: "", objectives: [] },
  };
  // background bonus xp
  state.skills.levels[bg.bonusSkill] = { xp: bg.bonusXp, level: 1 };
  return state;
}
