import {
  createDraft,
  getDealableCount,
  getEligibleFactions,
  isMilitant,
  shuffle,
  type DraftSettings,
  type DraftState,
  type Random,
} from "./draft";

export type CompetitiveActionType = "ban" | "favorite";

export interface CompetitiveActionInput {
  type: CompetitiveActionType;
  factionId: string;
}

export interface CompetitiveAction extends CompetitiveActionInput {
  player: string;
}

export interface FavoriteResolution {
  favoriteIds: string[];
  selectedFavoriteIds: string[];
  bannedIds: string[];
}

export interface CompetitiveSession {
  order: string[];
  actions: CompetitiveAction[];
  resolution: FavoriteResolution | null;
}

export interface PlayerActionSummary {
  player: string;
  remainingActions: number;
  bannedIds: string[];
  favoriteId: string | null;
}

export const ACTIONS_PER_PLAYER = 2;
export const MAX_RESERVED_FAVORITES = 2;

export function createCompetitiveSession(playerNames: string[], random: Random = Math.random): CompetitiveSession {
  return { order: shuffle(playerNames, random), actions: [], resolution: null };
}

export function getSnakeOrder(order: readonly string[]): string[] {
  return [...order, ...[...order].reverse()];
}

export function isCompetitivePhaseComplete(session: CompetitiveSession): boolean {
  return session.actions.length >= session.order.length * ACTIONS_PER_PLAYER;
}

export function getCurrentActor(session: CompetitiveSession): string | null {
  return getSnakeOrder(session.order)[session.actions.length] ?? null;
}

export function getBannedIds(session: CompetitiveSession): string[] {
  return session.actions.filter((action) => action.type === "ban").map((action) => action.factionId);
}

export function getFavoriteIds(session: CompetitiveSession): string[] {
  return session.actions.filter((action) => action.type === "favorite").map((action) => action.factionId);
}

export function getPlayerActionSummary(session: CompetitiveSession, player: string): PlayerActionSummary {
  const playerActions = session.actions.filter((action) => action.player === player);
  return {
    player,
    remainingActions: ACTIONS_PER_PLAYER - playerActions.length,
    bannedIds: playerActions.filter((action) => action.type === "ban").map((action) => action.factionId),
    favoriteId: playerActions.find((action) => action.type === "favorite")?.factionId ?? null,
  };
}

export function getActionableFactionIds(settings: DraftSettings): string[] {
  return getEligibleFactions(settings.factionIds, settings.playerNames.length).map((faction) => faction.id);
}

function validateBanKeepsDraftPossible(session: CompetitiveSession, settings: DraftSettings, factionId: string): string | null {
  const playerCount = settings.playerNames.length;
  const banned = new Set([...getBannedIds(session), factionId]);
  const remaining = getEligibleFactions(settings.factionIds, playerCount).filter((faction) => !banned.has(faction.id));

  if (getDealableCount(remaining) < playerCount + 1) {
    return `Banir essa facção deixaria menos de ${playerCount + 1} facções para o ADSET.`;
  }
  if (!remaining.some((faction) => isMilitant(faction, playerCount))) {
    return "Banir essa facção deixaria o ADSET sem nenhuma facção militante.";
  }
  return null;
}

export function validateCompetitiveAction(
  session: CompetitiveSession,
  settings: DraftSettings,
  action: CompetitiveActionInput,
): string | null {
  const actor = getCurrentActor(session);
  if (!actor) return "A fase de bans e favoritos já terminou.";
  if (!getActionableFactionIds(settings).includes(action.factionId)) return "Essa facção não está disponível nesta partida.";
  if (getBannedIds(session).includes(action.factionId)) return "Essa facção já foi banida.";

  const isFavorited = getFavoriteIds(session).includes(action.factionId);
  if (action.type === "favorite") {
    if (isFavorited) return "Essa facção já foi favoritada por outro jogador.";
    if (getPlayerActionSummary(session, actor).favoriteId) return "Cada jogador só pode favoritar uma facção.";
    return null;
  }

  if (isFavorited) return "Facções favoritadas não podem ser banidas.";
  return validateBanKeepsDraftPossible(session, settings, action.factionId);
}

export function applyCompetitiveAction(session: CompetitiveSession, action: CompetitiveActionInput): CompetitiveSession {
  const actor = getCurrentActor(session);
  if (!actor) return session;
  return { ...session, actions: [...session.actions, { ...action, player: actor }] };
}

export function resolveFavorites(session: CompetitiveSession, random: Random = Math.random): FavoriteResolution {
  const favoriteIds = getFavoriteIds(session);
  return {
    favoriteIds,
    selectedFavoriteIds: shuffle(favoriteIds, random).slice(0, MAX_RESERVED_FAVORITES),
    bannedIds: getBannedIds(session),
  };
}

export function finishCompetitiveDraft(
  session: CompetitiveSession,
  settings: DraftSettings,
  random: Random = Math.random,
): { session: CompetitiveSession; draft: DraftState } {
  const resolution = resolveFavorites(session, random);
  const draft = createDraft(settings, random, {
    bannedIds: resolution.bannedIds,
    reservedIds: resolution.selectedFavoriteIds,
  });
  return { session: { ...session, resolution }, draft };
}
