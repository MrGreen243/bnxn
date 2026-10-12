/**
 * Central balancing configuration. Every tunable number in the game lives
 * here (or in the content definition files) — never inside UI components.
 */
export const BALANCE = {
  /** One in-game day lasts this many real milliseconds (idle time included). */
  dayLengthMs: 20 * 60 * 1000,
  startingCash: 8_000,
  backgroundBonusCash: {
    street: 2_000,
    apprentice: 0,
    creative: 1_000,
    graduate: 5_000,
  },
  energy: {
    max: 100,
    regenPerHour: 40,
    /** Energy cost of walking is zero; activities declare their own cost. */
    minToStart: 5,
  },
  offline: {
    /** Base number of hours of offline progression that will be simulated. */
    baseCapHours: 8,
    /** Absolute maximum, whatever bonuses the player has. */
    hardCapHours: 48,
    /** Time jumps beyond this are treated as clock tampering/misconfiguration. */
    suspiciousJumpHours: 24 * 30,
    /** Progress is simulated in fixed steps so results are deterministic. */
    stepMs: 60 * 1000,
    /** Elapsed time below this is ignored for the "welcome back" summary. */
    summaryMinMs: 2 * 60 * 1000,
  },
  skills: {
    /** XP needed to go from level L to L+1. */
    xpForLevel: (level: number) => Math.round(120 * Math.pow(level, 1.55)),
    maxLevel: 50,
  },
  activities: {
    baseSlots: 1,
    maxSlots: 6,
    queueLimit: 8,
    /** Risky activities add this much heat per completion (scaled by risk). */
    heatPerRisk: 18,
    heatDecayPerDay: 6,
    bustCashLossPct: 0.35,
    bustFineBase: 15_000,
    bustRestrictionMs: 30 * 60 * 1000,
  },
  reputation: {
    min: 0,
    max: 100,
  },
  living: {
    foodPerDay: 600,
    transportPerDayNoVehicle: 400,
  },
  businesses: {
    /** uncollected revenue is capped at this many hours of production. */
    uncollectedCapHours: 12,
    upgradeCostGrowth: 1.65,
    revenueGrowthPerLevel: 0.45,
    demandFameFactor: 0.004,
    maxLevel: 5,
  },
  hk: {
    unlock: {
      managementLevel: 4,
      cash: 150_000,
      credibility: 15,
      streetRep: 15,
      questId: "q_hk_foundation",
    },
    /** Capacity per headquarters level. */
    hqCapacity: [0, 2, 4, 7, 10, 14],
    hqUpgradeCosts: [0, 60_000, 350_000, 1_800_000, 8_000_000, 35_000_000],
    hqNames: ["None", "Rented Room", "Shared Office", "Dedicated HQ", "Two-Floor HQ", "The Compound"],
    tierThresholds: [
      { tier: 1, name: "Street Circle", members: 0, revenue: 0 },
      { tier: 2, name: "Small Crew", members: 2, revenue: 250_000 },
      { tier: 3, name: "Local Hustler Kingdom", members: 4, revenue: 2_000_000 },
      { tier: 4, name: "Established Organization", members: 7, revenue: 12_000_000 },
      { tier: 5, name: "Citywide Empire", members: 10, revenue: 60_000_000 },
      { tier: 6, name: "International Business Network", members: 13, revenue: 300_000_000 },
    ],
    moraleDecayPerDay: 4,
    moraleBaseline: 60,
    loyaltyDecayUnpaidPerDay: 8,
    loyaltyLeaveThreshold: 12,
    overcrowdMoralePenalty: 10,
    poolSize: 4,
    poolRefreshMs: 45 * 60 * 1000,
    recruitPoolBonusPerTier: 1,
    payoutHistoryLimit: 120,
    minSharePct: 10,
    maxSharePct: 70,
    levelXp: (level: number) => Math.round(250 * Math.pow(level, 1.4)),
  },
  investments: {
    tickMs: 5 * 60 * 1000,
    historyLength: 48,
  },
  events: {
    minIntervalMs: 6 * 60 * 1000,
    maxIntervalMs: 14 * 60 * 1000,
    offlineMaxEvents: 3,
    logLimit: 80,
  },
  transactionsLimit: 150,
  prestige: {
    netWorthRequired: 500_000_000,
    pointsPerBillion: 100,
    incomeBonusPerPoint: 0.01,
    maxIncomeBonus: 2.0,
    startingCashPerPoint: 2_000,
  },
  social: {
    postLimit: 40,
    followersPerFame: 1_250,
  },
  numeric: {
    /** Hard ceiling on any currency balance to keep arithmetic exact. */
    maxMoney: 9_000_000_000_000,
  },
  travel: {
    baseCost: 300,
    costPerDistrictStep: 450,
  },
} as const;

export type Balance = typeof BALANCE;
