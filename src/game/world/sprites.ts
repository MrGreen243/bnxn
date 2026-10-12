import { ctxOf, drawPixels, makeCanvas, shade, type Palette } from "@/game/world/pixelArt";

export const SKIN_TONES = ["#5a3a24", "#8a5a3a", "#c68c5a", "#3b2416"];
export const HAIR_COLORS = ["#101010", "#2a1a0f", "#4a2f18", "#1a1a2a", "#5c5c5c", "#7a2f6a"];
export const OUTFIT_COLORS = ["#2b2b2b", "#d9452b", "#2b7bd9", "#e0a526", "#f0f0f0", "#2d8f5a", "#7a3fd1", "#8a6a3a", "#1f8fa3", "#e04f9f", "#1a2a44", "#4b5563"];

export const CHAR_W = 16;
export const CHAR_H = 24;

// S skin, H hair, O outfit, D outfit dark, P pants, K shoes, E eye, W eye white
const DOWN = [
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "...HHSSSSSSHH...",
  "...HSSSSSSSSH...",
  "...HSWESSWESH...",
  "...HSSSSSSSSH...",
  "....SSSSSSSS....",
  ".....SSDDSS.....",
  "....OOOOOOOO....",
  "...OOOOOOOOOO...",
  "..SOOOOOOOOOOS..",
  "..SOOODOOODOOS..",
  "..SOOOOOOOOOOS..",
  "...OOOOOOOOOO...",
  "....PPPPPPPP....",
  "....PPPPPPPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "....KKK..KKK....",
  "....KKK..KKK....",
  "................",
  "................",
];
const UP = DOWN.map((r, i) => (i === 4 ? "...HHHHHHHHHH..." : i === 5 ? "...HHSSSSSSHH..." : i === 2 ? "...HHHHHHHHHH..." : i === 3 ? "...HHHHHHHHHH..." : r));
const RIGHT = [
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "...HHHSSSSSS....",
  "...HHSSSSSSSS...",
  "...HHSSSSWES....",
  "...HHSSSSSSSS...",
  "....SSSSSSSS....",
  ".....SSSDSS.....",
  "....OOOOOOOO....",
  "....OOOOOOOOO...",
  "...SOOOOOOOOO...",
  "...SOOOOOODOO...",
  "...SOOOOOOOOO...",
  "....OOOOOOOO....",
  "....PPPPPPPP....",
  "....PPPPPPPP....",
  ".....PPPPPP.....",
  ".....PPPPPP.....",
  ".....PPPPPP.....",
  ".....PPPPPP.....",
  ".....KKKKKK.....",
  ".....KKKKKK.....",
  "................",
  "................",
];

function walkFrame(base: string[], frame: number): string[] {
  if (frame === 0) return base;
  const rows = base.slice();
  // Alternate legs: shift one leg up one row to suggest a stride.
  const legRows = [16, 17, 18, 19, 20, 21];
  const out = rows.slice();
  for (const r of legRows) {
    const row = rows[r]!;
    const left = row.slice(0, 8);
    const right = row.slice(8);
    const srcLeft = rows[frame === 1 ? Math.min(21, r + 1) : r]!.slice(0, 8);
    const srcRight = rows[frame === 2 ? Math.min(21, r + 1) : r]!.slice(8);
    out[r] = (frame === 1 ? srcLeft : left) + (frame === 2 ? srcRight : right);
  }
  out[22] = frame === 1 ? "....KKK........." : "........KKK.....";
  return out;
}

export function charKey(skin: number, hair: number, outfit: number): string {
  return `char_${skin}_${hair}_${outfit}`;
}

/** Generates a 12-frame sprite sheet: rows = down, left, right, up; 3 frames each. */
export function generateCharacterSheet(skin: number, hair: number, outfit: number): HTMLCanvasElement {
  const canvas = makeCanvas(CHAR_W * 3, CHAR_H * 4);
  const ctx = ctxOf(canvas);
  const o = OUTFIT_COLORS[outfit % OUTFIT_COLORS.length]!;
  const palette: Palette = {
    S: SKIN_TONES[skin % SKIN_TONES.length]!,
    H: HAIR_COLORS[hair % HAIR_COLORS.length]!,
    O: o,
    D: shade(o, -40),
    P: shade("#3a3f5c", (outfit * 7) % 30 - 15),
    K: "#1b1b1b",
    E: "#101010",
    W: "#ffffff",
  };
  const dirs = [DOWN, RIGHT, RIGHT, UP];
  dirs.forEach((base, row) => {
    for (let f = 0; f < 3; f++) {
      const frame = walkFrame(base, f);
      if (row === 1) {
        // left = mirrored right
        const mirrored = frame.map((r) => r.split("").reverse().join(""));
        drawPixels(ctx, f * CHAR_W, row * CHAR_H, mirrored, palette);
      } else {
        drawPixels(ctx, f * CHAR_W, row * CHAR_H, frame, palette);
      }
    }
  });
  return canvas;
}

export interface PropArt {
  key: string;
  rows: string[];
  palette: Palette;
  /** collision box in pixels relative to sprite top-left, or null for walk-through */
  body: { x: number; y: number; w: number; h: number } | null;
}

const G = "#3f6b2a";
const G2 = "#5d8a3c";
const TR = "#5a3a24";

export const PROPS: Record<string, PropArt> = {
  tree: {
    key: "prop_tree",
    rows: [
      ".....GGGGGG.....",
      "...GGGGLGGGGG...",
      "..GGLGGGGGGLGG..",
      ".GGGGGGGLGGGGGG.",
      ".GLGGGGGGGGGGLG.",
      "..GGGGLGGGGGGG..",
      "...GGGGGGGLGG...",
      ".....GGGGGG.....",
      ".......TT.......",
      ".......TT.......",
      ".......TT.......",
      "......TTTT......",
    ],
    palette: { G, L: G2, T: TR },
    body: { x: 5, y: 8, w: 6, h: 4 },
  },
  palm: {
    key: "prop_palm",
    rows: [
      "..LL........LL..",
      ".LLLL..LL..LLLL.",
      "..LLLLLLLLLLLL..",
      "....LLLLLLLL....",
      ".LLLLLLTTLLLLLL.",
      "LL....LTTL....LL",
      "......LTTL......",
      ".......TT.......",
      ".......TT.......",
      ".......TT.......",
      "......TTTT......",
      ".....TTTTTT.....",
    ],
    palette: { L: "#4f9a3a", T: "#8a6a3a" },
    body: { x: 6, y: 9, w: 4, h: 3 },
  },
  pole: {
    key: "prop_pole",
    rows: ["..YY..", ".YLLY.", "..YY..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", "..PP..", ".PPPP."],
    palette: { P: "#4a4a4a", Y: "#333333", L: "#ffe27a" },
    body: { x: 2, y: 12, w: 2, h: 4 },
  },
  danfo: {
    key: "prop_danfo",
    rows: [
      "..YYYYYYYYYYYYYYYYYYYYYYYYYY....",
      ".YYYYYYYYYYYYYYYYYYYYYYYYYYYY...",
      ".YKWWWKWWWKWWWKWWWKWWWKYYYYYY...",
      ".YKWWWKWWWKWWWKWWWKWWWKYYWWWY...",
      ".YYYYYYYYYYYYYYYYYYYYYYYYYYYY...",
      ".YBBBBBBBBBBBBBBBBBBBBBBBBBBY...",
      ".YYYYYYYYYYYYYYYYYYYYYYYYYYYY...",
      ".YYYYYYYYYYYYYYYYYYYYYYYYYYYYR..",
      "..YYTTYYYYYYYYYYYYYYYYYYTTYYY...",
      "...TTTT................TTTT.....",
      "...TTTT................TTTT.....",
    ],
    palette: { Y: "#e6b422", K: "#2b2b2b", W: "#bfe3ff", B: "#1b1b1b", T: "#1a1a1a", R: "#ff3b3b" },
    body: { x: 1, y: 2, w: 28, h: 9 },
  },
  car: {
    key: "prop_car",
    rows: [
      "......CCCCCCCCCC......",
      ".....CKWWWKWWWKC......",
      "....CCKWWWKWWWKCC.....",
      "..CCCCCCCCCCCCCCCCCC..",
      ".CCCCCCCCCCCCCCCCCCCC.",
      ".CLCCCCCCCCCCCCCCCCRC.",
      ".CCCTTCCCCCCCCCCTTCCC.",
      "...TTTT........TTTT...",
      "...TTTT........TTTT...",
    ],
    palette: { C: "#2b4f8f", K: "#1b1b1b", W: "#bfe3ff", T: "#1a1a1a", L: "#ffe27a", R: "#ff3b3b" },
    body: { x: 1, y: 2, w: 20, h: 7 },
  },
  okada: {
    key: "prop_okada",
    rows: [
      "....RR........",
      "...RRRR.......",
      "...KKRRRKKK...",
      "..KKKRRRKKKK..",
      ".TT.KKKKK.TT..",
      "TTTT.....TTTT.",
      "TTTT.....TTTT.",
      ".TT.......TT..",
    ],
    palette: { R: "#d9452b", K: "#2b2b2b", T: "#1a1a1a" },
    body: { x: 0, y: 2, w: 13, h: 6 },
  },
  kiosk: {
    key: "prop_kiosk",
    rows: [
      ".RRRRRRRRRRRRRRRRRRRRRR.",
      "RWWRRWWRRWWRRWWRRWWRRWWR",
      ".BBBBBBBBBBBBBBBBBBBBBB.",
      ".BBBBBBBBBBBBBBBBBBBBBB.",
      ".BGGGGBBBYYYYBBBBGGGGBB.",
      ".BGGGGBBBYYYYBBBBGGGGBB.",
      ".BBBBBBBBBBBBBBBBBBBBBB.",
      ".BBBBBBBBBBBBBBBBBBBBBB.",
      ".BPPPPPPPPPPPPPPPPPPPPB.",
      ".BPPPPPPPPPPPPPPPPPPPPB.",
      ".BPPPPPPPPPPPPPPPPPPPPB.",
      ".BBBBBBBBBBBBBBBBBBBBBB.",
      "..TT................TT..",
      "..TT................TT..",
    ],
    palette: { R: "#d9452b", W: "#ffffff", B: "#7a5230", G: "#2d8f5a", Y: "#e0a526", P: "#c98a4a", T: "#4a2d1a" },
    body: { x: 1, y: 2, w: 22, h: 12 },
  },
  billboard: {
    key: "prop_billboard",
    rows: Array.from({ length: 40 }, (_, y) => {
      if (y < 2) return "F".repeat(56);
      if (y < 30) return "F" + "S".repeat(54) + "F";
      if (y < 32) return "F".repeat(56);
      return "....................PPPP........PPPP....................";
    }),
    palette: { F: "#3a3a3a", S: "#15161c", P: "#5a5a5a" },
    body: { x: 18, y: 30, w: 20, h: 10 },
  },
  bench: {
    key: "prop_bench",
    rows: ["BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "..LL........LL..", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "..LL........LL..", "..LL........LL.."],
    palette: { B: "#8a6a3a", L: "#3a3a3a" },
    body: { x: 0, y: 2, w: 16, h: 5 },
  },
  gen: {
    key: "prop_gen",
    rows: ["..YYYYYYYYYY..", ".YYYYYYYYYYYY.", ".YKKKKKKKKKKY.", ".YKRRKKKKKKKY.", ".YKKKKKKKKKKY.", ".YYYYYYYYYYYY.", "..KK......KK.."],
    palette: { Y: "#d9b84a", K: "#2b2b2b", R: "#ff3b3b" },
    body: { x: 1, y: 1, w: 12, h: 6 },
  },
  bin: {
    key: "prop_bin",
    rows: [".GGGGGG.", "GGGGGGGG", ".GDGGDG.", ".GGGGGG.", ".GDGGDG.", ".GGGGGG.", ".GGGGGG.", "..GGGG.."],
    palette: { G: "#2d8f5a", D: "#1f6b40" },
    body: { x: 1, y: 2, w: 6, h: 6 },
  },
  fountain: {
    key: "prop_fountain",
    rows: [
      ".......WW.......",
      "......WWWW......",
      ".....SSWWSS.....",
      "....SSSSSSSS....",
      "..SSSWWWWWWSSS..",
      ".SSWWWWWWWWWWSS.",
      ".SSWWWWWWWWWWSS.",
      ".SSWWWWWWWWWWSS.",
      "..SSWWWWWWWWSS..",
      "...SSSSSSSSSS...",
      "....SSSSSSSS....",
    ],
    palette: { W: "#5c9fd1", S: "#b9b0a1" },
    body: { x: 1, y: 3, w: 14, h: 8 },
  },
  sign: {
    key: "prop_sign",
    rows: ["BBBBBBBBBBBBBBBBBBBB", "BWWWWWWWWWWWWWWWWWWB", "BWWWWWWWWWWWWWWWWWWB", "BBBBBBBBBBBBBBBBBBBB", ".........PP.........", ".........PP.........", ".........PP........."],
    palette: { B: "#2d6b3a", W: "#eef5e8", P: "#4a4a4a" },
    body: null,
  },
  // interior props (2–3 tiles wide so they read at 16px tile scale)
  desk: {
    key: "prop_desk",
    rows: [
      "..KKKKKKKKKK....................",
      "..KSSSSSSSSK....................",
      "..KSGGSSSSSK....................",
      "..KSSSSSGGSK....................",
      "..KKKKKKKKKK....................",
      "......KK........................",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLB",
      "BLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLB",
      "BLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "DD..........................DD..",
      "DD..........................DD..",
      "DD......CCCCCCCC............DD..",
      "........CCCCCCCC................",
      "........C......C................",
    ],
    palette: { B: "#6b4a2a", L: "#a8793f", D: "#4a3218", K: "#1b1b1b", S: "#1e3a5c", G: "#6fd3ff", C: "#3a3a3a" },
    body: { x: 0, y: 6, w: 32, h: 8 },
  },
  bed: {
    key: "prop_bed",
    rows: [
      "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      "FHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHF",
      "FHPPPPPPPPPPPPHHHPPPPPPPPPPPPPHF",
      "FHPWWWWWWWWWWPHHHPWWWWWWWWWWWPHF",
      "FHPPPPPPPPPPPPHHHPPPPPPPPPPPPPHF",
      "FHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBbbbbbbbbbbbbbbbbbbbbbbBBBBF",
      "FBBBbBBBBBBBBBBBBBBBBBBBBBBbBBBF",
      "FBBBbBBBBBBBBBBBBBBBBBBBBBBbBBBF",
      "FBBBBbbbbbbbbbbbbbbbbbbbbbbBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBF",
      "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      "FF............................FF",
      "FF............................FF",
    ],
    palette: { F: "#6b4a2a", H: "#f4e9d8", P: "#dcdcdc", W: "#ffffff", B: "#2b7bd9", b: "#1f5fa8" },
    body: { x: 0, y: 0, w: 32, h: 22 },
  },
  pc: {
    key: "prop_pc",
    rows: [
      ".KKKKKKKKKKKKKKKKKKKKK..",
      ".KSSSSSSSSSSSSSSSSSSSK..",
      ".KSGGGGSSSSSSSSSSSSSSK..",
      ".KSSSSSSSSGGGGGGSSSSSK..",
      ".KSSGGGSSSSSSSSSSSSSSK..",
      ".KSSSSSSSSSSSSGGSSSSSK..",
      ".KSSSSSSSSSSSSSSSSSSSK..",
      ".KKKKKKKKKKKKKKKKKKKKK..",
      "..........KKK...........",
      ".......KKKKKKKKK........",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BLLLLLLLLLLLLLLLLLLLLLLB",
      "BLLLLLKKKKKKKKKKKLLLLLLB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "DD....................DD",
      "DD....................DD",
    ],
    palette: { K: "#1b1b1b", S: "#1e3a5c", G: "#6fd3ff", B: "#6b4a2a", L: "#a8793f", D: "#4a3218" },
    body: { x: 0, y: 8, w: 24, h: 8 },
  },
  shelf: {
    key: "prop_shelf",
    rows: [
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BRRRBGGGBYYYBRRRBBGGGBBB",
      "BRRRBGGGBYYYBRRRBBGGGBBB",
      "BRRRBGGGBYYYBRRRBBGGGBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BYYYBBRRRBBBGGGBYYYBRRRB",
      "BYYYBBRRRBBBGGGBYYYBRRRB",
      "BYYYBBRRRBBBGGGBYYYBRRRB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BGGGBRRRBBYYYBBBRRRBBGGB",
      "BGGGBRRRBBYYYBBBRRRBBGGB",
      "BGGGBRRRBBYYYBBBRRRBBGGB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBB",
    ],
    palette: { B: "#6b4a2a", R: "#d9452b", G: "#2d8f5a", Y: "#e0a526" },
    body: { x: 0, y: 0, w: 24, h: 16 },
  },
  plant: {
    key: "prop_plant",
    rows: [
      "....LL..LL....",
      "...LLLLLLLL...",
      "..LLLLLLLLLL..",
      "..LLLLDLLLLL..",
      "...LLLLLLLL...",
      "....LLLLLL....",
      "......TT......",
      ".....PPPP.....",
      "....PPPPPP....",
      "....PPPPPP....",
      "....PPPPPP....",
      ".....PPPP.....",
    ],
    palette: { L: "#2d8f5a", D: "#1f6b40", T: "#5a3a24", P: "#b5472b" },
    body: { x: 3, y: 6, w: 8, h: 6 },
  },
  sofa: {
    key: "prop_sofa",
    rows: [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCS",
      "SCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCS",
      "SCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSCCCCCCCCCCCCCCSSCCCCCCCCCCCCCCCCCCSSS",
      "SSSCCCCCCCCCCCCCCSSCCCCCCCCCCCCCCCCCCSSS",
      "SSSCCCCCCCCCCCCCCSSCCCCCCCCCCCCCCCCCCSSS",
      "SSSCCCCCCCCCCCCCCSSCCCCCCCCCCCCCCCCCCSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "DD....................................DD",
      "DD....................................DD",
    ],
    palette: { S: "#5a2fa8", C: "#8a5fd6", D: "#3a3a3a" },
    body: { x: 0, y: 0, w: 40, h: 12 },
  },
  counter: {
    key: "prop_counter",
    rows: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLB",
      "BLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLBBLLB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    ],
    palette: { W: "#dcdcdc", B: "#4f6f8f", L: "#9fc5e8", D: "#2c3e54" },
    body: { x: 0, y: 0, w: 48, h: 10 },
  },
  server: {
    key: "prop_server",
    rows: [
      "KKKKKKKKKKKKKKKK",
      "KGGKKKKKKKKKKRRK",
      "KKKKKKKKKKKKKKKK",
      "KGGKKKKKKKKKKGGK",
      "KKKKKKKKKKKKKKKK",
      "KRRKKKKKKKKKKGGK",
      "KKKKKKKKKKKKKKKK",
      "KGGKKKKKKKKKKGGK",
      "KKKKKKKKKKKKKKKK",
      "KGGKKKKKKKKKKRRK",
      "KKKKKKKKKKKKKKKK",
      "KGGKKKKKKKKKKGGK",
      "KKKKKKKKKKKKKKKK",
      "KKKKKKKKKKKKKKKK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KKKKKKKKKKKKKKKK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KKKKKKKKKKKKKKKK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KKKKKKKKKKKKKKKK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KHHHHHHHHHHHHHHK",
      "KKKKKKKKKKKKKKKK",
      "KKKKKKKKKKKKKKKK",
      "KKKKKKKKKKKKKKKK",
    ],
    palette: { K: "#2b2b2b", G: "#2dff7a", R: "#ff3b3b", H: "#3d3d3d" },
    body: { x: 0, y: 0, w: 16, h: 32 },
  },
  tv: {
    key: "prop_tv",
    rows: [
      "KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
      "KSSSSSSSSSSSSSSSSSSSSSSSSSSK",
      "KSSSSWWWSSSSSSSSSSSSSSSSSSSK",
      "KSSSSSSSSSSSSSWWWWWSSSSSSSSK",
      "KSSSSSSSSSSSSSSSSSSSSSSSSSSK",
      "KSSSSSSSSSWWSSSSSSSSSSSSSSSK",
      "KSSSSSSSSSSSSSSSSSSSSSSSSSSK",
      "KSSSSSSSSSSSSSSSSSSSSSSSSSSK",
      "KSSSSSSSSSSSSSSSSSSSSSSSSSSK",
      "KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
      "............KKKK............",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BLLLLLLLLLLLLLLLLLLLLLLLLLLB",
      "BLLLLLLLLLLLLLLLLLLLLLLLLLLB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "DD........................DD",
    ],
    palette: { K: "#1b1b1b", S: "#1e3a5c", W: "#ffd166", B: "#6b4a2a", L: "#a8793f", D: "#4a3218" },
    body: { x: 0, y: 10, w: 28, h: 6 },
  },
  fridge: {
    key: "prop_fridge",
    rows: [
      "WWWWWWWWWWWWWWWWWW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLKKLW",
      "WLLLLLLLLLLLLLKKLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WWWWWWWWWWWWWWWWWW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLKKLW",
      "WLLLLLLLLLLLLLKKLW",
      "WLLLLLLLLLLLLLKKLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WLLLLLLLLLLLLLLLLW",
      "WWWWWWWWWWWWWWWWWW",
      "WGGGGGGGGGGGGGGGGW",
      "WWWWWWWWWWWWWWWWWW",
      ".KK............KK.",
    ],
    palette: { W: "#b9b9b9", L: "#e8e8e8", K: "#4a4a4a", G: "#8a8a8a" },
    body: { x: 0, y: 8, w: 18, h: 18 },
  },
  board: {
    key: "prop_board",
    rows: [
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWB",
      "BWYYYWWWWRRRWWWWWGGGWWWWYYYWWWWB",
      "BWYYYWWWWRRRWWWWWGGGWWWWYYYWWWWB",
      "BWYYYWWWWRRRWWWWWGGGWWWWYYYWWWWB",
      "BWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWB",
      "BWWWWRRRWWWWWGGGWWWWWWWWRRRWWWWB",
      "BWWWWRRRWWWWWGGGWWWWWWWWRRRWWWWB",
      "BWWWWRRRWWWWWGGGWWWWWWWWRRRWWWWB",
      "BWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWB",
      "BWWKKKKKKKKKKKWWWWKKKKKKKKKWWWWB",
      "BWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWB",
      "BWWKKKKKKKWWWWWWWWKKKKKKKKKKKWWB",
      "BWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "..DD........................DD..",
      "..DD........................DD..",
    ],
    palette: { B: "#6b4a2a", W: "#f4efe6", Y: "#ffd166", R: "#ef476f", G: "#06d6a0", K: "#3a3a3a", D: "#4a3218" },
    body: { x: 0, y: 0, w: 32, h: 17 },
  },
};

export function generatePropCanvas(art: PropArt): HTMLCanvasElement {
  const w = Math.max(...art.rows.map((r) => r.length));
  const h = art.rows.length;
  const canvas = makeCanvas(w, h);
  drawPixels(ctxOf(canvas), 0, 0, art.rows, art.palette);
  return canvas;
}
