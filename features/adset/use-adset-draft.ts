import { useMemo, useState, useSyncExternalStore } from "react";
import {
  createDraft,
  getCurrentPickerIndex,
  getFactionByPlayer,
  isCardLocked,
  isDraftComplete,
  pickFaction,
  undoPick,
  type DraftSettings,
  type DraftState,
} from "./draft";
import { getDraftSnapshot, getServerDraftSnapshot, saveDraft, subscribeDraft } from "./draft-storage";
import { CHARACTERS_BY_ID, FACTION_KIND_LABELS, FACTIONS_BY_ID, getFactionKind, type FactionKind } from "./factions";
import { DECKS_BY_ID, MAPS_BY_ID, type GameComponent } from "./maps-and-decks";

export type PoolCardStatus = "available" | "locked" | "taken";

export interface FactionView {
  id: string;
  name: string;
  color: string;
  icon: string;
  kind: FactionKind;
  kindLabel: string;
  characterName?: string;
  note?: string;
  hasBoard: boolean;
}

export interface FactionBoardView {
  name: string;
  color: string;
  front: string;
  back: string;
}

export interface PoolCardView extends FactionView {
  status: PoolCardStatus;
  takenBy?: string;
}

export interface PlayerView {
  name: string;
  isFirst: boolean;
  isCurrent: boolean;
  faction?: FactionView;
}

export interface DraftBoardView {
  map: GameComponent;
  deck: GameComponent;
  players: PlayerView[];
  pool: PoolCardView[];
  currentPlayer: string | null;
  isComplete: boolean;
  canUndo: boolean;
}

function toFactionView(factionId: string, playerCount: number, characterId?: string): FactionView {
  const faction = FACTIONS_BY_ID.get(factionId)!;
  const kind = getFactionKind(faction, playerCount);
  return {
    id: faction.id,
    name: faction.name,
    color: faction.color,
    icon: faction.icon,
    kind,
    kindLabel: FACTION_KIND_LABELS[kind],
    characterName: characterId ? CHARACTERS_BY_ID.get(characterId)?.name : undefined,
    note: faction.draftNote,
    hasBoard: faction.board !== undefined,
  };
}

function toFactionBoardView(factionId: string | null): FactionBoardView | null {
  const faction = factionId ? FACTIONS_BY_ID.get(factionId) : undefined;
  if (!faction?.board) return null;
  return { name: faction.name, color: faction.color, ...faction.board };
}

function toBoardView(draft: DraftState): DraftBoardView {
  const currentPickerIndex = getCurrentPickerIndex(draft);
  const playerCount = draft.turnOrder.length;
  const factionByPlayer = getFactionByPlayer(draft);
  const playerByFaction = new Map([...factionByPlayer].map(([playerIndex, factionId]) => [factionId, draft.turnOrder[playerIndex]]));
  const cardByFaction = new Map(draft.pool.map((card) => [card.factionId, card]));

  const players = draft.turnOrder.map((name, index) => {
    const factionId = factionByPlayer.get(index);
    return {
      name,
      isFirst: index === 0,
      isCurrent: index === currentPickerIndex,
      faction: factionId ? toFactionView(factionId, playerCount, cardByFaction.get(factionId)?.characterId) : undefined,
    };
  });

  const pool = draft.pool.map((card) => {
    const takenBy = playerByFaction.get(card.factionId);
    const status: PoolCardStatus = takenBy ? "taken" : isCardLocked(draft, card) ? "locked" : "available";
    return { ...toFactionView(card.factionId, playerCount, card.characterId), status, takenBy };
  });

  return {
    map: MAPS_BY_ID.get(draft.mapId)!,
    deck: DECKS_BY_ID.get(draft.deckId)!,
    players,
    pool,
    currentPlayer: currentPickerIndex === null ? null : draft.turnOrder[currentPickerIndex],
    isComplete: isDraftComplete(draft),
    canUndo: draft.picks.length > 0,
  };
}

export function useAdsetDraft() {
  const draft = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getServerDraftSnapshot);
  const board = useMemo(() => (draft ? toBoardView(draft) : null), [draft]);
  const [openedBoardFactionId, setOpenedBoardFactionId] = useState<string | null>(null);

  const openFactionBoard = (factionId: string) => setOpenedBoardFactionId(factionId);
  const closeFactionBoard = () => setOpenedBoardFactionId(null);

  const startDraft = (settings: DraftSettings) => saveDraft(createDraft(settings));

  const pick = (factionId: string) => {
    if (draft) saveDraft(pickFaction(draft, factionId));
  };

  const undo = () => {
    if (draft) saveDraft(undoPick(draft));
  };

  const reset = () => {
    if (window.confirm("Descartar este sorteio e começar um novo?")) saveDraft(null);
  };

  return {
    isHydrated: draft !== undefined,
    board,
    openedFactionBoard: toFactionBoardView(openedBoardFactionId),
    openFactionBoard,
    closeFactionBoard,
    startDraft,
    pick,
    undo,
    reset,
  };
}
