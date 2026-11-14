import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getBlockingPick,
  getCurrentPickerIndex,
  getFactionByPlayer,
  isCardLocked,
  isDraftComplete,
  type DraftSettings,
  type DraftState,
} from "./draft";
import { getMatchIdSnapshot, getServerMatchIdSnapshot, saveMatchId, subscribeMatchId } from "./draft-storage";
import { createMatchRequest, fetchMatch, MatchNotFoundError, sendMatchAction } from "./match-api";
import type { Match, MatchMode } from "./match-repository";
import { isValidMatchId, MATCH_ID_LENGTH, normalizeMatchId } from "./validators";
import {
  CHARACTERS_BY_ID,
  FACTION_KIND_LABELS,
  FACTIONS_BY_ID,
  getFactionKind,
  type ContentSource,
  type FactionKind,
} from "./factions";
import {
  getActionableFactionIds,
  getCurrentActor,
  getPlayerActionSummary,
  getSnakeOrder,
  validateCompetitiveAction,
  type CompetitiveActionType,
  type CompetitiveSession,
} from "./competitive-draft";
import { DECKS_BY_ID, MAPS_BY_ID, type GameComponent } from "./maps-and-decks";

const POLL_INTERVAL_MS = 3000;

export type PoolCardStatus = "available" | "locked" | "excluded" | "taken";

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
  excludedBy?: string;
  isFavorite: boolean;
}

export type CompetitiveFactionStatus = "available" | "banned" | "favorited";

export interface CompetitiveFactionView extends FactionView {
  source: ContentSource;
  status: CompetitiveFactionStatus;
  actedBy?: string;
  banBlockedReason: string | null;
  favoriteBlockedReason: string | null;
}

export interface CompetitivePlayerView {
  name: string;
  isCurrent: boolean;
  remainingActions: number;
  favorite: FactionView | null;
  bans: FactionView[];
}

export interface SnakeStepView {
  player: string;
  round: number;
  status: "done" | "current" | "upcoming";
}

export interface CompetitiveActionView {
  player: string;
  type: CompetitiveActionType;
  round: number;
  faction: FactionView;
}

export interface CompetitiveBoardView {
  currentPlayer: string | null;
  players: CompetitivePlayerView[];
  steps: SnakeStepView[];
  history: CompetitiveActionView[];
  factions: CompetitiveFactionView[];
}

export interface FavoriteResolutionView {
  favorites: { faction: FactionView; player: string; isSelected: boolean }[];
  bans: { faction: FactionView; player: string }[];
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
  resolution: FavoriteResolutionView | null;
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

function findActor(session: CompetitiveSession, type: CompetitiveActionType, factionId: string): string {
  return session.actions.find((action) => action.type === type && action.factionId === factionId)?.player ?? "";
}

function toResolutionView(session: CompetitiveSession | null, playerCount: number): FavoriteResolutionView | null {
  const resolution = session?.resolution;
  if (!session || !resolution) return null;
  return {
    favorites: resolution.favoriteIds.map((factionId) => ({
      faction: toFactionView(factionId, playerCount),
      player: findActor(session, "favorite", factionId),
      isSelected: resolution.selectedFavoriteIds.includes(factionId),
    })),
    bans: resolution.bannedIds.map((factionId) => ({
      faction: toFactionView(factionId, playerCount),
      player: findActor(session, "ban", factionId),
    })),
  };
}

function toCompetitiveFactionView(
  factionId: string,
  session: CompetitiveSession,
  settings: DraftSettings,
): CompetitiveFactionView {
  const playerCount = settings.playerNames.length;
  const bannedBy = findActor(session, "ban", factionId);
  const favoritedBy = findActor(session, "favorite", factionId);
  const status: CompetitiveFactionStatus = bannedBy ? "banned" : favoritedBy ? "favorited" : "available";
  return {
    ...toFactionView(factionId, playerCount),
    source: FACTIONS_BY_ID.get(factionId)!.source,
    status,
    actedBy: bannedBy || favoritedBy || undefined,
    banBlockedReason: validateCompetitiveAction(session, settings, { type: "ban", factionId }),
    favoriteBlockedReason: validateCompetitiveAction(session, settings, { type: "favorite", factionId }),
  };
}

function toCompetitiveBoardView(session: CompetitiveSession, settings: DraftSettings): CompetitiveBoardView {
  const playerCount = settings.playerNames.length;
  const currentPlayer = getCurrentActor(session);
  const steps = getSnakeOrder(session.order).map((player, index) => ({
    player,
    round: index < session.order.length ? 1 : 2,
    status: index < session.actions.length ? "done" : index === session.actions.length ? "current" : "upcoming",
  })) satisfies SnakeStepView[];

  return {
    currentPlayer,
    players: session.order.map((name) => {
      const summary = getPlayerActionSummary(session, name);
      return {
        name,
        isCurrent: name === currentPlayer,
        remainingActions: summary.remainingActions,
        favorite: summary.favoriteId ? toFactionView(summary.favoriteId, playerCount) : null,
        bans: summary.bannedIds.map((id) => toFactionView(id, playerCount)),
      };
    }),
    steps,
    history: session.actions.map((action, index) => ({
      player: action.player,
      type: action.type,
      round: steps[index].round,
      faction: toFactionView(action.factionId, playerCount),
    })),
    factions: getActionableFactionIds(settings).map((id) => toCompetitiveFactionView(id, session, settings)),
  };
}

function getPoolCardStatus(isTaken: boolean, isExcluded: boolean, isLocked: boolean): PoolCardStatus {
  if (isTaken) return "taken";
  if (isExcluded) return "excluded";
  return isLocked ? "locked" : "available";
}

function toBoardView(draft: DraftState, competitive: CompetitiveSession | null): DraftBoardView {
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
    const blockingPick = getBlockingPick(draft, card);
    const status = getPoolCardStatus(Boolean(takenBy), blockingPick !== null, isCardLocked(draft, card));
    return {
      ...toFactionView(card.factionId, playerCount, card.characterId),
      status,
      takenBy,
      excludedBy: blockingPick ? FACTIONS_BY_ID.get(blockingPick)?.name : undefined,
      isFavorite: card.isFavorite === true,
    };
  });

  return {
    map: MAPS_BY_ID.get(draft.mapId)!,
    deck: DECKS_BY_ID.get(draft.deckId)!,
    players,
    pool,
    currentPlayer: currentPickerIndex === null ? null : draft.turnOrder[currentPickerIndex],
    isComplete: isDraftComplete(draft),
    canUndo: draft.picks.length > 0,
    resolution: toResolutionView(competitive, playerCount),
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
  const board = useMemo(
    () => (currentMatch?.draft ? toBoardView(currentMatch.draft, currentMatch.competitive ?? null) : null),
    [currentMatch],
  );
  const competitiveBoard = useMemo(
    () =>
      currentMatch?.competitive && !currentMatch.draft
        ? toCompetitiveBoardView(currentMatch.competitive, currentMatch.settings)
        : null,
    [currentMatch],
  );

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

  const startDraft = (settings: DraftSettings, mode: MatchMode) => runRequest(() => createMatchRequest(mode, settings));

  const actOnFaction = (type: CompetitiveActionType, factionId: string) => {
    if (!currentMatch || !competitiveBoard) return;
    const verb = type === "ban" ? "Banir" : "Favoritar";
    const factionName = FACTIONS_BY_ID.get(factionId)?.name;
    if (!window.confirm(`${competitiveBoard.currentPlayer}: ${verb} ${factionName}? Essa ação é irrevogável.`)) return;
    runRequest(() => sendMatchAction(currentMatch, { type, factionId }));
  };

  const banFaction = (factionId: string) => actOnFaction("ban", factionId);
  const favoriteFaction = (factionId: string) => actOnFaction("favorite", factionId);

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
    competitiveBoard,
    error,
    isBusy,
    openedFactionBoard: toFactionBoardView(openedBoardFactionId),
    openFactionBoard,
    closeFactionBoard,
    startDraft,
    joinMatch,
    banFaction,
    favoriteFaction,
    pick,
    undo,
    copyMatchId,
    leaveMatch,
  };
}
