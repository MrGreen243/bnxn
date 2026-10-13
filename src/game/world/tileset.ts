import { ctxOf, hash2, makeCanvas, shade } from "@/game/world/pixelArt";

export const TILE = 16;

/** Building colour palettes (index referenced by map data). */
export const BUILDING_PALETTES: { wall: string; roof: string; trim: string; door: string }[] = [
  { wall: "#c9a36b", roof: "#7a4a2a", trim: "#f2d7a3", door: "#4a2d1a" }, // 0 home
  { wall: "#e7c27d", roof: "#b5472b", trim: "#fff1c9", door: "#5b3a1e" }, // 1 bakery / food
  { wall: "#6c7a9c", roof: "#2f3b5c", trim: "#a9b8e0", door: "#1f2740" }, // 2 cafe / electronics
  { wall: "#b56c5a", roof: "#6b2f2a", trim: "#e8a99a", door: "#3d1b17" }, // 3 kiosk / shop
  { wall: "#5a3f6e", roof: "#2d1f3c", trim: "#c38ee0", door: "#1a1024" }, // 4 bar / club
  { wall: "#8fa05a", roof: "#4f5e2a", trim: "#d2e09a", door: "#2d3616" }, // 5 market
  { wall: "#d08aa8", roof: "#7c3b5a", trim: "#f6c6da", door: "#4a1f35" }, // 6 barber / fashion
  { wall: "#8b8b8b", roof: "#4a4a4a", trim: "#c7c7c7", door: "#2a2a2a" }, // 7 mechanic
  { wall: "#efe7d6", roof: "#9c7a4a", trim: "#fff9ea", door: "#5e4428" }, // 8 church / school
  { wall: "#4f6f8f", roof: "#223548", trim: "#9fc5e8", door: "#15202c" }, // 9 hq / office
  { wall: "#7a9c8e", roof: "#3c5a50", trim: "#bfe0d2", door: "#223630" }, // 10 gym / studio
  { wall: "#d9d1c2", roof: "#6d6356", trim: "#f4efe6", door: "#3f3830" }, // 11 bank
  { wall: "#b89670", roof: "#6a5035", trim: "#e5d1ad", door: "#3e2d1d" }, // 12 residential
  { wall: "#a37f4f", roof: "#5e4426", trim: "#d9b784", door: "#3a2814" }, // 13 venue / park
  { wall: "#dfe6ee", roof: "#5e7a9a", trim: "#ffffff", door: "#2c3e54" }, // 14 luxury glass
];

/** Tile indices in the generated tileset. */
export const T = {
  EMPTY: -1,
  DIRT: 0,
  ASPHALT: 1,
  PAVED: 2,
  PREMIUM: 3,
  GRASS: 4,
  GRASS2: 5,
  WATER: 6,
  WATER2: 7,
  SIDEWALK: 8,
  ROAD: 9,
  ROAD_LINE: 10,
  ROAD_EDGE_T: 11,
  ROAD_EDGE_B: 12,
  ROAD_EDGE_L: 13,
  ROAD_EDGE_R: 14,
  CROSSING: 15,
  FLOOR_WOOD: 16,
  FLOOR_TILE: 17,
  FLOOR_CONCRETE: 18,
  FLOOR_CARPET: 19,
  INT_WALL: 20,
  INT_WALL_TOP: 21,
  INT_DOOR: 22,
  FLOWERS: 23,
  BUILDING_BASE: 24, // + palette*6 + part
} as const;

export const BUILDING_PART = { ROOF_EDGE: 0, ROOF: 1, WALL: 2, WINDOW: 3, DOOR: 4, AWNING: 5 } as const;

export function buildingTile(palette: number, part: number): number {
  return T.BUILDING_BASE + palette * 6 + part;
}

export const TILE_COUNT = T.BUILDING_BASE + BUILDING_PALETTES.length * 6;
export const TILESET_COLS = 16;

function fillNoise(ctx: CanvasRenderingContext2D, x0: number, y0: number, base: string, variance: number, seed: number) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = hash2(x, y, seed);
      ctx.fillStyle = shade(base, Math.round((n - 0.5) * variance));
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

function tilePos(index: number): [number, number] {
  return [(index % TILESET_COLS) * TILE, Math.floor(index / TILESET_COLS) * TILE];
}

/** Renders the whole tileset into a canvas (one pass at boot). */
export function generateTileset(): HTMLCanvasElement {
  const rows = Math.ceil(TILE_COUNT / TILESET_COLS);
  const canvas = makeCanvas(TILESET_COLS * TILE, rows * TILE);
  const ctx = ctxOf(canvas);

  const draw = (index: number, fn: (x: number, y: number) => void) => {
    const [x, y] = tilePos(index);
    fn(x, y);
  };

  draw(T.DIRT, (x, y) => {
    fillNoise(ctx, x, y, "#9a7a52", 22, 1);
    ctx.fillStyle = "#7f6241";
    for (let i = 0; i < 5; i++) ctx.fillRect(x + Math.floor(hash2(i, 1, 3) * 15), y + Math.floor(hash2(i, 2, 3) * 15), 1, 1);
  });
  draw(T.ASPHALT, (x, y) => fillNoise(ctx, x, y, "#6a665f", 14, 2));
  draw(T.PAVED, (x, y) => {
    fillNoise(ctx, x, y, "#a19a8d", 10, 4);
    ctx.fillStyle = "#8d8679";
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x + 7, y, 1, 16);
  });
  draw(T.PREMIUM, (x, y) => {
    fillNoise(ctx, x, y, "#c9c0ad", 8, 5);
    ctx.fillStyle = "#b3aa97";
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x + 7, y, 1, 16);
    ctx.fillStyle = "#d9d1bf";
    ctx.fillRect(x + 1, y + 1, 1, 1);
  });
  draw(T.GRASS, (x, y) => {
    fillNoise(ctx, x, y, "#5d8a3c", 18, 6);
    ctx.fillStyle = "#79a650";
    for (let i = 0; i < 6; i++) ctx.fillRect(x + Math.floor(hash2(i, 5, 9) * 15), y + Math.floor(hash2(i, 6, 9) * 15), 1, 2);
  });
  draw(T.GRASS2, (x, y) => {
    fillNoise(ctx, x, y, "#557f36", 18, 7);
    ctx.fillStyle = "#86b45a";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.floor(hash2(i, 8, 9) * 15), y + Math.floor(hash2(i, 9, 9) * 15), 2, 1);
  });
  draw(T.WATER, (x, y) => {
    fillNoise(ctx, x, y, "#2d6fa3", 12, 11);
    ctx.fillStyle = "#5c9fd1";
    ctx.fillRect(x + 2, y + 4, 5, 1);
    ctx.fillRect(x + 9, y + 11, 4, 1);
  });
  draw(T.WATER2, (x, y) => {
    fillNoise(ctx, x, y, "#2b6a9c", 12, 12);
    ctx.fillStyle = "#5c9fd1";
    ctx.fillRect(x + 8, y + 3, 5, 1);
    ctx.fillRect(x + 1, y + 12, 4, 1);
  });
  draw(T.SIDEWALK, (x, y) => {
    fillNoise(ctx, x, y, "#b9b0a1", 8, 13);
    ctx.fillStyle = "#a69d8e";
    ctx.fillRect(x, y + 15, 16, 1);
    ctx.fillRect(x + 15, y, 1, 16);
  });
  draw(T.ROAD, (x, y) => fillNoise(ctx, x, y, "#3f3f45", 10, 14));
  draw(T.ROAD_LINE, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 15);
    ctx.fillStyle = "#e6c84a";
    ctx.fillRect(x + 2, y + 7, 5, 2);
    ctx.fillRect(x + 10, y + 7, 5, 2);
  });
  draw(T.ROAD_EDGE_T, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 16);
    ctx.fillStyle = "#8f8a80";
    ctx.fillRect(x, y, 16, 2);
  });
  draw(T.ROAD_EDGE_B, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 17);
    ctx.fillStyle = "#8f8a80";
    ctx.fillRect(x, y + 14, 16, 2);
  });
  draw(T.ROAD_EDGE_L, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 18);
    ctx.fillStyle = "#8f8a80";
    ctx.fillRect(x, y, 2, 16);
  });
  draw(T.ROAD_EDGE_R, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 19);
    ctx.fillStyle = "#8f8a80";
    ctx.fillRect(x + 14, y, 2, 16);
  });
  draw(T.CROSSING, (x, y) => {
    fillNoise(ctx, x, y, "#3f3f45", 10, 20);
    ctx.fillStyle = "#d8d8d8";
    for (let i = 0; i < 16; i += 4) ctx.fillRect(x + i, y, 2, 16);
  });
  draw(T.FLOOR_WOOD, (x, y) => {
    fillNoise(ctx, x, y, "#a8793f", 12, 21);
    ctx.fillStyle = "#8a6232";
    ctx.fillRect(x, y + 3, 16, 1);
    ctx.fillRect(x, y + 11, 16, 1);
    ctx.fillRect(x + 5, y, 1, 4);
    ctx.fillRect(x + 12, y + 4, 1, 8);
  });
  draw(T.FLOOR_TILE, (x, y) => {
    fillNoise(ctx, x, y, "#d6dde2", 8, 22);
    ctx.fillStyle = "#b8c2ca";
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x + 7, y, 1, 16);
  });
  draw(T.FLOOR_CONCRETE, (x, y) => fillNoise(ctx, x, y, "#8e8c86", 10, 23));
  draw(T.FLOOR_CARPET, (x, y) => {
    fillNoise(ctx, x, y, "#5a3f6e", 10, 24);
    ctx.fillStyle = "#6c4c84";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.floor(hash2(i, 3, 25) * 15), y + Math.floor(hash2(i, 4, 25) * 15), 1, 1);
  });
  draw(T.INT_WALL, (x, y) => {
    fillNoise(ctx, x, y, "#8aa0b3", 6, 26);
    ctx.fillStyle = "#6f8599";
    ctx.fillRect(x, y + 12, 16, 4);
  });
  draw(T.INT_WALL_TOP, (x, y) => {
    fillNoise(ctx, x, y, "#3a4652", 6, 27);
  });
  draw(T.INT_DOOR, (x, y) => {
    fillNoise(ctx, x, y, "#8e8c86", 10, 28);
    ctx.fillStyle = "#5e4428";
    ctx.fillRect(x + 3, y, 10, 14);
    ctx.fillStyle = "#e6c84a";
    ctx.fillRect(x + 10, y + 7, 1, 1);
  });
  draw(T.FLOWERS, (x, y) => {
    fillNoise(ctx, x, y, "#5d8a3c", 18, 29);
    const colors = ["#f15bb5", "#ffd166", "#ef476f", "#ffffff"];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fillRect(x + Math.floor(hash2(i, 7, 31) * 14) + 1, y + Math.floor(hash2(i, 8, 31) * 14) + 1, 1, 1);
    }
  });

  BUILDING_PALETTES.forEach((p, pi) => {
    draw(buildingTile(pi, BUILDING_PART.ROOF_EDGE), (x, y) => {
      fillNoise(ctx, x, y, p.roof, 8, 40 + pi);
      ctx.fillStyle = shade(p.roof, 30);
      ctx.fillRect(x, y, 16, 2);
      ctx.fillStyle = shade(p.roof, -25);
      ctx.fillRect(x, y + 14, 16, 2);
    });
    draw(buildingTile(pi, BUILDING_PART.ROOF), (x, y) => {
      fillNoise(ctx, x, y, p.roof, 8, 60 + pi);
      ctx.fillStyle = shade(p.roof, -18);
      ctx.fillRect(x, y + 7, 16, 1);
      ctx.fillRect(x + 7, y, 1, 7);
      ctx.fillRect(x + 3, y + 8, 1, 8);
    });
    draw(buildingTile(pi, BUILDING_PART.WALL), (x, y) => {
      fillNoise(ctx, x, y, p.wall, 8, 80 + pi);
      ctx.fillStyle = shade(p.wall, -14);
      ctx.fillRect(x, y + 5, 16, 1);
      ctx.fillRect(x, y + 11, 16, 1);
    });
    draw(buildingTile(pi, BUILDING_PART.WINDOW), (x, y) => {
      fillNoise(ctx, x, y, p.wall, 8, 100 + pi);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 3, y + 3, 10, 9);
      ctx.fillStyle = "#1e2a3a";
      ctx.fillRect(x + 4, y + 4, 8, 7);
      ctx.fillStyle = "#6fa3d8";
      ctx.fillRect(x + 5, y + 5, 3, 2);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 7, y + 4, 1, 7);
    });
    draw(buildingTile(pi, BUILDING_PART.DOOR), (x, y) => {
      fillNoise(ctx, x, y, p.wall, 8, 120 + pi);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 3, y + 1, 10, 15);
      ctx.fillStyle = p.door;
      ctx.fillRect(x + 4, y + 2, 8, 14);
      ctx.fillStyle = "#e6c84a";
      ctx.fillRect(x + 10, y + 9, 1, 1);
      ctx.fillStyle = shade(p.door, 30);
      ctx.fillRect(x + 5, y + 3, 6, 3);
    });
    draw(buildingTile(pi, BUILDING_PART.AWNING), (x, y) => {
      fillNoise(ctx, x, y, p.wall, 8, 140 + pi);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x, y + 4, 16, 3);
      ctx.fillStyle = p.roof;
      for (let i = 0; i < 16; i += 4) ctx.fillRect(x + i, y + 4, 2, 3);
      ctx.fillStyle = shade(p.wall, -30);
      ctx.fillRect(x, y + 7, 16, 1);
    });
  });

  return canvas;
}
