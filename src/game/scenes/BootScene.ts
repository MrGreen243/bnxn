import * as Phaser from "phaser";
import { NPCS } from "@/data/npcs";
import { CREW_MEMBERS } from "@/data/crew";
import { generateTileset, TILE } from "@/game/world/tileset";
import { CHAR_H, CHAR_W, charKey, generateCharacterSheet, generatePropCanvas, PROPS } from "@/game/world/sprites";

/** Generates every texture procedurally, then hands over to the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    this.textures.addCanvas("tiles", generateTileset());
    for (const art of Object.values(PROPS)) {
      if (!this.textures.exists(art.key)) this.textures.addCanvas(art.key, generatePropCanvas(art));
    }
    const palettes = new Set<string>();
    for (const n of NPCS) palettes.add(`${n.palette.skin}_${n.palette.hair}_${n.palette.outfit}`);
    for (const c of CREW_MEMBERS) palettes.add(`${c.palette.skin}_${c.palette.hair}_${c.palette.outfit}`);
    for (const key of palettes) {
      const [s, h, o] = key.split("_").map(Number) as [number, number, number];
      ensureCharacterTexture(this, s, h, o);
    }
    // a 1px white texture for simple shapes/particles
    const px = document.createElement("canvas");
    px.width = TILE;
    px.height = TILE;
    const ctx = px.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TILE, TILE);
    this.textures.addCanvas("white", px);
    this.scene.start("world");
  }
}

export function ensureCharacterTexture(scene: Phaser.Scene, skin: number, hair: number, outfit: number): string {
  const key = charKey(skin, hair, outfit);
  if (!scene.textures.exists(key)) {
    scene.textures.addSpriteSheet(key, generateCharacterSheet(skin, hair, outfit) as unknown as HTMLImageElement, { frameWidth: CHAR_W, frameHeight: CHAR_H });
    for (const [dir, row] of [["down", 0], ["left", 1], ["right", 2], ["up", 3]] as const) {
      scene.anims.create({ key: `${key}_walk_${dir}`, frames: scene.anims.generateFrameNumbers(key, { start: row * 3, end: row * 3 + 2 }), frameRate: 8, repeat: -1 });
      scene.anims.create({ key: `${key}_idle_${dir}`, frames: [{ key, frame: row * 3 }], frameRate: 1 });
    }
  }
  return key;
}
