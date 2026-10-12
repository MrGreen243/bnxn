"use client";
import * as React from "react";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { MainMenu } from "@/components/menu/MainMenu";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Hud } from "@/components/hud/Hud";
import { ActionSheet, ConfirmDialog, DialogueOverlay, EventDialog, OfflineSummaryDialog, Toasts } from "@/components/dialogs/Overlays";
import { ScreenHost } from "@/components/screens/ScreenHost";
import { PhoneOverlay } from "@/components/screens/PhoneScreen";
import { PwaProvider, UpdateBanner } from "@/components/pwa/PwaProvider";
import { AdSlot } from "@/components/ads/AdSlot";
import { loadAds } from "@/ads/adService";
import { TutorialTips } from "@/components/hud/TutorialTips";
import { gameEvents } from "@/game/engine/events";

export function GameRoot() {
  const phase = useGameStore((s) => s.phase);
  const init = useGameStore((s) => s.init);
  const setIsMobile = useUiStore((s) => s.setIsMobile);

  React.useEffect(() => {
    void init();
    void loadAds();
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1024px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [init, setIsMobile]);

  // expose a small debug/test handle (local game, no secrets)
  React.useEffect(() => {
    (window as unknown as { __streetTycoon?: unknown }).__streetTycoon = { game: useGameStore, ui: useUiStore, events: gameEvents };
  }, []);

  return (
    <PwaProvider>
      {phase === "boot" && <BootScreen />}
      {phase === "menu" && <MainMenu />}
      {phase === "playing" && <PlayingShell />}
      <ConfirmDialog />
      <UpdateBanner />
    </PwaProvider>
  );
}

function BootScreen() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-pixel text-4xl font-black text-gold-400">STREET TYCOON</h1>
      <p className="text-sm text-ink-300">Loading the mainland…</p>
      <div className="w-full max-w-md"><AdSlot placement="loading_screen" /></div>
    </main>
  );
}

function PlayingShell() {
  const tick = useGameStore((s) => s.tick);
  const saveNow = useGameStore((s) => s.saveNow);
  const catchUp = useGameStore((s) => s.catchUp);
  const reducedMotion = useGameStore((s) => s.game?.settings.reducedMotion ?? false);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 1000);
    return () => window.clearInterval(t);
  }, [tick]);

  // autosave: periodic + debounced after changes + on hide/unload
  React.useEffect(() => {
    const periodic = window.setInterval(() => {
      if (useGameStore.getState().dirty) void saveNow();
    }, 15_000);
    let debounce: number | undefined;
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.dirty && !prev.dirty) {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => void saveNow(), 3000);
      }
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void saveNow();
      else catchUp();
    };
    const onHide = () => void saveNow();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.clearInterval(periodic);
      window.clearTimeout(debounce);
      unsub();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [saveNow, catchUp]);

  React.useEffect(() => {
    document.documentElement.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedMotion]);

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-ink-950">
      <GameCanvas />
      <Hud />
      <Toasts />
      <TutorialTips />
      <DialogueOverlay />
      <ActionSheet />
      <ScreenHost />
      <PhoneOverlay />
      <EventDialog />
      <OfflineSummaryDialog />
    </div>
  );
}
