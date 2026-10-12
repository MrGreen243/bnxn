import * as Phaser from "phaser";
import { BootScene } from "@/game/scenes/BootScene";
import { WorldScene } from "@/game/scenes/WorldScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0f1117",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: "100%", height: "100%" },
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [BootScene, WorldScene],
    input: { keyboard: true, mouse: true, touch: true },
    render: { powerPreference: "high-performance" },
    audio: { noAudio: true },
    fps: { target: 60, min: 30 },
    disableContextMenu: true,
  });
}
