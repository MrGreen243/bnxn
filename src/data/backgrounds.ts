import type { BackgroundDef } from "@/data/types";

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: "street",
    name: "The Street-Smart Beginner",
    description: "You grew up on this corner. You know every face, every shortcut and every story. Starts with +₦2,000 and Street Smarts XP.",
    bonusSkill: "streetSmarts",
    bonusXp: 260,
    introQuest: "q_intro_street",
    intro: "You know the area better than the area knows itself. Time to make it pay.",
  },
  {
    id: "apprentice",
    name: "The Computer Village Apprentice",
    description: "Three years fixing laptops under a leaking roof. You can smell a faulty motherboard. Starts with Computing XP and a used desktop.",
    bonusSkill: "computing",
    bonusXp: 320,
    startingItem: "pc_2",
    introQuest: "q_intro_apprentice",
    intro: "Your oga paid you in 'experience'. Now the experience will pay you.",
  },
  {
    id: "creative",
    name: "The Creative Hustler",
    description: "Skits, beats, flyers, photos. You've done it all for 'exposure'. Starts with +₦1,000 and Creativity XP.",
    bonusSkill: "creativity",
    bonusXp: 260,
    introQuest: "q_intro_creative",
    intro: "Exposure doesn't pay rent. Your talent will.",
  },
  {
    id: "graduate",
    name: "The Business-Minded Graduate",
    description: "A degree, a plan, and no job. Starts with +₦5,000 and Business XP.",
    bonusSkill: "business",
    bonusXp: 260,
    introQuest: "q_intro_graduate",
    intro: "NYSC is over. The real service begins.",
  },
];

export const BACKGROUND_MAP = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b])) as Record<BackgroundDef["id"], BackgroundDef>;
