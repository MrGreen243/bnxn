import { z } from "zod";
import { SKILL_IDS, EQUIP_SLOTS } from "@/types/game";
import type { GameState } from "@/types/game";

const num = z.number().finite();
const nonNeg = z.number().finite().min(0);
const ts = z.number().finite().min(0);
const DISTRICT = z.enum(["mainland", "computerVillage", "yaba", "surulere", "ikeja", "lekki", "vi", "island"]);
const skillState = z.object({ xp: nonNeg, level: z.number().int().min(1).max(50) });

const contract = z.object({ sharePct: z.number().min(0).max(100), signedAt: ts, version: z.number().int().min(1) });
const crewSkills = z.object({ computing: num, creative: num, business: num, communication: num, management: num });
const assignment = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("idle") }),
  z.object({ kind: z.literal("work"), workId: z.string(), startedAt: ts, cycleStartedAt: ts, cycles: nonNeg }),
  z.object({ kind: z.literal("training"), programId: z.string(), startedAt: ts, endsAt: ts }),
]);

export const gameStateSchema = z.object({
  version: z.number().int().min(1),
  contentVersion: z.number().int().min(1),
  meta: z.object({
    slotId: z.string().min(1),
    createdAt: ts,
    lastSavedAt: ts,
    lastSimulatedAt: ts,
    lastActiveAt: ts,
    seed: num,
    rngState: num,
    gameDay: z.number().int().min(1),
    dayProgressMs: nonNeg,
  }),
  player: z.object({
    name: z.string().min(1).max(24),
    avatar: z.object({ skin: z.number().int().min(0), hair: z.number().int().min(0), outfit: z.number().int().min(0) }),
    background: z.enum(["street", "apprentice", "creative", "graduate"]),
    cash: nonNeg,
    bank: nonNeg,
    energy: nonNeg,
    districtId: DISTRICT,
    position: z.object({ x: num, y: num }),
    interiorId: z.string().nullable(),
    unlockedDistricts: z.array(DISTRICT).min(1),
    discoveredLocations: z.array(z.string()),
    stats: z.object({ streetRep: num, fame: num, credibility: num, heat: num, lifestyle: num }),
  }),
  skills: z.object({
    levels: z.object(Object.fromEntries(SKILL_IDS.map((id) => [id, skillState])) as Record<(typeof SKILL_IDS)[number], typeof skillState>),
    perks: z.array(z.string()),
  }),
  inventory: z.object({
    items: z.record(z.string(), z.number().int().min(0)),
    equipped: z.object(Object.fromEntries(EQUIP_SLOTS.map((s) => [s, z.string().nullable()])) as Record<(typeof EQUIP_SLOTS)[number], z.ZodNullable<z.ZodString>>),
    capacity: z.number().int().min(1),
  }),
  activities: z.object({
    running: z.array(z.object({ instanceId: z.string(), activityId: z.string(), startedAt: ts, endsAt: ts, cashReward: nonNeg, xpMultiplier: nonNeg, riskChance: z.number().min(0).max(1) })),
    queue: z.array(z.string()),
    completedCounts: z.record(z.string(), z.number().int().min(0)),
    restrictions: z.record(z.string(), ts),
    results: z.array(z.object({ id: z.string(), activityId: z.string(), completedAt: ts, cash: nonNeg, xp: z.record(z.string(), num), outcome: z.enum(["success", "complication", "bust"]), message: z.string(), items: z.array(z.string()).optional() })),
  }),
  quests: z.object({
    active: z.record(z.string(), z.object({ stage: z.number().int().min(0), progress: z.record(z.string(), num), startedAt: ts })),
    completed: z.array(z.string()),
    flags: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])),
    choices: z.record(z.string(), z.string()),
  }),
  npcs: z.object({ relationships: z.record(z.string(), num), talkedTo: z.record(z.string(), nonNeg) }),
  businesses: z.object({
    owned: z.array(z.object({ id: z.string(), typeId: z.string(), level: z.number().int().min(1), purchasedAt: ts, uncollected: nonNeg, totalRevenue: nonNeg, totalCosts: nonNeg, staff: nonNeg, lastEventAt: nonNeg })),
  }),
  properties: z.object({ owned: z.array(z.string()).min(1), current: z.string() }),
  vehicles: z.object({ owned: z.array(z.string()), current: z.string().nullable(), condition: z.record(z.string(), num) }),
  hk: z.object({
    unlocked: z.boolean(),
    tier: z.number().int().min(0).max(6),
    hqLevel: z.number().int().min(0).max(5),
    facilities: z.record(z.string(), z.number().int().min(0)),
    members: z.array(z.object({
      id: z.string(), defId: z.string(), hiredAt: ts, level: z.number().int().min(1), xp: nonNeg, skills: crewSkills, loyalty: num, morale: num,
      contract, contractHistory: z.array(contract), assignment, totalGross: nonNeg, totalEarned: nonNeg, unpaid: nonNeg, trainingsCompleted: nonNeg, cyclesCompleted: nonNeg, complaints: nonNeg,
    })),
    recruitPool: z.array(z.string()),
    poolRefreshedAt: nonNeg,
    payouts: z.array(z.object({ id: z.string(), at: ts, memberId: z.string(), workId: z.string(), gross: nonNeg, operatingCost: nonNeg, memberShare: nonNeg, hkRevenue: nonNeg, net: nonNeg, outcome: z.enum(["success", "complication", "bust"]) })),
    totalRevenue: nonNeg,
    totalPaidToCrew: nonNeg,
    departed: z.array(z.string()),
  }),
  investments: z.object({
    prices: z.record(z.string(), nonNeg),
    history: z.record(z.string(), z.array(nonNeg)),
    holdings: z.record(z.string(), z.object({ units: nonNeg, invested: nonNeg })),
    lastTickAt: ts,
  }),
  risk: z.object({
    investigation: z.object({ id: z.string(), startedAt: ts, stage: z.number().int() }).nullable(),
    confinedUntil: nonNeg,
    setbacks: nonNeg,
    bustCount: nonNeg,
    lastConsequence: z.string().nullable(),
  }),
  events: z.object({
    pending: z.array(z.object({ id: z.string(), defId: z.string(), createdAt: ts, context: z.record(z.string(), z.union([z.string(), z.number()])) })),
    log: z.array(z.object({ at: ts, text: z.string(), kind: z.enum(["info", "good", "bad", "money"]) })),
    nextEventAt: nonNeg,
    seenCounts: z.record(z.string(), nonNeg),
  }),
  achievements: z.object({ unlocked: z.record(z.string(), ts) }),
  prestige: z.object({ legacyPoints: nonNeg, runs: nonNeg, lifetimeNetWorth: nonNeg, cosmetics: z.array(z.string()) }),
  stats: z.object({
    totalEarned: nonNeg, totalSpent: nonNeg, activitiesCompleted: nonNeg, riskyCompleted: nonNeg, legitCompleted: nonNeg, questsCompleted: nonNeg, itemsBought: nonNeg,
    businessIncome: nonNeg, crewIncome: nonNeg, investmentProfit: num, distanceWalked: nonNeg, playtimeMs: nonNeg, busts: nonNeg, recruitsHired: nonNeg, trainingsCompleted: nonNeg, daysSurvived: nonNeg,
  }),
  transactions: z.array(z.object({ id: z.string(), at: ts, amount: num, balanceAfter: num, account: z.enum(["cash", "bank"]), category: z.string(), note: z.string() })),
  settings: z.object({ reducedMotion: z.boolean(), sound: z.boolean(), adsEnabled: z.boolean(), joystickSide: z.enum(["left", "right"]), pixelScale: z.number().min(1).max(6), showTooltips: z.boolean(), autoCollect: z.boolean() }),
  tutorial: z.object({ step: z.number().int().min(0), completed: z.boolean(), shownTips: z.array(z.string()) }),
  offline: z.object({
    lastSummary: z.object({ from: ts, to: ts, elapsedMs: nonNeg, cappedMs: nonNeg, cashEarned: nonNeg, expenses: nonNeg, activitiesCompleted: nonNeg, businessIncome: nonNeg, crewIncome: nonNeg, crewPaid: nonNeg, trainingsCompleted: nonNeg, events: z.array(z.string()), clockWarning: z.boolean() }).nullable(),
  }),
  social: z.object({
    posts: z.array(z.object({ id: z.string(), at: ts, author: z.string(), text: z.string(), likes: nonNeg, kind: z.enum(["player", "npc", "news"]) })),
    followers: nonNeg,
    lastPostAt: nonNeg,
  }),
  daily: z.object({
    dayKey: z.string(),
    objectives: z.array(z.object({ id: z.string(), kind: z.enum(["activities", "earn", "train", "talk", "collect"]), target: nonNeg, progress: nonNeg, reward: nonNeg, claimed: z.boolean() })),
  }),
});

export type ValidatedGameState = z.infer<typeof gameStateSchema>;

export function validateGameState(input: unknown): { ok: true; state: GameState } | { ok: false; error: string } {
  const r = gameStateSchema.safeParse(input);
  if (r.success) return { ok: true, state: r.data as unknown as GameState };
  const issue = r.error.issues[0];
  return { ok: false, error: issue ? `${issue.path.join(".") || "save"}: ${issue.message}` : "Invalid save" };
}

export const exportedSaveSchema = z.object({
  app: z.literal("street-tycoon"),
  exportedAt: z.string(),
  appVersion: z.string(),
  state: z.unknown(),
});
