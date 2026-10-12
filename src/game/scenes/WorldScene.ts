import * as Phaser from "phaser";
import { DISTRICT_MAP, INTERIOR_MAP } from "@/data/districts";
import { NPC_MAP } from "@/data/npcs";
import { CREW_MEMBER_MAP } from "@/data/crew";
import { BALANCE } from "@/data/balance";
import type { Requirement } from "@/types/game";
import { gameEvents, type InteractionTarget } from "@/game/engine/events";
import { buildDistrictMap, buildInteriorMap, type BuiltMap } from "@/game/world/mapBuilder";
import { TILE, T, TILE_COUNT, TILESET_COLS } from "@/game/world/tileset";
import { PROPS } from "@/game/world/sprites";
import { ensureCharacterTexture } from "@/game/scenes/BootScene";
import { useGameStore } from "@/store/gameStore";
import { checkAll } from "@/simulation/requirements";
import { selectCampaign, recordImpression, resolveImageUrl, loadAds } from "@/ads/adService";
import type { AdCampaign } from "@/schemas/ads";

const SPEED = 78;
const INTERACT_RADIUS = 26;

interface NpcActor {
  sprite: Phaser.Physics.Arcade.Sprite;
  key: string;
  home: { x: number; y: number };
  nextMoveAt: number;
  target: { x: number; y: number } | null;
  wander: boolean;
  label: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerKey = "";
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private joystick = { x: 0, y: 0 };
  private moveTarget: { x: number; y: number } | null = null;
  private moveStuckSince = 0;
  private built: BuiltMap | null = null;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private npcs: NpcActor[] = [];
  private interactables: InteractionTarget[] = [];
  private currentPrompt: InteractionTarget | null = null;
  private lastPromptCheck = 0;
  private lastPositionEmit = 0;
  private lastPos = { x: 0, y: 0 };
  private facing: "down" | "up" | "left" | "right" = "down";
  private location = { districtId: "mainland", interiorId: null as string | null };
  private unsubscribers: (() => void)[] = [];
  private propsGroup?: Phaser.Physics.Arcade.StaticGroup;
  private objectsLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private map?: Phaser.Tilemaps.Tilemap;
  private danfos: { sprite: Phaser.GameObjects.Image; dir: number; minX: number; maxX: number; speed: number }[] = [];
  private waterTimer = 0;
  private billboardAd: AdCampaign | null = null;
  private paused = false;
  private exitCooldownUntil = 0;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  constructor() {
    super("world");
  }

  create() {
    this.physics.world.setBoundsCollision(true, true, true, true);
    const kb = this.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.wasd = kb.addKeys({ W: "W", A: "A", S: "S", D: "D", E: "E", SPACE: "SPACE", ENTER: "ENTER" }) as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on("keydown-E", () => this.activate());
      kb.on("keydown-SPACE", () => this.activate());
      kb.on("keydown-ENTER", () => this.activate());
      kb.disableGlobalCapture();
    }
    this.unsubscribers.push(
      gameEvents.on("input:joystick", (v) => {
        this.joystick = v;
        if (v.x || v.y) this.moveTarget = null;
      }),
      gameEvents.on("input:action", () => this.activate()),
      gameEvents.on("world:setLocation", (loc) => this.loadLocation(loc.districtId, loc.interiorId, loc.x, loc.y)),
      gameEvents.on("world:pause", ({ paused }) => {
        this.paused = paused;
        if (paused) this.player?.setVelocity(0, 0);
      }),
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.scale.on("resize", () => this.applyZoom());
    const game = useGameStore.getState().game;
    const loc = game ? { districtId: game.player.districtId, interiorId: game.player.interiorId } : { districtId: "mainland", interiorId: null };
    const pos = game?.player.position;
    this.loadLocation(loc.districtId, loc.interiorId, pos?.x, pos?.y);
    this.events.once("shutdown", () => this.cleanup());
    this.events.once("destroy", () => this.cleanup());
  }

  private cleanup() {
    for (const u of this.unsubscribers) u();
    this.unsubscribers = [];
  }

  private isVisible = (reqs: Requirement[] | undefined) => {
    const game = useGameStore.getState().game;
    if (!game) return !reqs || reqs.length === 0;
    return checkAll(game, reqs);
  };

  private clearWorld() {
    for (const c of this.colliders) c.destroy();
    this.colliders = [];
    for (const o of this.worldObjects) o.destroy();
    this.worldObjects = [];
    for (const n of this.npcs) {
      n.sprite.destroy();
      n.label.destroy();
    }
    this.npcs = [];
    this.danfos = [];
    this.propsGroup?.clear(true, true);
    this.propsGroup?.destroy();
    this.propsGroup = undefined;
    this.objectsLayer?.destroy();
    this.groundLayer?.destroy();
    this.map?.destroy();
    this.objectsLayer = undefined;
    this.groundLayer = undefined;
    this.map = undefined;
    this.interactables = [];
    this.currentPrompt = null;
    gameEvents.emit("interaction:prompt", { target: null });
  }

  loadLocation(districtId: string, interiorId: string | null, x?: number, y?: number) {
    this.clearWorld();
    this.location = { districtId, interiorId };
    const game = useGameStore.getState().game;
    const hqLevel = game?.hk.hqLevel ?? 0;
    let built: BuiltMap;
    if (interiorId) {
      const interior = INTERIOR_MAP[interiorId];
      if (!interior) {
        this.loadLocation(districtId, null);
        return;
      }
      built = buildInteriorMap(interior, this.isVisible, hqLevel);
    } else {
      const district = DISTRICT_MAP[districtId] ?? DISTRICT_MAP.mainland!;
      const hqLabel = hqLevel > 0 ? `HK HQ — ${BALANCE.hk.hqNames[hqLevel]}` : game?.hk.unlocked ? "Vacant Lot (HK)" : "Vacant Lot";
      built = buildDistrictMap(district, this.isVisible, hqLabel);
    }
    this.built = built;
    this.interactables = built.interactables;
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: built.width, height: built.height });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE, TILE, 0, 0);
    if (!tileset) throw new Error("tileset missing");
    const ground = map.createBlankLayer("ground", tileset);
    const objects = map.createBlankLayer("objects", tileset);
    if (!ground || !objects) throw new Error("layers missing");
    ground.putTilesAt(built.ground, 0, 0);
    objects.putTilesAt(built.objects.map((row) => row.map((t) => (t === -1 ? -1 : t))), 0, 0);
    objects.setCollisionByExclusion([-1]);
    ground.setDepth(0);
    objects.setDepth(1);
    this.map = map;
    this.groundLayer = ground;
    this.objectsLayer = objects;
    void TILE_COUNT;
    void TILESET_COLS;

    this.propsGroup = this.physics.add.staticGroup();
    for (const p of built.props) {
      const art = PROPS[p.kind];
      if (!art) continue;
      const img = this.add.image(p.x, p.y, art.key).setOrigin(0, 0);
      img.setDepth(p.y + img.height);
      this.worldObjects.push(img);
      if (art.body) {
        const body = this.add.rectangle(p.x + art.body.x + art.body.w / 2, p.y + art.body.y + art.body.h / 2, art.body.w, art.body.h);
        this.physics.add.existing(body, true);
        this.propsGroup.add(body);
        this.worldObjects.push(body);
      }
      if (p.kind === "danfo") {
        const roadRow = built.roads.horizontal.find((r) => Math.abs(r * TILE - p.y) < TILE * 3);
        if (roadRow !== undefined) {
          img.setDepth(5);
          this.danfos.push({ sprite: img, dir: 1, minX: 8, maxX: built.width * TILE - 40, speed: 22 + this.danfos.length * 7 });
        }
      }
      if (p.kind === "billboard") this.decorateBillboard(img, p.x, p.y, districtId);
    }
    for (const l of built.labels) {
      const text = this.add
        .text(l.x, l.y, l.text, {
          fontFamily: "'Courier New', monospace",
          fontSize: l.kind === "building" ? "6px" : "5px",
          color: l.kind === "building" ? "#fff2cc" : "#eef5e8",
          backgroundColor: l.kind === "building" ? "#1b1b22cc" : "#2d6b3acc",
          padding: { x: 2, y: 1 },
          resolution: 6,
        })
        .setOrigin(0.5, l.kind === "building" ? 1 : 0)
        .setDepth(10_000);
      this.worldObjects.push(text);
    }

    // player
    const avatar = game?.player.avatar ?? { skin: 1, hair: 0, outfit: 2 };
    this.playerKey = ensureCharacterTexture(this, avatar.skin, avatar.hair, avatar.outfit);
    const spawnX = x ?? built.spawn.x;
    const spawnY = y ?? built.spawn.y;
    const inBounds = spawnX > 0 && spawnY > 0 && spawnX < built.width * TILE && spawnY < built.height * TILE;
    const px = inBounds ? spawnX : built.spawn.x;
    const py = inBounds ? spawnY : built.spawn.y;
    if (!this.player) {
      this.player = this.physics.add.sprite(px, py, this.playerKey, 0);
      this.player.setCollideWorldBounds(true);
      this.player.body!.setSize(10, 8).setOffset(3, 16);
    } else {
      this.player.setTexture(this.playerKey, 0);
      this.player.setPosition(px, py);
      this.player.setVelocity(0, 0);
    }
    this.player.setDepth(py + 24);
    this.player.anims.play(`${this.playerKey}_idle_down`, true);
    this.physics.world.setBounds(0, 0, built.width * TILE, built.height * TILE);
    this.colliders.push(this.physics.add.collider(this.player, objects), this.physics.add.collider(this.player, this.propsGroup));
    // If the saved position was inside something solid, snap to spawn.
    this.time.delayedCall(50, () => {
      if (!this.player || !this.built) return;
      const tile = this.objectsLayer?.getTileAtWorldXY(this.player.x, this.player.y + 4);
      if (tile && tile.index !== -1) this.player.setPosition(this.built.spawn.x, this.built.spawn.y);
    });

    // NPCs
    for (const n of built.npcs) {
      const def = NPC_MAP[n.npcId];
      if (!def) continue;
      const key = ensureCharacterTexture(this, def.palette.skin, def.palette.hair, def.palette.outfit);
      const sprite = this.physics.add.sprite(n.x, n.y, key, 0);
      sprite.setImmovable(true);
      sprite.body!.setSize(10, 8).setOffset(3, 16);
      sprite.anims.play(`${key}_idle_down`);
      sprite.setDepth(n.y + 24);
      const label = this.add.text(n.x, n.y - 14, def.name.split(" ")[0] ?? def.name, { fontFamily: "'Courier New', monospace", fontSize: "5px", color: "#ffe9a8", resolution: 6 }).setOrigin(0.5, 1).setDepth(10_000);
      this.colliders.push(this.physics.add.collider(this.player, sprite));
      this.npcs.push({ sprite, key, home: { x: n.x, y: n.y }, nextMoveAt: this.time.now + 1500 + Math.random() * 3000, target: null, wander: n.wander, label });
      this.interactables.push({ id: `npc:${def.id}`, kind: "npc", label: def.name, actions: [{ type: "talk", npcId: def.id }], x: n.x, y: n.y, npcId: def.id });
    }
    // Crew members hanging around the HQ interior
    if (interiorId === "hq" && game) {
      game.hk.members.slice(0, 8).forEach((m, i) => {
        const def = CREW_MEMBER_MAP[m.defId];
        if (!def) return;
        const key = ensureCharacterTexture(this, def.palette.skin, def.palette.hair, def.palette.outfit);
        const cx = (5 + (i % 4) * 3) * TILE + 12;
        const cy = (3 + Math.floor(i / 4) * 4) * TILE + 30;
        const sprite = this.physics.add.sprite(cx, cy, key, 0).setImmovable(true);
        sprite.anims.play(`${key}_idle_up`);
        sprite.setDepth(cy + 24);
        const label = this.add.text(cx, cy - 14, def.nickname, { fontFamily: "'Courier New', monospace", fontSize: "5px", color: "#bfe0d2", resolution: 6 }).setOrigin(0.5, 1).setDepth(10_000);
        this.colliders.push(this.physics.add.collider(this.player, sprite));
        this.npcs.push({ sprite, key, home: { x: cx, y: cy }, nextMoveAt: Infinity, target: null, wander: false, label });
      });
    }

    this.cameras.main.setBounds(0, 0, built.width * TILE, built.height * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.applyZoom();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.moveTarget = null;
    this.exitCooldownUntil = this.time.now + 800;
    gameEvents.emit("world:ready", { districtId, interiorId });
    gameEvents.emit("player:moved", { x: px, y: py, districtId, interiorId });
  }

  private applyZoom() {
    const game = useGameStore.getState().game;
    const w = this.scale.width;
    const base = game?.settings.pixelScale ?? 3;
    const zoom = w < 480 ? Math.max(2, base - 0.5) : base;
    this.cameras.main.setZoom(zoom);
  }

  private decorateBillboard(img: Phaser.GameObjects.Image, x: number, y: number, districtId: string) {
    const game = useGameStore.getState().game;
    if (!game?.settings.adsEnabled) {
      const t = this.add.text(x + 28, y + 16, "YOUR AD\nHERE", { fontFamily: "'Courier New', monospace", fontSize: "7px", color: "#6b6b7a", align: "center", resolution: 6 }).setOrigin(0.5).setDepth(img.depth + 1);
      this.worldObjects.push(t);
      return;
    }
    void loadAds().then(() => {
      if (!this.scene.isActive()) return;
      const ad = selectCampaign("billboard", { districtId, device: this.scale.width < 768 ? "mobile" : "desktop", now: Date.now() });
      this.billboardAd = ad;
      if (!ad) {
        const t = this.add.text(x + 28, y + 16, "ADVERTISE\nHERE", { fontFamily: "'Courier New', monospace", fontSize: "7px", color: "#8a8aa0", align: "center", resolution: 6 }).setOrigin(0.5).setDepth(img.depth + 1);
        this.worldObjects.push(t);
        return;
      }
      recordImpression(ad.id);
      const drawText = () => {
        const t = this.add.text(x + 28, y + 16, `${ad.headline}\n— ${ad.advertiserName}`, { fontFamily: "'Courier New', monospace", fontSize: "5px", color: "#ffe9a8", align: "center", wordWrap: { width: 50 }, resolution: 6 }).setOrigin(0.5).setDepth(img.depth + 1);
        this.worldObjects.push(t);
        const sponsored = this.add.text(x + 2, y + 1, "AD", { fontFamily: "'Courier New', monospace", fontSize: "4px", color: "#e0a526", resolution: 6 }).setDepth(img.depth + 2);
        this.worldObjects.push(sponsored);
      };
      const src = resolveImageUrl(ad.imageUrl);
      if (!src) {
        drawText();
        return;
      }
      const key = `ad_${ad.id}`;
      const place = () => {
        if (!this.scene.isActive()) return;
        const pic = this.add.image(x + 28, y + 16, key).setDepth(img.depth + 1);
        const scale = Math.min(54 / pic.width, 28 / pic.height);
        pic.setScale(scale);
        this.worldObjects.push(pic);
        const sponsored = this.add.text(x + 2, y + 1, "AD", { fontFamily: "'Courier New', monospace", fontSize: "4px", color: "#e0a526", resolution: 6 }).setDepth(img.depth + 2);
        this.worldObjects.push(sponsored);
      };
      if (this.textures.exists(key)) {
        place();
        return;
      }
      this.load.crossOrigin = "anonymous";
      this.load.image(key, src);
      this.load.once(`filecomplete-image-${key}`, place);
      this.load.once("loaderror", () => drawText());
      this.load.start();
    });
  }

  getBillboardAd(): AdCampaign | null {
    return this.billboardAd;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.paused || !this.built) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    // tapping an interactable that's in range activates it
    const near = this.interactables.find((t) => Phaser.Math.Distance.Between(world.x, world.y, t.x, t.y) < 18);
    if (near && Phaser.Math.Distance.Between(this.player.x, this.player.y, near.x, near.y) < INTERACT_RADIUS + 8) {
      this.currentPrompt = near;
      this.activate();
      return;
    }
    this.moveTarget = { x: world.x, y: world.y };
    this.moveStuckSince = 0;
  }

  private activate() {
    if (this.paused) return;
    if (!this.currentPrompt) return;
    if (this.currentPrompt.kind === "exit") {
      gameEvents.emit("world:exitInterior", {});
      return;
    }
    gameEvents.emit("interaction:activate", { target: this.currentPrompt });
  }

  override update(time: number, delta: number) {
    if (!this.player || !this.built) return;
    if (this.paused) {
      this.player.setVelocity(0, 0);
      return;
    }
    let vx = 0;
    let vy = 0;
    const c = this.cursors;
    const k = this.wasd;
    if (c?.left.isDown || k?.A?.isDown) vx -= 1;
    if (c?.right.isDown || k?.D?.isDown) vx += 1;
    if (c?.up.isDown || k?.W?.isDown) vy -= 1;
    if (c?.down.isDown || k?.S?.isDown) vy += 1;
    if (vx === 0 && vy === 0 && (this.joystick.x || this.joystick.y)) {
      vx = this.joystick.x;
      vy = this.joystick.y;
    }
    if (vx || vy) this.moveTarget = null;
    if (vx === 0 && vy === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x;
      const dy = this.moveTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) this.moveTarget = null;
      else {
        vx = dx / dist;
        vy = dy / dist;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body.blocked.none === false || (Math.abs(body.velocity.x) < 1 && Math.abs(body.velocity.y) < 1 && this.moveStuckSince > 0)) {
          if (!this.moveStuckSince) this.moveStuckSince = time;
          else if (time - this.moveStuckSince > 500) this.moveTarget = null;
        } else this.moveStuckSince = 0;
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      const nx = vx / len;
      const ny = vy / len;
      const speedMult = Math.min(1, len);
      this.player.setVelocity(nx * SPEED * speedMult, ny * SPEED * speedMult);
      if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? "right" : "left";
      else this.facing = ny > 0 ? "down" : "up";
      this.player.anims.play(`${this.playerKey}_walk_${this.facing}`, true);
    } else {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`${this.playerKey}_idle_${this.facing}`, true);
    }
    this.player.setDepth(this.player.y + 24);

    // distance walked + position reporting
    const moved = Math.hypot(this.player.x - this.lastPos.x, this.player.y - this.lastPos.y);
    if (moved > 0.5) {
      if (time - this.lastPositionEmit > 1000) {
        this.lastPositionEmit = time;
        gameEvents.emit("player:moved", { x: this.player.x, y: this.player.y, districtId: this.location.districtId, interiorId: this.location.interiorId });
        gameEvents.emit("player:walked", { distance: moved });
        this.lastPos = { x: this.player.x, y: this.player.y };
      }
    }

    // interaction prompt
    if (time - this.lastPromptCheck > 120) {
      this.lastPromptCheck = time;
      let best: InteractionTarget | null = null;
      let bestD = INTERACT_RADIUS;
      for (const t of this.interactables) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best?.id !== this.currentPrompt?.id) {
        this.currentPrompt = best;
        gameEvents.emit("interaction:prompt", { target: best });
      }
      // stepping onto the exit tile leaves the interior
      if (this.built.exit && time > this.exitCooldownUntil) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y + 6, this.built.exit.x, this.built.exit.y);
        if (d < 9) {
          this.exitCooldownUntil = time + 2000;
          gameEvents.emit("world:exitInterior", {});
        }
      }
    }

    // NPC wandering
    for (const n of this.npcs) {
      n.label.setPosition(n.sprite.x, n.sprite.y - 14);
      if (!n.wander) continue;
      if (n.target) {
        const dx = n.target.x - n.sprite.x;
        const dy = n.target.y - n.sprite.y;
        const d = Math.hypot(dx, dy);
        if (d < 2) {
          n.target = null;
          n.sprite.setVelocity(0, 0);
          n.sprite.anims.play(`${n.key}_idle_down`, true);
          n.nextMoveAt = time + 2000 + Math.random() * 4000;
        } else {
          n.sprite.setVelocity((dx / d) * 24, (dy / d) * 24);
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
          n.sprite.anims.play(`${n.key}_walk_${dir}`, true);
        }
      } else if (time > n.nextMoveAt) {
        n.target = { x: n.home.x + (Math.random() - 0.5) * 40, y: n.home.y + (Math.random() - 0.5) * 16 };
      }
      n.sprite.setDepth(n.sprite.y + 24);
    }

    // danfo buses
    for (const d of this.danfos) {
      d.sprite.x += (d.dir * d.speed * delta) / 1000;
      if (d.sprite.x > d.maxX) d.dir = -1;
      if (d.sprite.x < d.minX) d.dir = 1;
      d.sprite.setFlipX(d.dir < 0);
    }
    // water shimmer
    this.waterTimer += delta;
    if (this.waterTimer > 700 && this.objectsLayer && this.built.waterTiles.length) {
      this.waterTimer = 0;
      for (const w of this.built.waterTiles) {
        const tile = this.objectsLayer.getTileAt(w.x, w.y);
        if (tile) tile.index = tile.index === T.WATER ? T.WATER2 : T.WATER;
      }
    }
  }
}
