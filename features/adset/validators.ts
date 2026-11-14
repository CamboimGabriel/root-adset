import { getEligibleFactions, isMilitant, type DraftAction, type DraftSettings, type DraftState } from "./draft";
import { CHARACTERS_BY_ID, FACTIONS_BY_ID, KNAVES_ID } from "./factions";
import { DECKS_BY_ID, MAPS_BY_ID } from "./maps-and-decks";
import type { CompetitiveActionInput, CompetitiveSession } from "./competitive-draft";
import type { Match, MatchMode } from "./match-repository";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export function validatePlayerNames(names: string[]): string[] {
  const errors: string[] = [];
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
    errors.push(`O jogo precisa de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores.`);
  }
  if (names.some((name) => name.length === 0)) {
    errors.push("Preencha o nome de todos os jogadores.");
  }
  const normalized = names.map((name) => name.toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    errors.push("Os nomes dos jogadores devem ser diferentes.");
  }
  return errors;
}

export function validateFactionSelection(factionIds: string[], playerCount: number): string[] {
  const errors: string[] = [];
  const hasVagabond = factionIds.includes("vagabond");

  if (factionIds.includes("vagabond-2") && !hasVagabond) {
    errors.push("O segundo Malandro só pode entrar junto com o primeiro.");
  }
  if (hasVagabond && factionIds.includes(KNAVES_ID)) {
    errors.push("Malandro e Patifes do Bosque Profundo não podem estar no mesmo jogo.");
  }

  const eligible = getEligibleFactions(factionIds, playerCount);
  if (!eligible.some((faction) => isMilitant(faction, playerCount))) {
    errors.push("Selecione pelo menos uma facção militante.");
  }
  if (eligible.length < playerCount + 1) {
    const twoPlayerHint = playerCount === 2 ? " militantes (com 2 jogadores, insurgentes ficam de fora)" : "";
    errors.push(`Selecione pelo menos ${playerCount + 1} facções${twoPlayerHint}.`);
  }
  return errors;
}

export function validateCharacterSelection(factionIds: string[], characterIds: string[]): string[] {
  const vagabondCount = factionIds.filter((id) => FACTIONS_BY_ID.get(id)?.isVagabond).length;
  if (characterIds.length >= vagabondCount) return [];
  return [`Selecione pelo menos ${vagabondCount} personagem(ns) do Malandro.`];
}

export function validateComponentSelection(mapIds: string[], deckIds: string[]): string[] {
  const errors: string[] = [];
  if (mapIds.length === 0) errors.push("Selecione pelo menos um mapa.");
  if (deckIds.length === 0) errors.push("Selecione pelo menos um baralho.");
  return errors;
}

export function validateDraftSettings(settings: DraftSettings): string[] {
  return [
    ...validatePlayerNames(settings.playerNames),
    ...validateFactionSelection(settings.factionIds, settings.playerNames.length),
    ...validateCharacterSelection(settings.factionIds, settings.characterIds),
    ...validateComponentSelection(settings.mapIds, settings.deckIds),
  ];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export const MATCH_ID_LENGTH = 6;
export const MATCH_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MATCH_ID_PATTERN = new RegExp(`^[${MATCH_ID_ALPHABET}]{${MATCH_ID_LENGTH}}$`);

export function normalizeMatchId(id: string): string {
  return id.trim().toUpperCase();
}

export function isValidMatchId(id: string): boolean {
  return MATCH_ID_PATTERN.test(id);
}

export function isDraftSettings(value: unknown): value is DraftSettings {
  if (typeof value !== "object" || value === null) return false;
  const settings = value as Record<string, unknown>;
  return (
    isStringArray(settings.playerNames) &&
    isStringArray(settings.factionIds) &&
    isStringArray(settings.characterIds) &&
    isStringArray(settings.mapIds) &&
    isStringArray(settings.deckIds)
  );
}

export function isDraftAction(value: unknown): value is DraftAction {
  if (typeof value !== "object" || value === null) return false;
  const action = value as Record<string, unknown>;
  if (action.type === "undo") return true;
  return action.type === "pick" && typeof action.factionId === "string";
}

function isValidCompetitiveAction(value: unknown): boolean {
  if (!isCompetitiveActionInput(value)) return false;
  return typeof (value as unknown as Record<string, unknown>).player === "string";
}

function isValidFavoriteResolution(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const resolution = value as Record<string, unknown>;
  return (
    isStringArray(resolution.favoriteIds) &&
    isStringArray(resolution.selectedFavoriteIds) &&
    isStringArray(resolution.bannedIds)
  );
}

export function isValidCompetitiveSession(value: unknown): value is CompetitiveSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    isStringArray(session.order) &&
    Array.isArray(session.actions) &&
    session.actions.every(isValidCompetitiveAction) &&
    isValidFavoriteResolution(session.resolution)
  );
}

export function isValidMatchPayload(value: unknown): value is Match {
  if (typeof value !== "object" || value === null) return false;
  const match = value as Record<string, unknown>;
  if (typeof match.id !== "string" || !isValidMatchVersion(match.version)) return false;
  if (match.competitive != null && !isValidCompetitiveSession(match.competitive)) return false;
  return match.draft == null ? match.competitive != null : isValidDraftState(match.draft);
}

export function isCompetitiveActionInput(value: unknown): value is CompetitiveActionInput {
  if (typeof value !== "object" || value === null) return false;
  const action = value as Record<string, unknown>;
  return (action.type === "ban" || action.type === "favorite") && typeof action.factionId === "string";
}

export function isMatchMode(value: unknown): value is MatchMode {
  return value === "classic" || value === "competitive";
}

export function isValidMatchVersion(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isValidDraftCard(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.factionId === "string" &&
    FACTIONS_BY_ID.has(card.factionId) &&
    typeof card.lockedUntilMilitant === "boolean" &&
    (card.isFavorite === undefined || typeof card.isFavorite === "boolean") &&
    (card.characterId === undefined ||
      (typeof card.characterId === "string" && CHARACTERS_BY_ID.has(card.characterId)))
  );
}

export function isValidDraftState(value: unknown): value is DraftState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.mapId === "string" &&
    MAPS_BY_ID.has(state.mapId) &&
    typeof state.deckId === "string" &&
    DECKS_BY_ID.has(state.deckId) &&
    isStringArray(state.turnOrder) &&
    isStringArray(state.picks) &&
    Array.isArray(state.pool) &&
    state.pool.every(isValidDraftCard)
  );
}
