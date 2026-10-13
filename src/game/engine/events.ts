/** Typed event bus shared by the Phaser world and the React interface. */
import type { InteractionActionDef } from "@/data/types";

export interface InteractionTarget {
  id: string;
  kind: "npc" | "building" | "prop" | "exit";
  label: string;
  actions: InteractionActionDef[];
  x: number;
  y: number;
  npcId?: string;
}

export interface GameEventMap {
  "interaction:prompt": { target: InteractionTarget | null };
  "interaction:activate": { target: InteractionTarget };
  "player:moved": { x: number; y: number; districtId: string; interiorId: string | null };
  "player:walked": { distance: number };
  "world:ready": { districtId: string; interiorId: string | null };
  "world:exitInterior": Record<string, never>;
  "input:joystick": { x: number; y: number };
  "input:action": Record<string, never>;
  "input:moveTo": { x: number; y: number } | null;
  "world:setLocation": { districtId: string; interiorId: string | null; x?: number; y?: number };
  "world:pause": { paused: boolean };
}

type Handler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

class EventBus {
  private handlers = new Map<keyof GameEventMap, Set<Handler<keyof GameEventMap>>>();

  on<K extends keyof GameEventMap>(event: K, handler: Handler<K>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler<keyof GameEventMap>);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEventMap>(event: K, handler: Handler<K>) {
    this.handlers.get(event)?.delete(handler as Handler<keyof GameEventMap>);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try {
        (h as Handler<K>)(payload);
      } catch (e) {
        console.error(`[events] handler for ${String(event)} failed`, e);
      }
    }
  }

  clear() {
    this.handlers.clear();
  }
}

export const gameEvents = new EventBus();
