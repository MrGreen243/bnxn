"use client";
import * as React from "react";
import { gameEvents } from "@/game/engine/events";

const RADIUS = 44;

export function VirtualJoystick({ side }: { side: "left" | "right" }) {
  const base = React.useRef<HTMLDivElement>(null);
  const [knob, setKnob] = React.useState({ x: 0, y: 0 });
  const active = React.useRef<number | null>(null);
  const origin = React.useRef({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x;
    let dy = clientY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const dead = 8;
    const mag = Math.hypot(dx, dy);
    if (mag < dead) gameEvents.emit("input:joystick", { x: 0, y: 0 });
    else gameEvents.emit("input:joystick", { x: dx / RADIUS, y: dy / RADIUS });
  };

  const onDown = (e: React.PointerEvent) => {
    if (active.current !== null) return;
    active.current = e.pointerId;
    const rect = base.current!.getBoundingClientRect();
    origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    update(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    update(e.clientX, e.clientY);
  };
  const onUp = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setKnob({ x: 0, y: 0 });
    gameEvents.emit("input:joystick", { x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      className={`pointer-events-auto absolute bottom-[calc(var(--safe-bottom)+88px)] ${side === "left" ? "left-5" : "right-5"} h-28 w-28 touch-none select-none rounded-full border-2 border-ink-500/60 bg-ink-900/50`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Virtual joystick"
      role="slider"
      aria-valuenow={0}
    >
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-400/60 bg-ink-700/90 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}
