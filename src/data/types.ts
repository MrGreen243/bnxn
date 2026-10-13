import type {
  BackgroundId,
  DistrictId,
  Effect,
  EquipSlot,
  ItemCategory,
  Modifier,
  ReputationKey,
  Requirement,
  SkillId,
} from "@/types/game";

export interface SkillDef {
  id: SkillId;
  name: string;
  description: string;
  icon: string;
  perks: PerkDef[];
}

export interface PerkDef {
  id: string;
  skill: SkillId;
  level: number;
  name: string;
  description: string;
  modifiers: Modifier[];
  requires?: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  tier: number;
  price: number;
  sellPrice: number;
  description: string;
  flavor?: string;
  modifiers: Modifier[];
  requirements?: Requirement[];
  districts: DistrictId[];
  /** Consumable effects applied when used. */
  effects?: Effect[];
  stackable?: boolean;
  icon: string;
}

export type ActivityCategory = "delivery" | "digital" | "creative" | "trade" | "service" | "risky";

export interface ActivityDef {
  id: string;
  name: string;
  category: ActivityCategory;
  legit: boolean;
  district: DistrictId | "any";
  description: string;
  flavor: string;
  durationMs: number;
  reward: [number, number];
  xp: Partial<Record<SkillId, number>>;
  energyCost: number;
  requirements: Requirement[];
  skillScaling: Partial<Record<SkillId, number>>;
  equipmentScaling: Partial<Record<EquipSlot, number>>;
  risk: number;
  repeatable: boolean;
  idle: boolean;
  offline: boolean;
  outcomes: { success: string[]; complication: string[]; bust?: string[] };
  itemDrops?: { itemId: string; chance: number }[];
  statEffects?: Partial<Record<ReputationKey, number>>;
}

export interface MapBuildingDef {
  id: string;
  kind:
    | "home"
    | "shop"
    | "cafe"
    | "bar"
    | "market"
    | "office"
    | "mechanic"
    | "barber"
    | "church"
    | "bank"
    | "studio"
    | "hq"
    | "gym"
    | "club"
    | "restaurant"
    | "mall"
    | "estate"
    | "venue"
    | "school"
    | "residential";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  palette: number;
  interior?: boolean;
  actions: InteractionActionDef[];
  requirements?: Requirement[];
  npcIds?: string[];
}

export interface MapNpcPlacement {
  npcId: string;
  x: number;
  y: number;
  wander?: boolean;
}

export interface MapPropDef {
  kind: "tree" | "pole" | "danfo" | "car" | "kiosk" | "billboard" | "bench" | "gen" | "bin" | "okada" | "palm" | "fountain" | "sign";
  x: number;
  y: number;
  label?: string;
}

export interface DistrictMapDef {
  width: number;
  height: number;
  groundTile: "asphalt" | "dirt" | "paved" | "premium";
  roadsH: number[];
  roadsV: number[];
  spawn: { x: number; y: number };
  buildings: MapBuildingDef[];
  npcs: MapNpcPlacement[];
  props: MapPropDef[];
  water?: { x: number; y: number; w: number; h: number }[];
  parks?: { x: number; y: number; w: number; h: number }[];
}

export interface DistrictDef {
  id: DistrictId;
  name: string;
  tagline: string;
  description: string;
  order: number;
  requirements: Requirement[];
  travelCost: number;
  priceMultiplier: number;
  palette: { road: string; sidewalk: string; accent: string };
  map: DistrictMapDef;
}

export type InteractionActionDef =
  | { type: "talk"; npcId: string }
  | { type: "shop"; shopId: string; label?: string }
  | { type: "jobs"; category?: ActivityCategory; label?: string }
  | { type: "screen"; screen: string; label: string }
  | { type: "enter"; interiorId: string; label?: string }
  | { type: "collect"; label?: string }
  | { type: "train"; skill: SkillId; label?: string; cost: number; xp: number }
  | { type: "rest"; label?: string }
  | { type: "custom"; id: string; label: string };

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  district: DistrictId;
  palette: { skin: number; hair: number; outfit: number };
  bio: string;
  dialogueId: string;
}

export interface DialogueChoice {
  text: string;
  next?: string;
  effects?: Effect[];
  requirements?: Requirement[];
  end?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  choices?: DialogueChoice[];
  next?: string;
  effects?: Effect[];
}

export interface DialogueDef {
  id: string;
  npcId: string;
  /** Ordered list: first entry whose requirements are satisfied wins. */
  entries: { requirements?: Requirement[]; node: string }[];
  nodes: Record<string, DialogueNode>;
}

export type Condition =
  | { type: "activityCount"; activityId?: string; category?: ActivityCategory; count: number; legit?: boolean }
  | { type: "cash"; amount: number }
  | { type: "netWorth"; amount: number }
  | { type: "item"; itemId: string }
  | { type: "equipTier"; slot: EquipSlot; tier: number }
  | { type: "talk"; npcId: string }
  | { type: "skill"; skill: SkillId; level: number }
  | { type: "district"; districtId: DistrictId }
  | { type: "flag"; key: string; value?: number | boolean | string }
  | { type: "business"; count: number }
  | { type: "property"; propertyId?: string; tier?: number }
  | { type: "vehicle"; tier?: number }
  | { type: "hkMembers"; count: number }
  | { type: "hkTier"; tier: number }
  | { type: "hqLevel"; level: number }
  | { type: "stat"; stat: ReputationKey; min: number }
  | { type: "trainings"; count: number }
  | { type: "crewPayouts"; count: number }
  | { type: "visit"; locationId: string }
  | { type: "investment"; amount: number }
  | { type: "achievements"; count: number };

export interface QuestStageDef {
  id: string;
  objective: string;
  hint?: string;
  condition: Condition;
  onComplete?: Effect[];
}

export interface QuestDef {
  id: string;
  title: string;
  chapter: number;
  kind: "story" | "side";
  giver: string;
  summary: string;
  requirements: Requirement[];
  autoStart?: boolean;
  stages: QuestStageDef[];
  rewards: Effect[];
  repeatable?: boolean;
}

export interface BusinessDef {
  id: string;
  name: string;
  district: DistrictId;
  description: string;
  price: number;
  revenuePerHour: number;
  expensesPerHour: number;
  staffRequired: number;
  staffWagePerHour: number;
  maxLevel: number;
  requirements: Requirement[];
  icon: string;
  managementSkill: SkillId;
  flavor: string;
}

export interface PropertyDef {
  id: string;
  name: string;
  tier: number;
  district: DistrictId;
  price: number;
  rentPerDay: number;
  upkeepPerDay: number;
  description: string;
  modifiers: Modifier[];
  requirements: Requirement[];
  rental: boolean;
}

export interface VehicleDef {
  id: string;
  name: string;
  tier: number;
  price: number;
  upkeepPerDay: number;
  description: string;
  brand: string;
  modifiers: Modifier[];
  requirements: Requirement[];
}

export interface CrewMemberDef {
  id: string;
  name: string;
  nickname: string;
  background: string;
  personality: string;
  traits: string[];
  skills: { computing: number; creative: number; business: number; communication: number; management: number };
  startLevel: number;
  potential: number;
  motivation: string;
  baseLoyalty: number;
  minSharePct: number;
  preferredSharePct: number;
  recruitCost: number;
  trainingPreference: string;
  requirements: Requirement[];
  palette: { skin: number; hair: number; outfit: number };
  quote: string;
}

export interface CrewWorkDef {
  id: string;
  name: string;
  legit: boolean;
  description: string;
  baseIncome: number;
  cycleMs: number;
  requiredSkills: Partial<CrewMemberDef["skills"]>;
  requiredFacility?: { id: string; level: number };
  operatingCost: number;
  successBase: number;
  risk: number;
  xp: number;
  complications: string[];
  minHkTier: number;
}

export interface TrainingProgramDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  cost: number;
  skill: keyof CrewMemberDef["skills"];
  xpGain: number;
  skillGain: number;
  requiredFacility?: { id: string; level: number };
}

export interface FacilityDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];
  minHqLevel: number;
  modifiersPerLevel: Modifier[];
}

export interface EventChoiceDef {
  label: string;
  effects: Effect[];
  requirements?: Requirement[];
  resultText: string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  weight: number;
  requirements: Requirement[];
  choices: EventChoiceDef[];
  /** index of the choice applied automatically when the event happens offline. */
  offlineDefault: number;
  maxOccurrences?: number;
  category: "landlord" | "business" | "crew" | "social" | "risk" | "opportunity" | "vehicle" | "friend";
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: Condition;
  reward?: Effect[];
  hidden?: boolean;
}

export interface BackgroundDef {
  id: BackgroundId;
  name: string;
  description: string;
  bonusSkill: SkillId;
  bonusXp: number;
  startingItem?: string;
  introQuest: string;
  intro: string;
}

export interface InvestmentAssetDef {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  volatility: number;
  drift: number;
  minUnits: number;
}

export interface ShopDef {
  id: string;
  name: string;
  items: string[];
  sells?: boolean;
}

export interface InteriorDef {
  id: string;
  name: string;
  width: number;
  height: number;
  floor: "wood" | "tile" | "concrete" | "carpet";
  props: { kind: "desk" | "bed" | "pc" | "shelf" | "plant" | "sofa" | "counter" | "server" | "tv" | "fridge" | "board"; x: number; y: number; label?: string; actions?: InteractionActionDef[]; requirements?: Requirement[] }[];
  npcs?: MapNpcPlacement[];
  exit: { x: number; y: number };
  spawn: { x: number; y: number };
}
