import type { AchievementDef } from "@/data/types";

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "ach_first_naira", name: "First Naira", description: "Complete your first activity.", icon: "Coins", condition: { type: "activityCount", count: 1 } },
  { id: "ach_hustler", name: "Hustler", description: "Complete 25 activities.", icon: "Flame", condition: { type: "activityCount", count: 25 }, reward: [{ type: "cash", amount: 10_000, note: "Hustler achievement" }] },
  { id: "ach_grinder", name: "Grinder", description: "Complete 150 activities.", icon: "Zap", condition: { type: "activityCount", count: 150 }, reward: [{ type: "cash", amount: 200_000, note: "Grinder achievement" }] },
  { id: "ach_100k", name: "Six Figures", description: "Hold ₦100,000 in cash.", icon: "Banknote", condition: { type: "cash", amount: 100_000 } },
  { id: "ach_millionaire", name: "Millionaire", description: "Reach a net worth of ₦1,000,000.", icon: "Gem", condition: { type: "netWorth", amount: 1_000_000 } },
  { id: "ach_10m", name: "Odogwu", description: "Reach a net worth of ₦10,000,000.", icon: "Crown", condition: { type: "netWorth", amount: 10_000_000 } },
  { id: "ach_100m", name: "Big Fish", description: "Reach a net worth of ₦100,000,000.", icon: "Trophy", condition: { type: "netWorth", amount: 100_000_000 } },
  { id: "ach_billion", name: "Billionaire", description: "Reach a net worth of ₦1,000,000,000.", icon: "Sparkles", condition: { type: "netWorth", amount: 1_000_000_000 } },
  { id: "ach_laptop", name: "Serious Tools", description: "Own an Entry-Level Laptop or better.", icon: "Laptop", condition: { type: "equipTier", slot: "computer", tier: 3 } },
  { id: "ach_village", name: "Village People", description: "Unlock Computer Village.", icon: "MapPin", condition: { type: "district", districtId: "computerVillage" } },
  { id: "ach_island", name: "Island Life", description: "Unlock Lekki Phase One.", icon: "Palmtree", condition: { type: "district", districtId: "lekki" } },
  { id: "ach_top", name: "View From The Top", description: "Unlock Palm Crescent Island.", icon: "Mountain", condition: { type: "district", districtId: "island" } },
  { id: "ach_business", name: "Business Owner", description: "Buy your first business.", icon: "Store", condition: { type: "business", count: 1 } },
  { id: "ach_portfolio", name: "Portfolio", description: "Own 5 businesses.", icon: "Building2", condition: { type: "business", count: 5 } },
  { id: "ach_hk", name: "Kingdom Come", description: "Unlock the Hustler Kingdom.", icon: "Castle", condition: { type: "hkTier", tier: 1 } },
  { id: "ach_crew5", name: "Full House", description: "Have 5 crew members at once.", icon: "Users", condition: { type: "hkMembers", count: 5 } },
  { id: "ach_empire", name: "Citywide Empire", description: "Reach HK tier 5.", icon: "Globe", condition: { type: "hkTier", tier: 5 } },
  { id: "ach_teacher", name: "Teacher", description: "Complete 10 crew training programs.", icon: "GraduationCap", condition: { type: "trainings", count: 10 } },
  { id: "ach_famous", name: "Famous", description: "Reach 50 Fame.", icon: "Star", condition: { type: "stat", stat: "fame", min: 50 } },
  { id: "ach_credible", name: "Credible", description: "Reach 50 Credibility.", icon: "BadgeCheck", condition: { type: "stat", stat: "credibility", min: 50 } },
  { id: "ach_skill10", name: "Specialist", description: "Reach level 10 in any skill.", icon: "Award", condition: { type: "flag", key: "any_skill_10", value: true } },
  { id: "ach_skill25", name: "Master", description: "Reach level 25 in any skill.", icon: "Medal", condition: { type: "flag", key: "any_skill_25", value: true } },
  { id: "ach_wheels", name: "Wheels", description: "Own a vehicle.", icon: "Car", condition: { type: "vehicle" } },
  { id: "ach_homeowner", name: "Homeowner", description: "Own a property (not rented).", icon: "Home", condition: { type: "property", tier: 3 } },
  { id: "ach_investor", name: "Investor", description: "Hold ₦1,000,000 in investments.", icon: "TrendingUp", condition: { type: "investment", amount: 1_000_000 } },
  { id: "ach_clean", name: "Clean Hands", description: "Complete 50 legit activities with zero busts.", icon: "ShieldCheck", condition: { type: "flag", key: "clean_50", value: true } },
  { id: "ach_survivor", name: "Survivor", description: "Recover from a bust and keep going.", icon: "HeartPulse", condition: { type: "flag", key: "recovered", value: true }, hidden: true },
  { id: "ach_legend", name: "Legend of Lagos", description: "Complete the main story.", icon: "Crown", condition: { type: "flag", key: "legend", value: true } },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
