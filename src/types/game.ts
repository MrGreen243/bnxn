/**
 * Core game domain types. Everything here is plain data so that the whole
 * game state can be serialised to IndexedDB / JSON and validated with Zod.
 */

export type SkillId =
  | "computing"
  | "business"
  | "charisma"
  | "negotiation"
  | "streetSmarts"
  | "management"
  | "creativity"
  | "fitness"
  | "driving";

export const SKILL_IDS: SkillId[] = [
  "computing",
  "business",
  "charisma",
  "negotiation",
  "streetSmarts",
  "management",
  "creativity",
  "fitness",
  "driving",
];

export type BackgroundId = "street" | "apprentice" | "creative" | "graduate";

export type EquipSlot =
  | "phone"
  | "computer"
  | "internet"
  | "furniture"
  | "clothing"
  | "accessory"
  | "businessEquipment";

export const EQUIP_SLOTS: EquipSlot[] = [
  "phone",
  "computer",
  "internet",
  "furniture",
  "clothing",
  "accessory",
  "businessEquipment",
];

export type ItemCategory = EquipSlot | "consumable" | "collectible";

export type DistrictId =
  | "mainland"
  | "computerVillage"
  | "yaba"
  | "surulere"
  | "ikeja"
  | "lekki"
  | "vi"
  | "island";

export type ReputationKey = "streetRep" | "fame" | "credibility" | "heat" | "lifestyle";

/** A modifier is the single mechanism used for every bonus in the game. */
export type ModifierKey =
  | "activityReward"        // multiplier on all activity cash rewards
  | "activityRewardLegit"   // multiplier on legit activity rewards
  | "activityRewardRisky"   // multiplier on risky activity rewards
  | "activitySpeed"         // multiplier on activity duration (1.2 = 20% faster)
  | "activitySlots"         // additive concurrent activity slots
  | "skillXp"               // multiplier on all skill xp
  | "businessRevenue"       // multiplier on business revenue
  | "businessCosts"         // multiplier on business operating costs (0.9 = 10% cheaper)
  | "crewEfficiency"        // multiplier on crew work income
  | "crewTrainingSpeed"     // multiplier on crew training speed
  | "crewMorale"            // additive morale per day
  | "recruitCost"           // multiplier on recruitment costs
  | "shopDiscount"          // multiplier on shop prices
  | "offlineCapHours"       // additive hours of offline progress
  | "energyRegen"           // multiplier on energy regen
  | "maxEnergy"             // additive max energy
  | "riskReduction"         // additive reduction of risk probability (0.1 = -10 pct points)
  | "heatDecay"             // multiplier on heat decay
  | "fameGain"              // multiplier on fame gains
  | "investmentReturn"      // additive to investment drift
  | "rentDiscount"          // multiplier on daily living costs
  | "travelDiscount"        // multiplier on travel costs
  | "inventoryCapacity"     // additive inventory capacity
  | "hkCapacity";           // additive crew capacity

export interface Modifier {
  key: ModifierKey;
  /** For multiplicative keys this is a multiplier (1.1); for additive keys a flat amount. */
  value: number;
  label?: string;
}

export interface PlayerStats {
  streetRep: number;
  fame: number;
  credibility: number;
  heat: number;
  lifestyle: number;
}

export interface Avatar {
  skin: number;
  hair: number;
  outfit: number;
}

export interface PlayerState {
  name: string;
  avatar: Avatar;
  background: BackgroundId;
  cash: number;
  bank: number;
  energy: number;
  districtId: DistrictId;
  position: { x: number; y: number };
  interiorId: string | null;
  unlockedDistricts: DistrictId[];
  discoveredLocations: string[];
  stats: PlayerStats;
}

export interface SkillState {
  xp: number;
  level: number;
}

export interface SkillsState {
  levels: Record<SkillId, SkillState>;
  perks: string[];
}

export interface InventoryState {
  items: Record<string, number>;
  equipped: Record<EquipSlot, string | null>;
  capacity: number;
}

export interface ActivityRun {
  instanceId: string;
  activityId: string;
  startedAt: number;
  endsAt: number;
  /** reward snapshot locked in at start so the result cannot be re-rolled. */
  cashReward: number;
  xpMultiplier: number;
  riskChance: number;
}

export interface ActivitiesState {
  running: ActivityRun[];
  queue: string[];
  completedCounts: Record<string, number>;
  /** category -> timestamp until which the category is restricted */
  restrictions: Record<string, number>;
  /** pending results waiting to be acknowledged by the player */
  results: ActivityResult[];
}

export interface ActivityResult {
  id: string;
  activityId: string;
  completedAt: number;
  cash: number;
  xp: Partial<Record<SkillId, number>>;
  outcome: "success" | "complication" | "bust";
  message: string;
  items?: string[];
}

export interface QuestProgress {
  stage: number;
  progress: Record<string, number>;
  startedAt: number;
}

export interface QuestsState {
  active: Record<string, QuestProgress>;
  completed: string[];
  flags: Record<string, number | boolean | string>;
  choices: Record<string, string>;
}

export interface NpcState {
  relationships: Record<string, number>;
  talkedTo: Record<string, number>;
}

export interface OwnedBusiness {
  id: string;
  typeId: string;
  level: number;
  purchasedAt: number;
  uncollected: number;
  totalRevenue: number;
  totalCosts: number;
  staff: number;
  lastEventAt: number;
}

export interface BusinessesState {
  owned: OwnedBusiness[];
}

export interface PropertiesState {
  owned: string[];
  current: string;
}

export interface VehiclesState {
  owned: string[];
  current: string | null;
  condition: Record<string, number>;
}

export interface CrewContract {
  sharePct: number;
  signedAt: number;
  version: number;
}

export type CrewAssignment =
  | { kind: "idle" }
  | { kind: "work"; workId: string; startedAt: number; cycleStartedAt: number; cycles: number }
  | { kind: "training"; programId: string; startedAt: number; endsAt: number };

export interface CrewSkillSet {
  computing: number;
  creative: number;
  business: number;
  communication: number;
  management: number;
}

export interface CrewMemberState {
  id: string;
  defId: string;
  hiredAt: number;
  level: number;
  xp: number;
  skills: CrewSkillSet;
  loyalty: number;
  morale: number;
  contract: CrewContract;
  contractHistory: CrewContract[];
  assignment: CrewAssignment;
  totalGross: number;
  totalEarned: number;
  unpaid: number;
  trainingsCompleted: number;
  cyclesCompleted: number;
  complaints: number;
}

export interface PayoutRecord {
  id: string;
  at: number;
  memberId: string;
  workId: string;
  gross: number;
  operatingCost: number;
  net: number;
  memberShare: number;
  hkRevenue: number;
  outcome: "success" | "complication" | "bust";
}

export interface HkState {
  unlocked: boolean;
  tier: number;
  hqLevel: number;
  facilities: Record<string, number>;
  members: CrewMemberState[];
  recruitPool: string[];
  poolRefreshedAt: number;
  payouts: PayoutRecord[];
  totalRevenue: number;
  totalPaidToCrew: number;
  departed: string[];
}

export interface InvestmentHolding {
  units: number;
  invested: number;
}

export interface InvestmentsState {
  prices: Record<string, number>;
  history: Record<string, number[]>;
  holdings: Record<string, InvestmentHolding>;
  lastTickAt: number;
}

export interface Investigation {
  id: string;
  startedAt: number;
  stage: number;
}

export interface RiskState {
  investigation: Investigation | null;
  confinedUntil: number;
  setbacks: number;
  bustCount: number;
  lastConsequence: string | null;
}

export interface PendingEvent {
  id: string;
  defId: string;
  createdAt: number;
  context: Record<string, string | number>;
}

export interface EventLogEntry {
  at: number;
  text: string;
  kind: "info" | "good" | "bad" | "money";
}

export interface EventsState {
  pending: PendingEvent[];
  log: EventLogEntry[];
  nextEventAt: number;
  seenCounts: Record<string, number>;
}

export interface AchievementsState {
  unlocked: Record<string, number>;
}

export interface PrestigeState {
  legacyPoints: number;
  runs: number;
  lifetimeNetWorth: number;
  cosmetics: string[];
}

export interface GameStats {
  totalEarned: number;
  totalSpent: number;
  activitiesCompleted: number;
  riskyCompleted: number;
  legitCompleted: number;
  questsCompleted: number;
  itemsBought: number;
  businessIncome: number;
  crewIncome: number;
  investmentProfit: number;
  distanceWalked: number;
  playtimeMs: number;
  busts: number;
  recruitsHired: number;
  trainingsCompleted: number;
  daysSurvived: number;
}

export interface Transaction {
  id: string;
  at: number;
  amount: number;
  balanceAfter: number;
  account: "cash" | "bank";
  category: string;
  note: string;
}

export interface SettingsState {
  reducedMotion: boolean;
  sound: boolean;
  adsEnabled: boolean;
  joystickSide: "left" | "right";
  pixelScale: number;
  showTooltips: boolean;
  autoCollect: boolean;
}

export interface TutorialState {
  step: number;
  completed: boolean;
  shownTips: string[];
}

export interface OfflineSummary {
  from: number;
  to: number;
  elapsedMs: number;
  cappedMs: number;
  cashEarned: number;
  expenses: number;
  activitiesCompleted: number;
  businessIncome: number;
  crewIncome: number;
  crewPaid: number;
  trainingsCompleted: number;
  events: string[];
  clockWarning: boolean;
}

export interface SocialPost {
  id: string;
  at: number;
  author: string;
  text: string;
  likes: number;
  kind: "player" | "npc" | "news";
}

export interface SocialState {
  posts: SocialPost[];
  followers: number;
  lastPostAt: number;
}

export interface DailyObjective {
  id: string;
  kind: "activities" | "earn" | "train" | "talk" | "collect";
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface DailyState {
  dayKey: string;
  objectives: DailyObjective[];
}

export interface GameMeta {
  slotId: string;
  createdAt: number;
  lastSavedAt: number;
  lastSimulatedAt: number;
  lastActiveAt: number;
  seed: number;
  rngState: number;
  gameDay: number;
  dayProgressMs: number;
}

export interface GameState {
  version: number;
  contentVersion: number;
  meta: GameMeta;
  player: PlayerState;
  skills: SkillsState;
  inventory: InventoryState;
  activities: ActivitiesState;
  quests: QuestsState;
  npcs: NpcState;
  businesses: BusinessesState;
  properties: PropertiesState;
  vehicles: VehiclesState;
  hk: HkState;
  investments: InvestmentsState;
  risk: RiskState;
  events: EventsState;
  achievements: AchievementsState;
  prestige: PrestigeState;
  stats: GameStats;
  transactions: Transaction[];
  settings: SettingsState;
  tutorial: TutorialState;
  offline: { lastSummary: OfflineSummary | null };
  social: SocialState;
  daily: DailyState;
}

export type Requirement =
  | { type: "cash"; amount: number }
  | { type: "netWorth"; amount: number }
  | { type: "skill"; skill: SkillId; level: number }
  | { type: "stat"; stat: ReputationKey; min?: number; max?: number }
  | { type: "item"; itemId: string }
  | { type: "equipTier"; slot: EquipSlot; tier: number }
  | { type: "district"; districtId: DistrictId }
  | { type: "quest"; questId: string }
  | { type: "flag"; key: string; value?: number | boolean | string }
  | { type: "business"; typeId?: string; count?: number }
  | { type: "property"; propertyId: string }
  | { type: "vehicle"; vehicleId?: string }
  | { type: "hk"; tier?: number; members?: number; hqLevel?: number }
  | { type: "activityCount"; activityId?: string; count: number }
  | { type: "perk"; perkId: string }
  | { type: "legacy"; points: number };

export type Effect =
  | { type: "cash"; amount: number; note?: string }
  | { type: "stat"; stat: ReputationKey; amount: number }
  | { type: "xp"; skill: SkillId; amount: number }
  | { type: "item"; itemId: string; qty?: number }
  | { type: "flag"; key: string; value: number | boolean | string }
  | { type: "startQuest"; questId: string }
  | { type: "relationship"; npcId: string; amount: number }
  | { type: "unlockDistrict"; districtId: DistrictId }
  | { type: "log"; text: string; kind?: EventLogEntry["kind"] }
  | { type: "energy"; amount: number }
  | { type: "hkUnlock" }
  | { type: "crewLoyalty"; amount: number; memberId?: string }
  | { type: "crewMorale"; amount: number }
  | { type: "restrict"; category: string; ms: number }
  | { type: "loseItem"; slot: EquipSlot }
  | { type: "post"; text: string; author?: string }
  | { type: "followers"; amount: number }
  | { type: "businessDisruption"; hours: number }
  | { type: "openScreen"; screen: string }
  | { type: "startActivity"; activityId: string };
