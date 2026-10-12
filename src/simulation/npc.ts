import { DIALOGUE_MAP, NPC_MAP } from "@/data/npcs";
import type { DialogueChoice, DialogueNode } from "@/data/types";
import type { GameState } from "@/types/game";
import { applyEffects, type EffectRequests } from "@/simulation/effects";
import { startQuest } from "@/simulation/progression/quests";
import { checkAll } from "@/simulation/requirements";
import { bumpDaily } from "@/simulation/daily";

export function startDialogue(state: GameState, npcId: string, at: number): DialogueNode | null {
  const npc = NPC_MAP[npcId];
  if (!npc) return null;
  const dialogue = DIALOGUE_MAP[npc.dialogueId];
  if (!dialogue) return null;
  const first = (state.npcs.talkedTo[npcId] ?? 0) === 0;
  state.npcs.talkedTo[npcId] = (state.npcs.talkedTo[npcId] ?? 0) + 1;
  if (first) bumpDaily(state, "talk");
  const entry = dialogue.entries.find((e) => checkAll(state, e.requirements));
  if (!entry) return null;
  const node = dialogue.nodes[entry.node];
  if (!node) return null;
  applyEffects(state, node.effects, at);
  return node;
}

export function dialogueNode(npcId: string, nodeId: string): DialogueNode | null {
  const npc = NPC_MAP[npcId];
  if (!npc) return null;
  return DIALOGUE_MAP[npc.dialogueId]?.nodes[nodeId] ?? null;
}

export function availableChoices(state: GameState, node: DialogueNode): { choice: DialogueChoice; available: boolean }[] {
  return (node.choices ?? []).map((choice) => ({ choice, available: checkAll(state, choice.requirements) }));
}

/** Applies a choice and returns the next node (or null when the conversation ends). */
export function chooseDialogue(state: GameState, npcId: string, node: DialogueNode, choiceIndex: number, at: number): { next: DialogueNode | null; requests: EffectRequests } {
  const choice = node.choices?.[choiceIndex];
  const requests: EffectRequests = { startQuests: [] };
  if (!choice || !checkAll(state, choice.requirements)) return { next: null, requests };
  const r = applyEffects(state, choice.effects, at);
  for (const q of r.startQuests) startQuest(state, q, at);
  if (choice.end || !choice.next) return { next: null, requests: r };
  const next = dialogueNode(npcId, choice.next);
  if (next) {
    const r2 = applyEffects(state, next.effects, at);
    for (const q of r2.startQuests) startQuest(state, q, at);
    if (r2.openScreen) r.openScreen = r2.openScreen;
    if (r2.startActivity) r.startActivity = r2.startActivity;
  }
  return { next, requests: r };
}

/** Advances a node that has `next` but no choices. */
export function continueDialogue(state: GameState, npcId: string, node: DialogueNode, at: number): DialogueNode | null {
  if (!node.next) return null;
  const next = dialogueNode(npcId, node.next);
  if (next) applyEffects(state, next.effects, at);
  return next;
}
