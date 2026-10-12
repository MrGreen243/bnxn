import type { PerkDef, SkillDef } from "@/data/types";

const perk = (p: PerkDef): PerkDef => p;

export const SKILLS: SkillDef[] = [
  {
    id: "computing",
    name: "Computing",
    description: "Hardware, software and the patience to fix a frozen laptop in a hot café.",
    icon: "Cpu",
    perks: [
      perk({ id: "computing_5", skill: "computing", level: 5, name: "Fast Fingers", description: "+15% reward on digital jobs.", modifiers: [{ key: "activityReward", value: 1.15, label: "Digital work" }] }),
      perk({ id: "computing_10", skill: "computing", level: 10, name: "Script Kiddie (Legit)", description: "Digital jobs finish 15% faster.", modifiers: [{ key: "activitySpeed", value: 1.15 }], requires: ["computing_5"] }),
      perk({ id: "computing_18", skill: "computing", level: 18, name: "Full-Stack Hustler", description: "+1 concurrent activity slot.", modifiers: [{ key: "activitySlots", value: 1 }], requires: ["computing_10"] }),
      perk({ id: "computing_30", skill: "computing", level: 30, name: "Systems Architect", description: "+25% crew efficiency on technical work.", modifiers: [{ key: "crewEfficiency", value: 1.25 }], requires: ["computing_18"] }),
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "Margins, cashflow and knowing when a deal is actually a deal.",
    icon: "Briefcase",
    perks: [
      perk({ id: "business_5", skill: "business", level: 5, name: "Sharp Margins", description: "+10% business revenue.", modifiers: [{ key: "businessRevenue", value: 1.1 }] }),
      perk({ id: "business_10", skill: "business", level: 10, name: "Lean Operator", description: "-15% business operating costs.", modifiers: [{ key: "businessCosts", value: 0.85 }], requires: ["business_5"] }),
      perk({ id: "business_18", skill: "business", level: 18, name: "Portfolio Thinking", description: "+20% business revenue and +2% investment drift.", modifiers: [{ key: "businessRevenue", value: 1.2 }, { key: "investmentReturn", value: 0.02 }], requires: ["business_10"] }),
      perk({ id: "business_30", skill: "business", level: 30, name: "Boardroom Shark", description: "+35% business revenue.", modifiers: [{ key: "businessRevenue", value: 1.35 }], requires: ["business_18"] }),
    ],
  },
  {
    id: "charisma",
    name: "Charisma",
    description: "The gift of making people like you before they know why.",
    icon: "Sparkles",
    perks: [
      perk({ id: "charisma_5", skill: "charisma", level: 5, name: "Sweet Mouth", description: "-10% recruitment costs.", modifiers: [{ key: "recruitCost", value: 0.9 }] }),
      perk({ id: "charisma_10", skill: "charisma", level: 10, name: "Crowd Favourite", description: "+25% fame gains.", modifiers: [{ key: "fameGain", value: 1.25 }], requires: ["charisma_5"] }),
      perk({ id: "charisma_18", skill: "charisma", level: 18, name: "Everybody's Guy", description: "-20% recruitment costs, +2 crew morale per day.", modifiers: [{ key: "recruitCost", value: 0.8 }, { key: "crewMorale", value: 2 }], requires: ["charisma_10"] }),
      perk({ id: "charisma_30", skill: "charisma", level: 30, name: "Celebrity Status", description: "+50% fame gains.", modifiers: [{ key: "fameGain", value: 1.5 }], requires: ["charisma_18"] }),
    ],
  },
  {
    id: "negotiation",
    name: "Negotiation",
    description: "Price is just the opening line of a conversation.",
    icon: "Handshake",
    perks: [
      perk({ id: "negotiation_5", skill: "negotiation", level: 5, name: "Last Price", description: "8% discount in every shop.", modifiers: [{ key: "shopDiscount", value: 0.92 }] }),
      perk({ id: "negotiation_10", skill: "negotiation", level: 10, name: "Bulk Buyer", description: "15% shop discount.", modifiers: [{ key: "shopDiscount", value: 0.85 }], requires: ["negotiation_5"] }),
      perk({ id: "negotiation_18", skill: "negotiation", level: 18, name: "Contract Whisperer", description: "+15% all activity rewards.", modifiers: [{ key: "activityReward", value: 1.15 }], requires: ["negotiation_10"] }),
      perk({ id: "negotiation_30", skill: "negotiation", level: 30, name: "Closer", description: "-25% recruitment cost, 25% shop discount.", modifiers: [{ key: "recruitCost", value: 0.75 }, { key: "shopDiscount", value: 0.75 }], requires: ["negotiation_18"] }),
    ],
  },
  {
    id: "streetSmarts",
    name: "Street Smarts",
    description: "Knowing which corner to avoid and which story not to believe.",
    icon: "Eye",
    perks: [
      perk({ id: "street_5", skill: "streetSmarts", level: 5, name: "Eyes Open", description: "-5 percentage points of risk on risky work.", modifiers: [{ key: "riskReduction", value: 0.05 }] }),
      perk({ id: "street_10", skill: "streetSmarts", level: 10, name: "Low Profile", description: "Heat decays 30% faster.", modifiers: [{ key: "heatDecay", value: 1.3 }], requires: ["street_5"] }),
      perk({ id: "street_18", skill: "streetSmarts", level: 18, name: "Area Father", description: "-10 points of risk, +20% risky rewards.", modifiers: [{ key: "riskReduction", value: 0.1 }, { key: "activityRewardRisky", value: 1.2 }], requires: ["street_10"] }),
      perk({ id: "street_30", skill: "streetSmarts", level: 30, name: "Untouchable (Almost)", description: "Heat decays 60% faster.", modifiers: [{ key: "heatDecay", value: 1.6 }], requires: ["street_18"] }),
    ],
  },
  {
    id: "management",
    name: "Management",
    description: "Turning a group of ambitious people into a team that actually delivers.",
    icon: "Users",
    perks: [
      perk({ id: "management_5", skill: "management", level: 5, name: "Delegator", description: "+10% crew efficiency.", modifiers: [{ key: "crewEfficiency", value: 1.1 }] }),
      perk({ id: "management_10", skill: "management", level: 10, name: "Mentor", description: "+25% crew training speed.", modifiers: [{ key: "crewTrainingSpeed", value: 1.25 }], requires: ["management_5"] }),
      perk({ id: "management_18", skill: "management", level: 18, name: "Operations Lead", description: "+2 HK capacity, +15% crew efficiency.", modifiers: [{ key: "hkCapacity", value: 2 }, { key: "crewEfficiency", value: 1.15 }], requires: ["management_10"] }),
      perk({ id: "management_30", skill: "management", level: 30, name: "Empire Builder", description: "+4 HK capacity, +3 morale per day.", modifiers: [{ key: "hkCapacity", value: 4 }, { key: "crewMorale", value: 3 }], requires: ["management_18"] }),
    ],
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "Content, design, sound and the taste to know what slaps.",
    icon: "Palette",
    perks: [
      perk({ id: "creativity_5", skill: "creativity", level: 5, name: "Eye for Colour", description: "+15% creative job rewards.", modifiers: [{ key: "activityRewardLegit", value: 1.15 }] }),
      perk({ id: "creativity_10", skill: "creativity", level: 10, name: "Viral Instinct", description: "+30% fame gains.", modifiers: [{ key: "fameGain", value: 1.3 }], requires: ["creativity_5"] }),
      perk({ id: "creativity_18", skill: "creativity", level: 18, name: "Studio Head", description: "+1 activity slot.", modifiers: [{ key: "activitySlots", value: 1 }], requires: ["creativity_10"] }),
      perk({ id: "creativity_30", skill: "creativity", level: 30, name: "Cultural Force", description: "+25% all legit rewards.", modifiers: [{ key: "activityRewardLegit", value: 1.25 }], requires: ["creativity_18"] }),
    ],
  },
  {
    id: "fitness",
    name: "Fitness",
    description: "Lagos is a marathon. Stamina pays.",
    icon: "Dumbbell",
    perks: [
      perk({ id: "fitness_5", skill: "fitness", level: 5, name: "Second Wind", description: "+20 max energy.", modifiers: [{ key: "maxEnergy", value: 20 }] }),
      perk({ id: "fitness_10", skill: "fitness", level: 10, name: "Early Riser", description: "+30% energy regen.", modifiers: [{ key: "energyRegen", value: 1.3 }], requires: ["fitness_5"] }),
      perk({ id: "fitness_18", skill: "fitness", level: 18, name: "Iron Body", description: "+40 max energy.", modifiers: [{ key: "maxEnergy", value: 40 }], requires: ["fitness_10"] }),
      perk({ id: "fitness_30", skill: "fitness", level: 30, name: "Marathoner", description: "+60% energy regen and +2 offline hours.", modifiers: [{ key: "energyRegen", value: 1.6 }, { key: "offlineCapHours", value: 2 }], requires: ["fitness_18"] }),
    ],
  },
  {
    id: "driving",
    name: "Driving",
    description: "Third Mainland at rush hour will teach you patience or nothing at all.",
    icon: "Car",
    perks: [
      perk({ id: "driving_5", skill: "driving", level: 5, name: "Shortcut Finder", description: "Deliveries pay 20% more.", modifiers: [{ key: "activityReward", value: 1.08 }, { key: "travelDiscount", value: 0.85 }] }),
      perk({ id: "driving_10", skill: "driving", level: 10, name: "Smooth Operator", description: "-30% travel costs.", modifiers: [{ key: "travelDiscount", value: 0.7 }], requires: ["driving_5"] }),
      perk({ id: "driving_18", skill: "driving", level: 18, name: "Logistics Brain", description: "+15% business revenue.", modifiers: [{ key: "businessRevenue", value: 1.15 }], requires: ["driving_10"] }),
      perk({ id: "driving_30", skill: "driving", level: 30, name: "Fleet Commander", description: "Travel is free.", modifiers: [{ key: "travelDiscount", value: 0 }], requires: ["driving_18"] }),
    ],
  },
];

export const SKILL_MAP: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const ALL_PERKS: PerkDef[] = SKILLS.flatMap((s) => s.perks);
export const PERK_MAP: Record<string, PerkDef> = Object.fromEntries(ALL_PERKS.map((p) => [p.id, p]));
