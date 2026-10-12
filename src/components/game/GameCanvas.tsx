"use client";
import * as React from "react";
import type * as Phaser from "phaser";
import { gameEvents } from "@/game/engine/events";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { resolveInteraction, exitInterior } from "@/components/game/interactions";

/** Mounts the Phaser world and bridges its events to the stores. */
export function GameCanvas() {
  const ref = React.useRef<HTMLDivElement>(null);
  const gameRef = React.useRef<Phaser.Game | null>(null);

  React.useEffect(() => {
    let destroyed = false;
    const el = ref.current;
    if (!el) return;
    void import("@/game/createGame").then(({ createGame }) => {
      if (destroyed || !el) return;
      gameRef.current = createGame(el);
    });
    const unsubs = [
      gameEvents.on("interaction:prompt", ({ target }) => useUiStore.getState().setPrompt(target)),
      gameEvents.on("interaction:activate", ({ target }) => resolveInteraction(target)),
      gameEvents.on("world:ready", () => useUiStore.getState().setWorldReady(true)),
      gameEvents.on("world:exitInterior", () => exitInterior()),
      gameEvents.on("player:moved", ({ x, y }) => {
        useGameStore.setState((s) => (s.game ? { game: { ...s.game, player: { ...s.game.player, position: { x, y } } }, dirty: true } : {}));
      }),
      gameEvents.on("player:walked", ({ distance }) => {
        useGameStore.setState((s) => (s.game ? { game: { ...s.game, stats: { ...s.game.stats, distanceWalked: s.game.stats.distanceWalked + distance } } } : {}));
      }),
    ];
    // Pause world input while any overlay is open.
    const unsubUi = useUiStore.subscribe((s, prev) => {
      const paused = !!(s.screen || s.dialogue || s.actionSheet || s.confirm || s.offlineSummaryOpen || s.eventOpen || s.phoneOpen);
      const wasPaused = !!(prev.screen || prev.dialogue || prev.actionSheet || prev.confirm || prev.offlineSummaryOpen || prev.eventOpen || prev.phoneOpen);
      if (paused !== wasPaused) gameEvents.emit("world:pause", { paused });
    });
    // Rebuild the world when the location changes through the store (travel, HQ upgrades).
    let lastLoc = "";
    const unsubStore = useGameStore.subscribe((s) => {
      const g = s.game;
      if (!g) return;
      const key = `${g.player.districtId}|${g.player.interiorId ?? ""}|${g.hk.hqLevel}|${g.hk.members.length}|${g.settings.pixelScale}|${g.settings.adsEnabled}`;
      if (lastLoc === "") {
        lastLoc = key;
        return;
      }
      if (key !== lastLoc) {
        const prevLoc = lastLoc.split("|");
        lastLoc = key;
        const locationChanged = prevLoc[0] !== g.player.districtId || (prevLoc[1] ?? "") !== (g.player.interiorId ?? "");
        if (locationChanged) gameEvents.emit("world:setLocation", { districtId: g.player.districtId, interiorId: g.player.interiorId, x: g.player.position.x, y: g.player.position.y });
        else gameEvents.emit("world:setLocation", { districtId: g.player.districtId, interiorId: g.player.interiorId, x: g.player.position.x, y: g.player.position.y });
      }
    });
    return () => {
      destroyed = true;
      for (const u of unsubs) u();
      unsubUi();
      unsubStore();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      useUiStore.getState().setWorldReady(false);
    };
  }, []);

  return <div id="phaser-root" ref={ref} className="absolute inset-0" aria-label="Game world" role="application" />;
}
