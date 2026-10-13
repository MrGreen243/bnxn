import type { DistrictDef, DistrictMapDef, InteriorDef, MapBuildingDef } from "@/data/types";
import type { Requirement } from "@/types/game";
import type { InteractionTarget } from "@/game/engine/events";
import { BUILDING_PART, T, TILE, buildingTile } from "@/game/world/tileset";
import { hash2 } from "@/game/world/pixelArt";

export interface PropPlacement {
  kind: string;
  x: number; // pixels (top-left)
  y: number;
  label?: string;
  target?: InteractionTarget;
}

export interface LabelPlacement {
  text: string;
  x: number;
  y: number;
  kind: "building" | "sign";
}

export interface BuiltMap {
  width: number;
  height: number;
  ground: number[][];
  objects: number[][];
  interactables: InteractionTarget[];
  props: PropPlacement[];
  labels: LabelPlacement[];
  npcs: { npcId: string; x: number; y: number; wander: boolean }[];
  spawn: { x: number; y: number };
  exit: { x: number; y: number } | null;
  roads: { horizontal: number[]; vertical: number[] };
  waterTiles: { x: number; y: number }[];
  hqLevel?: number;
}

export type VisibilityCheck = (reqs: Requirement[] | undefined) => boolean;

function grid(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

const GROUND_TILE: Record<DistrictMapDef["groundTile"], number> = { dirt: T.DIRT, asphalt: T.ASPHALT, paved: T.PAVED, premium: T.PREMIUM };

export function buildDistrictMap(district: DistrictDef, isVisible: VisibilityCheck, hqLabel?: string): BuiltMap {
  const m = district.map;
  const ground = grid(m.width, m.height, GROUND_TILE[m.groundTile]);
  const objects = grid(m.width, m.height, T.EMPTY);
  const interactables: InteractionTarget[] = [];
  const props: PropPlacement[] = [];
  const labels: LabelPlacement[] = [];
  const waterTiles: { x: number; y: number }[] = [];
  const isRoad = grid(m.width, m.height, 0);

  for (const p of m.parks ?? []) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      if (!ground[y] || x >= m.width) continue;
      const n = hash2(x, y, 3);
      ground[y]![x] = n < 0.12 ? T.FLOWERS : n < 0.5 ? T.GRASS : T.GRASS2;
    }
  }
  for (const w of m.water ?? []) {
    for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) {
      if (!ground[y] || x >= m.width) continue;
      ground[y]![x] = (x + y) % 2 === 0 ? T.WATER : T.WATER2;
      objects[y]![x] = (x + y) % 2 === 0 ? T.WATER : T.WATER2;
      waterTiles.push({ x, y });
    }
  }
  // roads
  for (const r of m.roadsH) for (let y = r; y < r + 3; y++) for (let x = 0; x < m.width; x++) if (ground[y]) isRoad[y]![x] = 1;
  for (const c of m.roadsV) for (let x = c; x < c + 3; x++) for (let y = 0; y < m.height; y++) if (ground[y] && x < m.width) isRoad[y]![x] = 1;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!isRoad[y]![x]) continue;
      const inH = m.roadsH.some((r) => y >= r && y < r + 3);
      const inV = m.roadsV.some((c) => x >= c && x < c + 3);
      let tile: number = T.ROAD;
      if (inH && inV) tile = T.ROAD;
      else if (inH) {
        const r = m.roadsH.find((rr) => y >= rr && y < rr + 3)!;
        tile = y === r ? T.ROAD_EDGE_T : y === r + 2 ? T.ROAD_EDGE_B : x % 2 === 0 ? T.ROAD_LINE : T.ROAD;
      } else if (inV) {
        const c = m.roadsV.find((cc) => x >= cc && x < cc + 3)!;
        tile = x === c ? T.ROAD_EDGE_L : x === c + 2 ? T.ROAD_EDGE_R : T.ROAD;
      }
      ground[y]![x] = tile;
    }
  }
  // crossings at intersections edges
  for (const r of m.roadsH) for (const c of m.roadsV) {
    for (let y = r; y < r + 3; y++) {
      if (ground[y] && c - 1 >= 0) ground[y]![c - 1] = T.CROSSING;
      if (ground[y] && c + 3 < m.width) ground[y]![c + 3] = T.CROSSING;
    }
  }
  // sidewalks
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    if (isRoad[y]![x] || ground[y]![x] === T.CROSSING) continue;
    const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => isRoad[y + dy!]?.[x + dx!] === 1);
    if (near && ground[y]![x] !== T.WATER && ground[y]![x] !== T.WATER2 && ground[y]![x] !== T.GRASS && ground[y]![x] !== T.GRASS2 && ground[y]![x] !== T.FLOWERS) ground[y]![x] = T.SIDEWALK;
  }

  for (const b of m.buildings) {
    if (!isVisible(b.requirements)) continue;
    placeBuilding(objects, b, m);
    const doorX = b.x + Math.floor(b.w / 2);
    const target: InteractionTarget = {
      id: `building:${b.id}`,
      kind: "building",
      label: b.id === "hq" && hqLabel ? hqLabel : b.label,
      actions: b.actions,
      x: doorX * TILE + TILE / 2,
      y: (b.y + b.h) * TILE + TILE / 2,
    };
    interactables.push(target);
    labels.push({ text: target.label, x: (b.x + b.w / 2) * TILE, y: b.y * TILE - 3, kind: "building" });
  }
  for (const p of m.props) {
    const placement: PropPlacement = { kind: p.kind, x: p.x * TILE, y: p.y * TILE, label: p.label };
    if (p.kind === "billboard") {
      placement.target = {
        id: `billboard:${p.x}_${p.y}`,
        kind: "prop",
        label: "Billboard",
        actions: [{ type: "custom", id: "ad_click", label: "Look closer" }],
        x: p.x * TILE + 28,
        y: p.y * TILE + 44,
      };
      interactables.push(placement.target);
    }
    if (p.kind === "sign" && p.label) labels.push({ text: p.label, x: p.x * TILE + 10, y: p.y * TILE + 2, kind: "sign" });
    props.push(placement);
  }
  return {
    width: m.width,
    height: m.height,
    ground,
    objects,
    interactables,
    props,
    labels,
    npcs: m.npcs.map((n) => ({ npcId: n.npcId, x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE / 2, wander: n.wander ?? true })),
    spawn: { x: m.spawn.x * TILE + TILE / 2, y: m.spawn.y * TILE + TILE / 2 },
    exit: null,
    roads: { horizontal: m.roadsH, vertical: m.roadsV },
    waterTiles,
  };
}

function placeBuilding(objects: number[][], b: MapBuildingDef, m: DistrictMapDef) {
  const roofRows = Math.max(1, Math.floor(b.h * 0.4));
  const isShop = ["shop", "cafe", "bar", "market", "barber", "restaurant", "club", "mall"].includes(b.kind);
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      if (y >= m.height || x >= m.width) continue;
      const row = y - b.y;
      let part: number;
      if (row === 0) part = BUILDING_PART.ROOF_EDGE;
      else if (row < roofRows) part = BUILDING_PART.ROOF;
      else if (row === roofRows && isShop) part = BUILDING_PART.AWNING;
      else if (row === b.h - 1) part = x === b.x + Math.floor(b.w / 2) ? BUILDING_PART.DOOR : (x - b.x) % 2 === 1 && b.w > 3 ? BUILDING_PART.WINDOW : BUILDING_PART.WALL;
      else part = (x - b.x) % 2 === 1 ? BUILDING_PART.WINDOW : BUILDING_PART.WALL;
      objects[y]![x] = buildingTile(b.palette, part);
    }
  }
}

const FLOOR_TILE: Record<InteriorDef["floor"], number> = { wood: T.FLOOR_WOOD, tile: T.FLOOR_TILE, concrete: T.FLOOR_CONCRETE, carpet: T.FLOOR_CARPET };

export function buildInteriorMap(interior: InteriorDef, isVisible: VisibilityCheck, hqLevel = 0): BuiltMap {
  const w = interior.width;
  const h = interior.height;
  const ground = grid(w, h, FLOOR_TILE[interior.floor]);
  const objects = grid(w, h, T.EMPTY);
  for (let x = 0; x < w; x++) {
    objects[0]![x] = T.INT_WALL_TOP;
    objects[1]![x] = T.INT_WALL;
    objects[h - 1]![x] = T.INT_WALL_TOP;
  }
  for (let y = 0; y < h; y++) {
    objects[y]![0] = T.INT_WALL_TOP;
    objects[y]![w - 1] = T.INT_WALL_TOP;
  }
  objects[interior.exit.y]![interior.exit.x] = T.EMPTY;
  ground[interior.exit.y]![interior.exit.x] = T.INT_DOOR;
  const interactables: InteractionTarget[] = [];
  const props: PropPlacement[] = [];
  const labels: LabelPlacement[] = [];
  for (const p of interior.props) {
    if (!isVisible(p.requirements)) continue;
    const placement: PropPlacement = { kind: p.kind, x: p.x * TILE, y: p.y * TILE, label: p.label };
    if (p.actions && p.actions.length) {
      placement.target = {
        id: `prop:${interior.id}:${p.x}_${p.y}`,
        kind: "prop",
        label: p.label ?? p.kind,
        actions: p.actions,
        x: p.x * TILE + 12,
        y: p.y * TILE + 14,
      };
      interactables.push(placement.target);
    }
    props.push(placement);
  }
  interactables.push({ id: "exit", kind: "exit", label: "Leave", actions: [{ type: "custom", id: "exit", label: "Go outside" }], x: interior.exit.x * TILE + TILE / 2, y: interior.exit.y * TILE + TILE / 2 });
  labels.push({ text: interior.name, x: (w / 2) * TILE, y: 6, kind: "sign" });
  return {
    width: w,
    height: h,
    ground,
    objects,
    interactables,
    props,
    labels,
    npcs: (interior.npcs ?? []).map((n) => ({ npcId: n.npcId, x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE / 2, wander: false })),
    spawn: { x: interior.spawn.x * TILE + TILE / 2, y: interior.spawn.y * TILE + TILE / 2 },
    exit: { x: interior.exit.x * TILE + TILE / 2, y: interior.exit.y * TILE + TILE / 2 },
    roads: { horizontal: [], vertical: [] },
    waterTiles: [],
    hqLevel,
  };
}
