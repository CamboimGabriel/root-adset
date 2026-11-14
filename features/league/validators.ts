import { FACTIONS_BY_ID, normalizeName } from "../adset/factions";
import { DECKS_BY_ID, MAPS_BY_ID } from "../adset/maps-and-decks";
import type { LeagueData, MatchInput, MatchParticipant, Player, Season, VictoryType } from "./types";

export const MIN_MATCH_PLAYERS = 2;
export const MAX_MATCH_PLAYERS = 6;
export const MAX_PLAYER_NAME_LENGTH = 40;
export const MAX_NOTES_LENGTH = 500;
export const MAX_FACTION_VERSION_LENGTH = 30;
export const MAX_POINTS = 99;
export const MAX_SEASON_MIN_MATCHES = 50;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VICTORY_TYPES: VictoryType[] = ["points", "dominance", "coalition"];

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isVictoryType(value: unknown): value is VictoryType {
  return VICTORY_TYPES.includes(value as VictoryType);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isParticipantShape(value: unknown): value is MatchParticipant {
  if (typeof value !== "object" || value === null) return false;
  const participant = value as Record<string, unknown>;
  return (
    typeof participant.playerId === "string" &&
    typeof participant.factionId === "string" &&
    typeof participant.isWinner === "boolean" &&
    isOptionalString(participant.factionVersion) &&
    (participant.points === undefined || typeof participant.points === "number")
  );
}

export function isMatchInputShape(value: unknown): value is MatchInput {
  if (typeof value !== "object" || value === null) return false;
  const match = value as Record<string, unknown>;
  return (
    typeof match.date === "string" &&
    (match.seasonId === null || typeof match.seasonId === "string") &&
    isVictoryType(match.victoryType) &&
    Array.isArray(match.participants) &&
    match.participants.every(isParticipantShape) &&
    isOptionalString(match.mapId) &&
    isOptionalString(match.deckId) &&
    isOptionalString(match.notes)
  );
}

export function isImportRequestShape(value: unknown): value is { newPlayerNames: string[]; matches: MatchInput[] } {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    Array.isArray(request.newPlayerNames) &&
    request.newPlayerNames.every((name) => typeof name === "string") &&
    Array.isArray(request.matches) &&
    request.matches.every(isMatchInputShape)
  );
}

export function isSeasonShape(value: unknown): value is Season {
  if (typeof value !== "object" || value === null) return false;
  const season = value as Record<string, unknown>;
  return (
    typeof season.id === "string" &&
    typeof season.name === "string" &&
    typeof season.startDate === "string" &&
    typeof season.endDate === "string" &&
    typeof season.minMatches === "number" &&
    typeof season.carryOver === "number"
  );
}

export function validatePlayerName(name: string, players: readonly Player[], ignoreId?: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return ["Informe o nome do jogador."];
  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) return [`O nome pode ter até ${MAX_PLAYER_NAME_LENGTH} caracteres.`];
  const isDuplicate = players.some((player) => player.id !== ignoreId && normalizeName(player.name) === normalizeName(trimmed));
  return isDuplicate ? [`Já existe um jogador chamado ${trimmed}.`] : [];
}

function seasonsOverlap(a: Season, b: Season): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function validateSeason(season: Season, seasons: readonly Season[]): string[] {
  const errors: string[] = [];
  if (!season.name.trim()) errors.push("Informe o nome da temporada.");
  if (!isValidDate(season.startDate) || !isValidDate(season.endDate)) errors.push("Datas da temporada inválidas.");
  else if (season.startDate > season.endDate) errors.push("A temporada precisa terminar depois de começar.");
  if (!Number.isInteger(season.minMatches) || season.minMatches < 1 || season.minMatches > MAX_SEASON_MIN_MATCHES) {
    errors.push(`O mínimo de partidas deve ficar entre 1 e ${MAX_SEASON_MIN_MATCHES}.`);
  }
  if (!(season.carryOver >= 0 && season.carryOver <= 1)) errors.push("A herança de rating deve ficar entre 0% e 100%.");
  const overlapping = seasons.find((other) => other.id !== season.id && seasonsOverlap(season, other));
  if (overlapping) errors.push(`As datas se sobrepõem à temporada ${overlapping.name}.`);
  return errors;
}

function validateWinners(input: MatchInput): string[] {
  const winnerCount = input.participants.filter((participant) => participant.isWinner).length;
  if (winnerCount === 0) return ["Marque pelo menos um vencedor."];
  if (winnerCount === input.participants.length) return ["Pelo menos um jogador precisa ter perdido."];
  if (input.victoryType === "coalition" && winnerCount < 2) return ["Vitória por coalizão precisa de pelo menos dois vencedores."];
  if (input.victoryType !== "coalition" && winnerCount > 1) return ["Vitória por pontos ou dominância tem um único vencedor."];
  return [];
}

function validateParticipants(input: MatchInput, data: Pick<LeagueData, "players">): string[] {
  const errors: string[] = [];
  const { participants } = input;
  if (participants.length < MIN_MATCH_PLAYERS || participants.length > MAX_MATCH_PLAYERS) {
    errors.push(`Uma partida tem de ${MIN_MATCH_PLAYERS} a ${MAX_MATCH_PLAYERS} participantes.`);
  }

  const playerIds = new Set(data.players.map((player) => player.id));
  if (participants.some((participant) => !playerIds.has(participant.playerId))) errors.push("Há participante sem jogador cadastrado.");
  if (new Set(participants.map((participant) => participant.playerId)).size !== participants.length) {
    errors.push("Um jogador aparece mais de uma vez na partida.");
  }
  if (participants.some((participant) => !FACTIONS_BY_ID.has(participant.factionId))) errors.push("Há facção desconhecida na partida.");
  if (new Set(participants.map((participant) => participant.factionId)).size !== participants.length) {
    errors.push("A mesma facção aparece mais de uma vez. Para dois Malandros, use “Malandro (segundo)”.");
  }
  if (participants.some((participant) => (participant.factionVersion?.length ?? 0) > MAX_FACTION_VERSION_LENGTH)) {
    errors.push(`A versão da facção pode ter até ${MAX_FACTION_VERSION_LENGTH} caracteres.`);
  }
  const hasInvalidPoints = participants.some(
    ({ points }) => points !== undefined && (!Number.isInteger(points) || points < 0 || points > MAX_POINTS),
  );
  if (hasInvalidPoints) errors.push(`Pontos devem ser inteiros entre 0 e ${MAX_POINTS}.`);
  return errors;
}

export function validateMatchInput(input: MatchInput, data: Pick<LeagueData, "players" | "seasons">): string[] {
  const errors: string[] = [];
  if (!isValidDate(input.date)) errors.push("Data da partida inválida.");

  if (input.seasonId !== null) {
    const season = data.seasons.find((item) => item.id === input.seasonId);
    if (!season) errors.push("Temporada não encontrada.");
    else if (isValidDate(input.date) && (input.date < season.startDate || input.date > season.endDate)) {
      errors.push(`A data está fora da temporada ${season.name} (${season.startDate} a ${season.endDate}).`);
    }
  }

  if (input.mapId && !MAPS_BY_ID.has(input.mapId)) errors.push("Mapa desconhecido.");
  if (input.deckId && !DECKS_BY_ID.has(input.deckId)) errors.push("Baralho desconhecido.");
  if ((input.notes?.length ?? 0) > MAX_NOTES_LENGTH) errors.push(`Observações podem ter até ${MAX_NOTES_LENGTH} caracteres.`);

  return [...errors, ...validateParticipants(input, data), ...validateWinners(input)];
}
