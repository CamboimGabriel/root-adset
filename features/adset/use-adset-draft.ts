import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getCurrentPickerIndex,
  getFactionByPlayer,
  isCardLocked,
  isDraftComplete,
  type DraftSettings,
  type DraftState,
} from "./draft";
import { getMatchIdSnapshot, getServerMatchIdSnapshot, saveMatchId, subscribeMatchId } from "./draft-storage";
import { createMatchRequest, fetchMatch, MatchNotFoundError, sendMatchAction } from "./match-api";
import type { Match } from "./match-repository";
import { isValidMatchId, MATCH_ID_LENGTH, normalizeMatchId } from "./validators";
import { CHARACTERS_BY_ID, FACTION_KIND_LABELS, FACTIONS_BY_ID, getFactionKind, type FactionKind } from "./factions";
import { DECKS_BY_ID, MAPS_BY_ID, type GameComponent } from "./maps-and-decks";

const POLL_INTERVAL_MS = 3000;

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

function keepNewest(current: Match | null, incoming: Match): Match {
  const isStale = current?.id === incoming.id && current.version > incoming.version;
  return isStale ? current : incoming;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Erro de conexão.";
}

export function useAdsetDraft() {
  const matchId = useSyncExternalStore(subscribeMatchId, getMatchIdSnapshot, getServerMatchIdSnapshot);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [openedBoardFactionId, setOpenedBoardFactionId] = useState<string | null>(null);

  const currentMatch = match && match.id === matchId ? match : null;
  const board = useMemo(() => (currentMatch ? toBoardView(currentMatch.draft) : null), [currentMatch]);

  useEffect(() => {
    if (!matchId) return;
    let isActive = true;

    const load = () => {
      if (document.hidden) return;
      fetchMatch(matchId)
        .then((loaded) => {
          if (isActive) setMatch((current) => keepNewest(current, loaded));
        })
        .catch((loadError: unknown) => {
          if (!isActive || !(loadError instanceof MatchNotFoundError)) return;
          setError(`Partida ${matchId} não encontrada.`);
          saveMatchId(null);
        });
    };

    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      isActive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
    };
  }, [matchId]);

  const runRequest = async (request: () => Promise<Match>) => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await request();
      setMatch((current) => keepNewest(current, result));
      saveMatchId(result.id);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setIsBusy(false);
    }
  };

  const openFactionBoard = (factionId: string) => setOpenedBoardFactionId(factionId);
  const closeFactionBoard = () => setOpenedBoardFactionId(null);

  const startDraft = (settings: DraftSettings) => runRequest(() => createMatchRequest(settings));

  const joinMatch = (rawId: string) => {
    const id = normalizeMatchId(rawId);
    if (!isValidMatchId(id)) {
      setError(`O ID da partida tem ${MATCH_ID_LENGTH} letras ou números.`);
      return;
    }
    setError(null);
    saveMatchId(id);
  };

  const pick = (factionId: string) => {
    if (currentMatch) runRequest(() => sendMatchAction(currentMatch, { type: "pick", factionId }));
  };

  const undo = () => {
    if (currentMatch) runRequest(() => sendMatchAction(currentMatch, { type: "undo" }));
  };

  const copyMatchId = () => {
    if (matchId) navigator.clipboard.writeText(matchId);
  };

  const leaveMatch = () => {
    if (!window.confirm("Sair desta partida e começar um novo sorteio?")) return;
    saveMatchId(null);
    setMatch(null);
  };

  return {
    isHydrated: matchId !== undefined,
    isLoadingMatch: Boolean(matchId) && !currentMatch,
    matchId,
    board,
    error,
    isBusy,
    openedFactionBoard: toFactionBoardView(openedBoardFactionId),
    openFactionBoard,
    closeFactionBoard,
    startDraft,
    joinMatch,
    pick,
    undo,
    copyMatchId,
    leaveMatch,
  };
}
