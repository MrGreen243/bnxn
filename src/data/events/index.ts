import type { EventDef } from "@/data/types";

const MIN = 60_000;

export const EVENTS: EventDef[] = [
  {
    id: "ev_landlord_increase", title: "Landlord's 'Small' Increase", category: "landlord", weight: 10,
    text: "Baba Kazeem appears at your door with a smile that costs money. 'Economy is hard. Rent is going up. But for you, we can discuss.'",
    requirements: [{ type: "property", propertyId: "prop_shared" }],
    choices: [
      { label: "Negotiate (Negotiation 3+)", requirements: [{ type: "skill", skill: "negotiation", level: 3 }], effects: [{ type: "xp", skill: "negotiation", amount: 40 }, { type: "relationship", npcId: "landlord", amount: 3 }], resultText: "You talked him down to the old rate 'for now'. He respects a good argument." },
      { label: "Pay the increase (₦8,000)", requirements: [{ type: "cash", amount: 8_000 }], effects: [{ type: "cash", amount: -8_000, note: "Rent increase" }, { type: "relationship", npcId: "landlord", amount: 5 }], resultText: "You paid. Baba Kazeem blessed you loudly in front of the neighbours." },
      { label: "Refuse", effects: [{ type: "relationship", npcId: "landlord", amount: -10 }, { type: "stat", stat: "credibility", amount: -2 }], resultText: "He walked away muttering. The barber shop radio got louder that night." },
    ],
    offlineDefault: 2,
  },
  {
    id: "ev_friend_partnership", title: "A Friend's Proposal", category: "friend", weight: 7,
    text: "Tunde bursts in: 'Partnership! You put ₦20,000, I put the idea. Pure water business. Everyone drinks water.'",
    requirements: [{ type: "cash", amount: 20_000 }, { type: "flag", key: "intro_done", value: true }],
    choices: [
      { label: "Invest ₦20,000", effects: [{ type: "cash", amount: -20_000, note: "Tunde's pure water venture" }, { type: "flag", key: "tunde_venture", value: true }, { type: "relationship", npcId: "tunde", amount: 10 }], resultText: "Three weeks later a bag of cash arrives with a note: 'Told you.' (The payout will arrive as an event.)" },
      { label: "Politely decline", effects: [{ type: "relationship", npcId: "tunde", amount: -3 }], resultText: "Tunde shrugged. 'Your loss. Or mine. We'll see.'" },
    ],
    offlineDefault: 1, maxOccurrences: 1,
  },
  {
    id: "ev_tunde_payout", title: "Tunde Delivers", category: "friend", weight: 30,
    text: "Tunde arrives with a nylon bag of cash and the smuggest grin on the mainland. 'Pure water. I told you.'",
    requirements: [{ type: "flag", key: "tunde_venture", value: true }],
    choices: [{ label: "Collect ₦55,000", effects: [{ type: "cash", amount: 55_000, note: "Pure water venture payout" }, { type: "flag", key: "tunde_venture", value: false }, { type: "flag", key: "tunde_paid", value: true }], resultText: "A 175% return. Tunde is unbearable for a week." }],
    offlineDefault: 0, maxOccurrences: 1,
  },
  {
    id: "ev_recruit_demands", title: "A Crew Member Wants More", category: "crew", weight: 12,
    text: "One of your crew corners you after work. 'I bring the money. My share should reflect that. Other crews are calling.'",
    requirements: [{ type: "hk", members: 1 }],
    choices: [
      { label: "Give a ₦25,000 bonus", requirements: [{ type: "cash", amount: 25_000 }], effects: [{ type: "cash", amount: -25_000, note: "Crew bonus" }, { type: "crewLoyalty", amount: 12 }, { type: "crewMorale", amount: 8 }], resultText: "Cash speaks. Loyalty and morale rise across the crew." },
      { label: "Promise to renegotiate", effects: [{ type: "crewLoyalty", amount: 3 }, { type: "log", text: "You promised to review contracts. Do it in the Contracts screen.", kind: "info" }], resultText: "They nod. Promises have a short shelf life." },
      { label: "Refuse", effects: [{ type: "crewLoyalty", amount: -12 }, { type: "crewMorale", amount: -6 }], resultText: "Silence. The kind that precedes a resignation." },
    ],
    offlineDefault: 1,
  },
  {
    id: "ev_rival_shop", title: "A Rival Opens Next Door", category: "business", weight: 10,
    text: "A new shop opened beside one of yours with a louder speaker and lower prices. Customers are curious.",
    requirements: [{ type: "business", count: 1 }],
    choices: [
      { label: "Run a promo (₦30,000)", requirements: [{ type: "cash", amount: 30_000 }], effects: [{ type: "cash", amount: -30_000, note: "Promo campaign" }, { type: "xp", skill: "business", amount: 60 }, { type: "stat", stat: "fame", amount: 2 }], resultText: "Buy-one-get-one brought the crowd back, and then some." },
      { label: "Ignore them", effects: [{ type: "businessDisruption", hours: 3 }], resultText: "Your revenue dipped for a few hours while the novelty wore off." },
    ],
    offlineDefault: 1,
  },
  {
    id: "ev_influencer_invite", title: "Invitation to a Social Event", category: "social", weight: 9,
    text: "A DM from a Lekki influencer: 'Pull up to the rooftop Saturday. Bring energy, bring drip.'",
    requirements: [{ type: "stat", stat: "fame", min: 8 }],
    choices: [
      { label: "Go (₦15,000 for drinks & drip)", requirements: [{ type: "cash", amount: 15_000 }], effects: [{ type: "cash", amount: -15_000, note: "Night out" }, { type: "stat", stat: "fame", amount: 4 }, { type: "stat", stat: "lifestyle", amount: 2 }, { type: "followers", amount: 1_500 }, { type: "post", text: "Rooftop vibes with the real ones 🌃", author: "player" }], resultText: "You were in three stories and one group photo that went viral." },
      { label: "Stay home and work", effects: [{ type: "xp", skill: "computing", amount: 40 }, { type: "xp", skill: "business", amount: 40 }], resultText: "Productive night. Nobody posted about it." },
    ],
    offlineDefault: 1,
  },
  {
    id: "ev_biz_opportunity", title: "Unexpected Contract", category: "opportunity", weight: 9,
    text: "A company wants to bulk-order from one of your businesses. They need an answer today and a small deposit for materials.",
    requirements: [{ type: "business", count: 1 }, { type: "cash", amount: 40_000 }],
    choices: [
      { label: "Accept (deposit ₦40,000)", effects: [{ type: "cash", amount: -40_000, note: "Materials deposit" }, { type: "cash", amount: 140_000, note: "Bulk contract payment" }, { type: "stat", stat: "credibility", amount: 3 }], resultText: "Delivered on time. Net profit ₦100,000 and a new corporate contact." },
      { label: "Decline", effects: [], resultText: "They found another supplier. No harm done." },
    ],
    offlineDefault: 1,
  },
  {
    id: "ev_vehicle_repair", title: "Vehicle Trouble", category: "vehicle", weight: 10,
    text: "Smoke from the bonnet on Ikorodu Road. Uncle Lanre's diagnosis: 'It's not small.'",
    requirements: [{ type: "vehicle" }],
    choices: [
      { label: "Full repair (₦60,000)", requirements: [{ type: "cash", amount: 60_000 }], effects: [{ type: "cash", amount: -60_000, note: "Vehicle repair" }], resultText: "Fixed properly. Lanre threw in a proverb for free." },
      { label: "Patch it (₦15,000, slower deliveries today)", requirements: [{ type: "cash", amount: 15_000 }], effects: [{ type: "cash", amount: -15_000, note: "Vehicle patch" }, { type: "restrict", category: "delivery", ms: 20 * MIN }], resultText: "It runs. It also makes a new noise. Delivery work paused for a bit." },
    ],
    offlineDefault: 1,
  },
  {
    id: "ev_investigation", title: "Questions Are Being Asked", category: "risk", weight: 14,
    text: "A polite man in a plain shirt asked your neighbours about 'your source of income'. He left a card.",
    requirements: [{ type: "stat", stat: "heat", min: 35 }],
    choices: [
      { label: "Lie low (pause risky work)", effects: [{ type: "restrict", category: "risky", ms: 30 * MIN }, { type: "stat", stat: "heat", amount: -8 }], resultText: "You went quiet. The man didn't come back. This time." },
      { label: "Call a lawyer (₦150,000)", requirements: [{ type: "cash", amount: 150_000 }], effects: [{ type: "cash", amount: -150_000, note: "Legal consultation" }, { type: "stat", stat: "heat", amount: -15 }], resultText: "Barrister Okafor made a call. The card went in the bin." },
      { label: "Ignore it", effects: [{ type: "stat", stat: "heat", amount: 10 }], resultText: "Nothing happened. Yet." },
    ],
    offlineDefault: 0,
  },
  {
    id: "ev_legit_opportunity", title: "The Right Offer at the Right Time", category: "opportunity", weight: 8,
    text: "A tech hub in Yaba wants to feature your story in a 'rising entrepreneurs' series and pay for a workshop.",
    requirements: [{ type: "stat", stat: "credibility", min: 15 }],
    choices: [
      { label: "Accept", effects: [{ type: "cash", amount: 45_000, note: "Workshop fee" }, { type: "stat", stat: "credibility", amount: 5 }, { type: "stat", stat: "fame", amount: 3 }, { type: "xp", skill: "charisma", amount: 60 }], resultText: "The room was full. Your story landed." },
      { label: "Too busy", effects: [], resultText: "They featured someone else. Fair enough." },
    ],
    offlineDefault: 0,
  },
  {
    id: "ev_old_friend", title: "An Old Friend Returns", category: "friend", weight: 7,
    text: "Someone from secondary school finds you. He's in trouble with the wrong people and needs ₦50,000 'by tonight'.",
    requirements: [{ type: "cash", amount: 50_000 }, { type: "stat", stat: "streetRep", min: 10 }],
    choices: [
      { label: "Help him (₦50,000)", effects: [{ type: "cash", amount: -50_000, note: "Helped an old friend" }, { type: "stat", stat: "streetRep", amount: 6 }, { type: "flag", key: "helped_friend", value: true }], resultText: "He cried. He'll repay you 'soon'. The street remembers kindness." },
      { label: "Offer him work instead", requirements: [{ type: "hk", tier: 1 }], effects: [{ type: "stat", stat: "credibility", amount: 2 }, { type: "crewMorale", amount: 4 }], resultText: "He joined a training session. Not what he asked for; what he needed." },
      { label: "Turn him away", effects: [{ type: "stat", stat: "streetRep", amount: -4 }], resultText: "He left. You didn't sleep well." },
    ],
    offlineDefault: 2,
  },
  {
    id: "ev_crew_conflict", title: "Crew Conflict", category: "crew", weight: 10,
    text: "Two crew members are shouting over a shared workstation and a client credit. Work has stopped.",
    requirements: [{ type: "hk", members: 2 }],
    choices: [
      { label: "Mediate (Management 6+)", requirements: [{ type: "skill", skill: "management", level: 6 }], effects: [{ type: "crewMorale", amount: 8 }, { type: "crewLoyalty", amount: 5 }, { type: "xp", skill: "management", amount: 80 }], resultText: "Twenty minutes, two apologies, one shared credit. Work resumed." },
      { label: "Buy another workstation (₦80,000)", requirements: [{ type: "cash", amount: 80_000 }], effects: [{ type: "cash", amount: -80_000, note: "Extra workstation" }, { type: "crewMorale", amount: 6 }], resultText: "Problem solved with furniture. Expensive but effective." },
      { label: "Tell them to sort it out", effects: [{ type: "crewMorale", amount: -8 }], resultText: "They sorted it out by not speaking for a week." },
    ],
    offlineDefault: 2,
  },
  {
    id: "ev_rival_poach", title: "A Rival Crew Comes Calling", category: "crew", weight: 8,
    text: "A rival organisation offered your best member double their share. They're 'thinking about it'.",
    requirements: [{ type: "hk", members: 1 }],
    choices: [
      { label: "Match with a bonus (₦60,000)", requirements: [{ type: "cash", amount: 60_000 }], effects: [{ type: "cash", amount: -60_000, note: "Retention bonus" }, { type: "crewLoyalty", amount: 15 }], resultText: "They stayed. Loyalty bought is still loyalty." },
      { label: "Appeal to loyalty (Charisma 8+)", requirements: [{ type: "skill", skill: "charisma", level: 8 }], effects: [{ type: "crewLoyalty", amount: 10 }, { type: "xp", skill: "charisma", amount: 60 }], resultText: "You reminded them who believed in them first. They stayed." },
      { label: "Let them decide", effects: [{ type: "crewLoyalty", amount: -10 }], resultText: "They're still here, but the door is open." },
    ],
    offlineDefault: 2,
  },
  {
    id: "ev_viral_moment", title: "A Viral Moment", category: "social", weight: 6,
    text: "A video of you at work went viral. Thousands of comments, half of them asking what you do.",
    requirements: [{ type: "stat", stat: "fame", min: 5 }],
    choices: [
      { label: "Ride the wave", effects: [{ type: "stat", stat: "fame", amount: 6 }, { type: "followers", amount: 4_000 }, { type: "post", text: "Y'all made me trend 😭🙏", author: "player" }], resultText: "Followers up. Brands watching." },
      { label: "Keep it low", effects: [{ type: "stat", stat: "heat", amount: -3 }, { type: "stat", stat: "fame", amount: 2 }], resultText: "You let it pass. Some people prefer the shadows." },
    ],
    offlineDefault: 0,
  },
  {
    id: "ev_power_outage", title: "Three-Day Blackout", category: "business", weight: 9,
    text: "The transformer on your street exploded in a shower of sparks. Three days without power.",
    requirements: [{ type: "business", count: 1 }],
    choices: [
      { label: "Rent a generator (₦25,000)", requirements: [{ type: "cash", amount: 25_000 }], effects: [{ type: "cash", amount: -25_000, note: "Generator rental" }], resultText: "The generator roared. Business continued." },
      { label: "Wait it out", effects: [{ type: "businessDisruption", hours: 4 }], resultText: "Four hours of revenue, gone." },
    ],
    offlineDefault: 1,
  },
];

export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
