import { create } from "zustand";
import type { DialogueNode, InteractionActionDef } from "@/data/types";
import type { InteractionTarget } from "@/game/engine/events";

export type ScreenId =
  | "profile" | "skills" | "inventory" | "activities" | "quests" | "map" | "phone" | "social" | "bank" | "investments"
  | "property" | "garage" | "fashion" | "business" | "hk" | "crew" | "crewMember" | "recruit" | "training" | "contracts"
  | "stats" | "achievements" | "settings" | "saves" | "help" | "shop" | "events" | "daily";

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "good" | "bad" | "money";
  at: number;
}

export interface FloatingText {
  id: number;
  text: string;
  kind: "money" | "xp" | "bad" | "info";
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface DialogueState {
  npcId: string;
  node: DialogueNode;
}

export interface ActionSheetState {
  title: string;
  subtitle?: string;
  actions: InteractionActionDef[];
  target: InteractionTarget;
}

interface UiState {
  screen: ScreenId | null;
  screenParam: string | null;
  dialogue: DialogueState | null;
  actionSheet: ActionSheetState | null;
  prompt: InteractionTarget | null;
  toasts: Toast[];
  floating: FloatingText[];
  confirm: ConfirmRequest | null;
  offlineSummaryOpen: boolean;
  eventOpen: boolean;
  phoneOpen: boolean;
  isMobile: boolean;
  worldReady: boolean;
  joystickVector: { x: number; y: number };
  openScreen: (screen: ScreenId | string, param?: string | null) => void;
  closeScreen: () => void;
  setDialogue: (d: DialogueState | null) => void;
  setActionSheet: (a: ActionSheetState | null) => void;
  setPrompt: (p: InteractionTarget | null) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  float: (text: string, kind?: FloatingText["kind"]) => void;
  removeFloat: (id: number) => void;
  ask: (c: ConfirmRequest) => void;
  closeConfirm: () => void;
  setOfflineSummaryOpen: (v: boolean) => void;
  setEventOpen: (v: boolean) => void;
  setPhoneOpen: (v: boolean) => void;
  setIsMobile: (v: boolean) => void;
  setWorldReady: (v: boolean) => void;
}

let idCounter = 1;

export const useUiStore = create<UiState>((set, get) => ({
  screen: null,
  screenParam: null,
  dialogue: null,
  actionSheet: null,
  prompt: null,
  toasts: [],
  floating: [],
  confirm: null,
  offlineSummaryOpen: false,
  eventOpen: false,
  phoneOpen: false,
  isMobile: false,
  worldReady: false,
  joystickVector: { x: 0, y: 0 },
  openScreen: (screen, param = null) => {
    // "shop:kiosk" style identifiers carry a parameter
    if (typeof screen === "string" && screen.includes(":")) {
      const [s, p] = screen.split(":");
      set({ screen: s as ScreenId, screenParam: p ?? null, actionSheet: null, phoneOpen: false });
      return;
    }
    set({ screen: screen as ScreenId, screenParam: param, actionSheet: null, phoneOpen: false });
  },
  closeScreen: () => set({ screen: null, screenParam: null }),
  setDialogue: (dialogue) => set({ dialogue, actionSheet: null }),
  setActionSheet: (actionSheet) => set({ actionSheet }),
  setPrompt: (prompt) => set({ prompt }),
  toast: (text, kind = "info") => {
    const id = idCounter++;
    set({ toasts: [...get().toasts.slice(-4), { id, text, kind, at: Date.now() }] });
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  float: (text, kind = "money") => {
    const id = idCounter++;
    set({ floating: [...get().floating.slice(-6), { id, text, kind }] });
    setTimeout(() => get().removeFloat(id), 1600);
  },
  removeFloat: (id) => set({ floating: get().floating.filter((f) => f.id !== id) }),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
  setOfflineSummaryOpen: (offlineSummaryOpen) => set({ offlineSummaryOpen }),
  setEventOpen: (eventOpen) => set({ eventOpen }),
  setPhoneOpen: (phoneOpen) => set({ phoneOpen }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setWorldReady: (worldReady) => set({ worldReady }),
}));
