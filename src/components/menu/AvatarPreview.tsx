"use client";
import * as React from "react";
import { generateCharacterSheet, CHAR_H, CHAR_W } from "@/game/world/sprites";

export function AvatarPreview({ skin, hair, outfit, size = 4, frame = 0, className }: { skin: number; hair: number; outfit: number; size?: number; frame?: number; className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const sheet = generateCharacterSheet(skin, hair, outfit);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(sheet, frame * CHAR_W, 0, CHAR_W, CHAR_H, 0, 0, c.width, c.height);
  }, [skin, hair, outfit, frame]);
  return <canvas ref={ref} width={CHAR_W * size} height={CHAR_H * size} className={`pixel-img ${className ?? ""}`} aria-hidden="true" />;
}
