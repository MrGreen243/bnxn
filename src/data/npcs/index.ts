import type { DialogueDef, NpcDef } from "@/data/types";

export const NPCS: NpcDef[] = [
  { id: "tunde", name: "Tunde 'T-Money'", role: "Your ambitious friend", district: "mainland", palette: { skin: 1, hair: 0, outfit: 3 }, bio: "Grew up two streets away. Has a plan for everything and capital for nothing. Believes in you louder than you believe in yourself.", dialogueId: "d_tunde" },
  { id: "mama_risi", name: "Mama Risi", role: "Bakery owner", district: "mainland", palette: { skin: 2, hair: 3, outfit: 1 }, bio: "Has fed the whole street for twenty years. Pays fairly, forgives nothing.", dialogueId: "d_mama_risi" },
  { id: "bode", name: "Bode", role: "Cybercafé owner", district: "mainland", palette: { skin: 1, hair: 1, outfit: 5 }, bio: "Runs the café, the generator and half the area's email accounts. Quietly brilliant.", dialogueId: "d_bode" },
  { id: "chidi", name: "Chidi", role: "The connected guy", district: "mainland", palette: { skin: 0, hair: 2, outfit: 6 }, bio: "Always has a 'small opportunity'. Always smiling. Never explains.", dialogueId: "d_chidi" },
  { id: "iya_bisi", name: "Iya Bisi", role: "Market trader", district: "mainland", palette: { skin: 2, hair: 3, outfit: 2 }, bio: "Queen of the tomato line. Knows every price in Lagos before it changes.", dialogueId: "d_iya_bisi" },
  { id: "landlord", name: "Baba Kazeem", role: "Your landlord", district: "mainland", palette: { skin: 1, hair: 4, outfit: 4 }, bio: "Owns the compound, the barber shop and your patience.", dialogueId: "d_landlord" },
  { id: "lanre", name: "Uncle Lanre", role: "Mechanic", district: "mainland", palette: { skin: 0, hair: 4, outfit: 7 }, bio: "Can fix any engine with a spanner and a proverb.", dialogueId: "d_lanre" },
  { id: "coach_sarge", name: "Coach Sarge", role: "Street gym coach", district: "mainland", palette: { skin: 0, hair: 2, outfit: 0 }, bio: "Ex-military. Concrete weights. Zero excuses.", dialogueId: "d_sarge" },
  { id: "alhaji_musa", name: "Alhaji Musa", role: "Electronics magnate", district: "computerVillage", palette: { skin: 1, hair: 4, outfit: 4 }, bio: "Owns three floors of Computer Village. Sells you a laptop and a lecture.", dialogueId: "d_musa" },
  { id: "ngozi", name: "Ngozi", role: "Laptop clinic owner", district: "computerVillage", palette: { skin: 2, hair: 5, outfit: 5 }, bio: "Revived more dead laptops than any doctor has patients.", dialogueId: "d_ngozi" },
  { id: "dami", name: "Dami", role: "Tech hub founder", district: "yaba", palette: { skin: 1, hair: 1, outfit: 8 }, bio: "Built a hub from a two-room flat. Wants to build you next.", dialogueId: "d_dami" },
  { id: "zara", name: "Zara", role: "Content creator", district: "yaba", palette: { skin: 2, hair: 5, outfit: 9 }, bio: "Two million followers, one ring light, infinite energy.", dialogueId: "d_zara" },
  { id: "dj_spinz", name: "DJ Spinz", role: "Lounge DJ & promoter", district: "surulere", palette: { skin: 0, hair: 2, outfit: 6 }, bio: "If it's a party in Surulere, he's playing it or he's upset about it.", dialogueId: "d_spinz" },
  { id: "kemi", name: "Kemi", role: "Fashion store owner", district: "surulere", palette: { skin: 1, hair: 3, outfit: 9 }, bio: "Dresses half the influencers in Lagos. Remembers who paid late.", dialogueId: "d_kemi" },
  { id: "mr_adewale", name: "Mr. Adewale", role: "Business association chair", district: "ikeja", palette: { skin: 1, hair: 4, outfit: 4 }, bio: "Has chaired every committee in Ikeja. Respects credibility, nothing else.", dialogueId: "d_adewale" },
  { id: "okafor", name: "Barrister Okafor", role: "Lawyer", district: "ikeja", palette: { skin: 0, hair: 4, outfit: 10 }, bio: "Expensive, calm, and the only person you want to call at 5am.", dialogueId: "d_okafor" },
  { id: "bankole", name: "Mr. Bankole", role: "Property developer", district: "lekki", palette: { skin: 1, hair: 4, outfit: 10 }, bio: "Sells apartments with sea views to people who never look out the window.", dialogueId: "d_bankole" },
  { id: "sophia", name: "Sophia", role: "Brand agency director", district: "lekki", palette: { skin: 2, hair: 5, outfit: 9 }, bio: "Turns faces into campaigns. Yours could be next.", dialogueId: "d_sophia" },
  { id: "olumide", name: "Chief Olumide", role: "Corporate mogul", district: "vi", palette: { skin: 0, hair: 4, outfit: 10 }, bio: "Owns things you didn't know could be owned.", dialogueId: "d_olumide" },
  { id: "yusuf", name: "Detective Yusuf", role: "Financial crimes investigator", district: "vi", palette: { skin: 1, hair: 0, outfit: 11 }, bio: "Polite. Patient. Has read every post you ever deleted.", dialogueId: "d_yusuf" },
  { id: "ireti", name: "Madam Ireti", role: "Island society gatekeeper", district: "island", palette: { skin: 2, hair: 3, outfit: 9 }, bio: "Decides who matters on the island. Has never been wrong, by definition.", dialogueId: "d_ireti" },
];

export const NPC_MAP: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

const d = (def: DialogueDef) => def;

export const DIALOGUES: DialogueDef[] = [
  d({
    id: "d_tunde",
    npcId: "tunde",
    entries: [
      { requirements: [{ type: "flag", key: "hk_unlocked", value: true }], node: "hk_done" },
      { requirements: [{ type: "quest", questId: "q_hk_foundation" }], node: "hk_done" },
      { requirements: [{ type: "flag", key: "hk_quest_started", value: true }], node: "hk_progress" },
      { requirements: [{ type: "skill", skill: "management", level: 3 }, { type: "flag", key: "intro_done", value: true }], node: "hk_pitch" },
      { requirements: [{ type: "flag", key: "intro_done", value: true }], node: "later" },
      { node: "intro" },
    ],
    nodes: {
      intro: { id: "intro", text: "My guy! You finally came out. Listen, this area is small but the money inside it is not small. Mama Risi needs legs for deliveries, Bode's café always has typing work, and the market... the market is a university.", next: "intro2" },
      intro2: { id: "intro2", text: "Here is the plan: work, upgrade, work faster, buy something that works for you while you sleep. One day we build our own thing. A kingdom. But today? Bread.", choices: [
        { text: "Say less. Let's go.", effects: [{ type: "flag", key: "intro_done", value: true }, { type: "relationship", npcId: "tunde", amount: 10 }, { type: "log", text: "Tunde laid out the plan: work, upgrade, build.", kind: "info" }] },
        { text: "A kingdom? From bread?", next: "intro3" },
      ] },
      intro3: { id: "intro3", text: "Everything big in Lagos started from something small. Dangote started with cement. We'll start with Agege bread. Go and see Mama Risi before she gives the job to someone with longer legs.", effects: [{ type: "flag", key: "intro_done", value: true }, { type: "relationship", npcId: "tunde", amount: 10 }] },
      later: { id: "later", text: "How far? You're moving. Keep levelling that Management skill — when you can manage yourself, I have something bigger to show you.", choices: [
        { text: "What's the bigger thing?", next: "tease" },
        { text: "I'm on it.", end: true },
      ] },
      tease: { id: "tease", text: "A crew. A proper organisation. People working under one roof, everyone eating. But first show me you can keep ₦150k in your pocket without spending it on shawarma." },
      hk_pitch: { id: "hk_pitch", text: "Okay. I've been watching you. You can manage. Here's the thing: I know three people who are smart, hungry and need direction. We rent a room, we get them working, we take a fair share. A Hustler Kingdom.", choices: [
        { text: "I'm in. What do we need?", effects: [{ type: "startQuest", questId: "q_hk_foundation" }, { type: "flag", key: "hk_quest_started", value: true }, { type: "relationship", npcId: "tunde", amount: 15 }] },
        { text: "Not yet.", end: true },
      ] },
      hk_progress: { id: "hk_progress", text: "Requirements, my guy: ₦150,000 capital, Management level 4, some respect on the street and some credibility in offices. Then come back and we open the doors.", choices: [
        { text: "Open the doors.", requirements: [{ type: "cash", amount: 150_000 }, { type: "skill", skill: "management", level: 4 }, { type: "stat", stat: "credibility", min: 15 }, { type: "stat", stat: "streetRep", min: 15 }], effects: [{ type: "flag", key: "hk_ready", value: true }, { type: "log", text: "Tunde: 'Let's open the doors.'", kind: "good" }] },
        { text: "Still working on it.", end: true },
      ] },
      hk_done: { id: "hk_done", text: "Look at us. A whole organisation. Keep the crew paid and the morale high — people leave kingdoms that don't feed them. And watch the heat; the city watches back.", choices: [
        { text: "Any advice on recruits?", next: "advice" },
        { text: "We move.", end: true },
      ] },
      advice: { id: "advice", text: "Cheap recruits need training. Expensive ones need respect. Pay your share on time and nobody will ever leave. Simple. Not easy." },
    },
  }),
  d({
    id: "d_mama_risi",
    npcId: "mama_risi",
    entries: [
      { requirements: [{ type: "activityCount", activityId: "deliver_bread", count: 5 }], node: "regular" },
      { node: "first" },
    ],
    nodes: {
      first: { id: "first", text: "Ehen, you are Tunde's friend? The one with the long legs? Good. Bread doesn't deliver itself. Take the crates to the kiosks and come back with my money, not stories.", choices: [
        { text: "Yes ma. On it.", effects: [{ type: "relationship", npcId: "mama_risi", amount: 5 }, { type: "flag", key: "met_mama_risi", value: true }] },
      ] },
      regular: { id: "regular", text: "My reliable one! Customers are asking for you by name. If you ever want a bigger order, tell me. I don't pay small for big work.", choices: [
        { text: "Any big orders today?", effects: [{ type: "startQuest", questId: "q_side_big_order" }], requirements: [{ type: "flag", key: "intro_done", value: true }] },
        { text: "Just checking in, ma.", end: true },
      ] },
    },
  }),
  d({
    id: "d_bode",
    npcId: "bode",
    entries: [
      { requirements: [{ type: "skill", skill: "computing", level: 6 }], node: "pro" },
      { node: "first" },
    ],
    nodes: {
      first: { id: "first", text: "Welcome to the Hub. The generator is loud, the internet is fast-ish. Typing jobs are on the board. If you learn to really use a computer, Computer Village will open for you.", choices: [
        { text: "Teach me something.", next: "lesson" },
        { text: "Thanks, Bode.", end: true },
      ] },
      lesson: { id: "lesson", text: "Lesson one: save your work before NEPA takes the light. Lesson two: nobody pays for 'almost finished'. Here, a little XP for listening.", effects: [{ type: "xp", skill: "computing", amount: 40 }, { type: "flag", key: "bode_lesson", value: true }] },
      pro: { id: "pro", text: "You've outgrown my old desktops. Go see Alhaji Musa in Computer Village — mention my name and he'll only overcharge you a little.", effects: [{ type: "relationship", npcId: "bode", amount: 5 }] },
    },
  }),
  d({
    id: "d_chidi",
    npcId: "chidi",
    entries: [
      { requirements: [{ type: "flag", key: "chidi_refused", value: true }], node: "refused" },
      { requirements: [{ type: "flag", key: "met_chidi", value: true }], node: "regular" },
      { node: "first" },
    ],
    nodes: {
      first: { id: "first", text: "Ah, the new hustler. I've seen you running up and down with bread. Honest work. Slow work. I have faster work. No details, no questions, better money.", choices: [
        { text: "I'm listening.", next: "offer" },
        { text: "Not interested.", effects: [{ type: "flag", key: "chidi_refused", value: true }, { type: "stat", stat: "credibility", amount: 2 }, { type: "log", text: "You turned down Chidi's 'opportunity'.", kind: "info" }] },
      ] },
      offer: { id: "offer", text: "Simple. Boxes that need moving. Accounts that need an address. You get paid, I get paid, nobody asks. Just know: the money is real and so is the risk. Your choice.", choices: [
        { text: "Show me the opportunities.", effects: [{ type: "flag", key: "met_chidi", value: true }, { type: "stat", stat: "streetRep", amount: 3 }, { type: "log", text: "Chidi added you to his 'opportunities' list.", kind: "bad" }] },
        { text: "I'll pass.", effects: [{ type: "flag", key: "chidi_refused", value: true }, { type: "stat", stat: "credibility", amount: 2 }] },
      ] },
      regular: { id: "regular", text: "Opportunities are on the board under 'Opportunities'. Remember what I said — keep your heat low. When it gets hot, even I don't know you.", choices: [
        { text: "I'm done with this life.", effects: [{ type: "flag", key: "chidi_refused", value: true }, { type: "stat", stat: "credibility", amount: 3 }, { type: "stat", stat: "streetRep", amount: -2 }], end: true },
        { text: "Noted.", end: true },
      ] },
      refused: { id: "refused", text: "Still playing it clean? Respect. Honestly. If you change your mind, you know where I sit.", choices: [
        { text: "Actually... show me.", effects: [{ type: "flag", key: "chidi_refused", value: false }, { type: "flag", key: "met_chidi", value: true }, { type: "stat", stat: "streetRep", amount: 2 }] },
        { text: "I won't.", end: true },
      ] },
    },
  }),
  d({
    id: "d_iya_bisi",
    npcId: "iya_bisi",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "You want to learn business? Stand here for one hour and watch me. Buy low at 6am, sell at 9am when the office people rush. Prices are a conversation, not a rule.", choices: [
        { text: "Teach me to negotiate.", effects: [{ type: "xp", skill: "negotiation", amount: 35 }, { type: "flag", key: "bisi_lesson", value: true }] },
        { text: "Need any help?", effects: [{ type: "startQuest", questId: "q_side_market_stock" }] },
        { text: "Bye, ma.", end: true },
      ] },
    },
  }),
  d({
    id: "d_landlord",
    npcId: "landlord",
    entries: [
      { requirements: [{ type: "quest", questId: "q_rent" }], node: "paid" },
      { requirements: [{ type: "flag", key: "rent_demanded", value: true }], node: "reminder" },
      { node: "first" },
    ],
    nodes: {
      first: { id: "first", text: "My tenant! Enjoying the room? Good. Rent for this month is ₦15,000. I'm not shouting yet. I'm just... mentioning.", choices: [
        { text: "I'll have it soon, sir.", effects: [{ type: "flag", key: "rent_demanded", value: true }, { type: "startQuest", questId: "q_rent" }] },
      ] },
      reminder: { id: "reminder", text: "₦15,000. I said it gently last time.", choices: [
        { text: "Pay ₦15,000 now.", requirements: [{ type: "cash", amount: 15_000 }], effects: [{ type: "cash", amount: -15_000, note: "Rent paid to Baba Kazeem" }, { type: "flag", key: "rent_paid", value: true }, { type: "relationship", npcId: "landlord", amount: 10 }, { type: "stat", stat: "credibility", amount: 3 }] },
        { text: "Soon, sir.", end: true },
      ] },
      paid: { id: "paid", text: "A tenant who pays on time is a tenant I greet with two hands. If you ever want a bigger place, there are self-contained rooms in the compound." },
    },
  }),
  d({
    id: "d_lanre",
    npcId: "lanre",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Engines are like people: they tell you what's wrong if you listen. You want to drive? Learn first, then buy. A car bought before sense is a car sold before Christmas.", choices: [
        { text: "Teach me to drive.", effects: [{ type: "flag", key: "met_lanre", value: true }, { type: "xp", skill: "driving", amount: 30 }, { type: "log", text: "Uncle Lanre agreed to give driving lessons.", kind: "good" }] },
        { text: "Show me vehicles.", effects: [{ type: "openScreen", screen: "garage" }] },
      ] },
    },
  }),
  d({
    id: "d_sarge",
    npcId: "coach_sarge",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "You look tired. Lagos will tire you more. Lift. Run. Repeat. Fitness means more energy, more energy means more money.", choices: [
        { text: "Let's train.", effects: [{ type: "startActivity", activityId: "gym_session" }] },
        { text: "Maybe later.", end: true },
      ] },
    },
  }),
  d({
    id: "d_musa",
    npcId: "alhaji_musa",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Bode's friend! Welcome to the Village. Everything is here: laptops, phones, routers. Buy the tool that matches your ambition, not your pocket. Pay in instalments? No. Pay in cash? Discount.", choices: [
        { text: "Show me the catalogue.", effects: [{ type: "openScreen", screen: "shop:cv_computers" }] },
        { text: "Any advice?", next: "advice" },
      ] },
      advice: { id: "advice", text: "A good laptop pays for itself in three jobs. A cheap one costs you ten. Also: never buy a phone from a man in a moving car.", effects: [{ type: "xp", skill: "business", amount: 30 }] },
    },
  }),
  d({
    id: "d_ngozi",
    npcId: "ngozi",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "You're the one fixing phones on the mainland? Come and learn real repair. Motherboards, not just screens. And when you're ready, bring me real clients — websites, networks, the works.", choices: [
        { text: "Teach me.", effects: [{ type: "xp", skill: "computing", amount: 60 }, { type: "relationship", npcId: "ngozi", amount: 8 }] },
        { text: "Got any work?", effects: [{ type: "openScreen", screen: "activities" }] },
      ] },
    },
  }),
  d({
    id: "d_dami",
    npcId: "dami",
    entries: [
      { requirements: [{ type: "stat", stat: "fame", min: 10 }], node: "famous" },
      { node: "main" },
    ],
    nodes: {
      main: { id: "main", text: "Welcome to Lighthouse. We build products, companies, careers. Yaba rewards people who ship. Content, code, design — pick a lane and go fast.", choices: [
        { text: "I want to build things.", effects: [{ type: "xp", skill: "computing", amount: 40 }, { type: "xp", skill: "creativity", amount: 40 }, { type: "startQuest", questId: "q_yaba" }] },
        { text: "Just looking.", end: true },
      ] },
      famous: { id: "famous", text: "People talk about you now. Fame is capital — spend it on something that lasts. Have you thought about a real business? A studio, an agency?", effects: [{ type: "stat", stat: "credibility", amount: 2 }] },
    },
  }),
  d({
    id: "d_zara",
    npcId: "zara",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Oh my days, you're the one from the skits! Okay listen — consistency beats talent. Post daily. Reply to comments. And buy a better phone, that camera is a crime.", choices: [
        { text: "Collab?", requirements: [{ type: "stat", stat: "fame", min: 15 }], effects: [{ type: "stat", stat: "fame", amount: 4 }, { type: "followers", amount: 5_000 }, { type: "post", text: "Collab with Zara dropping soon 👀", author: "player" }, { type: "log", text: "Zara agreed to a collab. Followers up!", kind: "good" }] },
        { text: "Any tips?", effects: [{ type: "xp", skill: "charisma", amount: 35 }] },
      ] },
    },
  }),
  d({
    id: "d_spinz",
    npcId: "dj_spinz",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Surulere! The lounge is packed every weekend. I need people who can plan, promote and handle drama. You handle drama?", choices: [
        { text: "I handle drama.", effects: [{ type: "startQuest", questId: "q_side_party" }, { type: "relationship", npcId: "dj_spinz", amount: 5 }] },
        { text: "Play something.", effects: [{ type: "stat", stat: "lifestyle", amount: 1 }], end: true },
      ] },
    },
  }),
  d({
    id: "d_kemi",
    npcId: "kemi",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Image is currency. Nobody gives a deal to a man in slides. Buy something tailored, walk into Ikeja like you own a building.", choices: [
        { text: "Show me the closet.", effects: [{ type: "openScreen", screen: "shop:su_fashion" }] },
        { text: "Need any help?", effects: [{ type: "startQuest", questId: "q_side_fashion" }] },
      ] },
    },
  }),
  d({
    id: "d_adewale",
    npcId: "mr_adewale",
    entries: [
      { requirements: [{ type: "business", count: 1 }], node: "owner" },
      { node: "main" },
    ],
    nodes: {
      main: { id: "main", text: "Welcome to Ikeja. Here we don't ask what you earn; we ask what you own. Buy a business. Run it well. Then we talk about the association.", choices: [
        { text: "How do I start?", effects: [{ type: "startQuest", questId: "q_first_business" }, { type: "xp", skill: "business", amount: 40 }] },
        { text: "Understood.", end: true },
      ] },
      owner: { id: "owner", text: "A business owner. Now you can sit at the table. Keep your credibility high and the association will send contracts your way.", effects: [{ type: "stat", stat: "credibility", amount: 3 }] },
    },
  }),
  d({
    id: "d_okafor",
    npcId: "okafor",
    entries: [
      { requirements: [{ type: "stat", stat: "heat", min: 50 }], node: "hot" },
      { node: "main" },
    ],
    nodes: {
      main: { id: "main", text: "Barrister Okafor. I handle company registration, contracts and... situations. Keep my number. Most people call too late.", choices: [
        { text: "Register my business properly.", requirements: [{ type: "cash", amount: 50_000 }], effects: [{ type: "cash", amount: -50_000, note: "Company registration" }, { type: "stat", stat: "credibility", amount: 8 }, { type: "flag", key: "registered", value: true }] },
        { text: "Just saying hello.", end: true },
      ] },
      hot: { id: "hot", text: "Your name is appearing in places it shouldn't. I can cool things down, but it costs, and you must stop whatever you're doing. Agreed?", choices: [
        { text: "Pay ₦400,000 retainer.", requirements: [{ type: "cash", amount: 400_000 }], effects: [{ type: "cash", amount: -400_000, note: "Legal retainer" }, { type: "stat", stat: "heat", amount: -25 }, { type: "flag", key: "okafor_retained", value: true }, { type: "log", text: "Barrister Okafor cooled things down. Heat reduced.", kind: "good" }] },
        { text: "I'll manage.", end: true },
      ] },
    },
  }),
  d({
    id: "d_bankole",
    npcId: "bankole",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Lekki is where you stop renting and start owning. Apartments, duplexes, waterfront. Every property raises your status, and status opens every door on this side.", choices: [
        { text: "Show me properties.", effects: [{ type: "openScreen", screen: "property" }] },
        { text: "Talk business.", effects: [{ type: "xp", skill: "business", amount: 50 }, { type: "xp", skill: "negotiation", amount: 30 }] },
      ] },
    },
  }),
  d({
    id: "d_sophia",
    npcId: "sophia",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "I've seen your numbers. Brands want faces with stories. Yours is a good one — as long as it stays clean. Scandals are expensive.", choices: [
        { text: "Book me.", requirements: [{ type: "stat", stat: "fame", min: 30 }], effects: [{ type: "openScreen", screen: "activities" }] },
        { text: "How do I get bigger?", effects: [{ type: "xp", skill: "charisma", amount: 50 }] },
      ] },
    },
  }),
  d({
    id: "d_olumide",
    npcId: "olumide",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "Young entrepreneur. Credibility is the only currency on this island that doesn't inflate. Keep yours. Then we can discuss serious capital.", choices: [
        { text: "Discuss capital.", requirements: [{ type: "stat", stat: "credibility", min: 50 }], effects: [{ type: "flag", key: "olumide_backing", value: true }, { type: "stat", stat: "credibility", amount: 5 }, { type: "log", text: "Chief Olumide offered to back your next venture.", kind: "good" }] },
        { text: "Noted, Chief.", end: true },
      ] },
    },
  }),
  d({
    id: "d_yusuf",
    npcId: "yusuf",
    entries: [
      { requirements: [{ type: "stat", stat: "heat", min: 40 }], node: "warning" },
      { node: "main" },
    ],
    nodes: {
      main: { id: "main", text: "Good afternoon. Detective Yusuf, Financial Crimes Unit. Just introducing myself. We like to know the faces behind the money in this city. Keep yours honest.", effects: [{ type: "flag", key: "met_yusuf", value: true }] },
      warning: { id: "warning", text: "We've noticed patterns. I'm not accusing. I'm advising. Legitimate businesses, documented income — those protect you. Shortcuts don't.", choices: [
        { text: "Cooperate and clean up.", effects: [{ type: "stat", stat: "heat", amount: -10 }, { type: "stat", stat: "streetRep", amount: -5 }, { type: "stat", stat: "credibility", amount: 3 }] },
        { text: "I have nothing to say.", effects: [{ type: "stat", stat: "heat", amount: 5 }], end: true },
      ] },
    },
  }),
  d({
    id: "d_ireti",
    npcId: "ireti",
    entries: [{ node: "main" }],
    nodes: {
      main: { id: "main", text: "So you are the one everyone is talking about. Welcome to the island, darling. Here, money whispers. Make sure yours has good manners.", choices: [
        { text: "Host an event with me.", requirements: [{ type: "stat", stat: "fame", min: 55 }], effects: [{ type: "openScreen", screen: "activities" }] },
        { text: "Thank you, Madam.", effects: [{ type: "stat", stat: "lifestyle", amount: 2 }], end: true },
      ] },
    },
  }),
];

export const DIALOGUE_MAP: Record<string, DialogueDef> = Object.fromEntries(DIALOGUES.map((x) => [x.id, x]));
