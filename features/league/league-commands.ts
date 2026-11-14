import { findByReference } from "../adset/factions";
import type { AuditAction, LeagueData, LeagueMatch, MatchInput, Player, Season } from "./types";
import { validateMatchInput, validatePlayerName, validateSeason } from "./validators";

export type CommandResult<T = undefined> = { data: LeagueData; result: T } | { errors: string[] };

export interface ImportRequest {
  newPlayerNames: string[];
  matches: MatchInput[];
}

export interface ImportResult {
  importedIds: string[];
  skippedDuplicates: number[];
}

export const NEW_PLAYER_PREFIX = "new:";
const MAX_AUDIT_ENTRIES = 500;

export function createEmptyLeague(): LeagueData {
  return { version: 0, players: [], seasons: [], matches: [], audit: [] };
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function withAudit(data: LeagueData, now: string, action: AuditAction, summary: string, matchId?: string): LeagueData {
  const entry = { at: now, action, summary, ...(matchId && { matchId }) };
  return { ...data, audit: [entry, ...data.audit].slice(0, MAX_AUDIT_ENTRIES) };
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function sanitizeMatchInput(input: MatchInput): MatchInput {
  return {
    date: input.date,
    seasonId: input.seasonId || null,
    victoryType: input.victoryType,
    participants: input.participants.map((participant) => ({
      playerId: participant.playerId,
      factionId: participant.factionId,
      isWinner: participant.isWinner,
      ...(optionalText(participant.factionVersion) && { factionVersion: optionalText(participant.factionVersion) }),
      ...(participant.points !== undefined && { points: participant.points }),
    })),
    ...(optionalText(input.mapId) && { mapId: optionalText(input.mapId) }),
    ...(optionalText(input.deckId) && { deckId: optionalText(input.deckId) }),
    ...(optionalText(input.notes) && { notes: optionalText(input.notes) }),
  };
}

export function getMatchFingerprint(input: Pick<MatchInput, "date" | "participants">): string {
  const participants = input.participants
    .map(({ playerId, factionId, isWinner }) => `${playerId}:${factionId}:${isWinner ? "W" : "L"}`)
    .sort();
  return `${input.date}|${participants.join(",")}`;
}

export function addPlayer(data: LeagueData, name: string, now: string): CommandResult<Player> {
  const errors = validatePlayerName(name, data.players);
  if (errors.length > 0) return { errors };
  const player = { id: createId("player"), name: name.trim(), createdAt: now };
  return {
    data: withAudit({ ...data, players: [...data.players, player] }, now, "player-created", `Jogador ${player.name} cadastrado`),
    result: player,
  };
}

export function saveSeason(data: LeagueData, season: Season, now: string): CommandResult<Season> {
  const saved = { ...season, id: season.id || createId("season"), name: season.name.trim() };
  const errors = validateSeason(saved, data.seasons);
  if (errors.length > 0) return { errors };

  const isExisting = data.seasons.some((item) => item.id === saved.id);
  if (isExisting) {
    const outside = data.matches.find(
      (match) => match.seasonId === saved.id && (match.date < saved.startDate || match.date > saved.endDate),
    );
    if (outside) return { errors: [`A partida de ${outside.date} ficaria fora das novas datas da temporada.`] };
  }

  const seasons = isExisting ? data.seasons.map((item) => (item.id === saved.id ? saved : item)) : [...data.seasons, saved];
  seasons.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { data: withAudit({ ...data, seasons }, now, "season-saved", `Temporada ${saved.name} salva`), result: saved };
}

export function addMatch(data: LeagueData, input: MatchInput, now: string): CommandResult<LeagueMatch> {
  const sanitized = sanitizeMatchInput(input);
  const errors = validateMatchInput(sanitized, data);
  if (errors.length > 0) return { errors };
  const match = { ...sanitized, id: createId("match"), createdAt: now, updatedAt: now };
  return {
    data: withAudit({ ...data, matches: [...data.matches, match] }, now, "match-created", `Partida de ${match.date} registrada`, match.id),
    result: match,
  };
}

export function updateMatch(data: LeagueData, id: string, input: MatchInput, now: string): CommandResult<LeagueMatch> {
  const existing = data.matches.find((match) => match.id === id);
  if (!existing) return { errors: ["Partida não encontrada."] };
  const sanitized = sanitizeMatchInput(input);
  const errors = validateMatchInput(sanitized, data);
  if (errors.length > 0) return { errors };
  const match = { ...sanitized, id, createdAt: existing.createdAt, updatedAt: now };
  return {
    data: withAudit(
      { ...data, matches: data.matches.map((item) => (item.id === id ? match : item)) },
      now,
      "match-updated",
      `Partida de ${match.date} editada`,
      id,
    ),
    result: match,
  };
}

export function deleteMatch(data: LeagueData, id: string, now: string): CommandResult {
  const existing = data.matches.find((match) => match.id === id);
  if (!existing) return { errors: ["Partida não encontrada."] };
  return {
    data: withAudit(
      { ...data, matches: data.matches.filter((match) => match.id !== id) },
      now,
      "match-deleted",
      `Partida de ${existing.date} excluída`,
      id,
    ),
    result: undefined,
  };
}

function createImportPlayers(data: LeagueData, names: string[], now: string): CommandResult<Map<string, string>> {
  const playerIdByName = new Map<string, string>();
  let current = data;
  for (const name of new Set(names.map((item) => item.trim()))) {
    const existing = findByReference(current.players, name);
    if (existing) {
      playerIdByName.set(name, existing.id);
      continue;
    }
    const created = addPlayer(current, name, now);
    if ("errors" in created) return created;
    current = created.data;
    playerIdByName.set(name, created.result.id);
  }
  return { data: current, result: playerIdByName };
}

function resolvePlaceholders(input: MatchInput, playerIdByName: Map<string, string>): MatchInput {
  return {
    ...input,
    participants: input.participants.map((participant) => {
      if (!participant.playerId.startsWith(NEW_PLAYER_PREFIX)) return participant;
      const name = participant.playerId.slice(NEW_PLAYER_PREFIX.length).trim();
      return { ...participant, playerId: playerIdByName.get(name) ?? participant.playerId };
    }),
  };
}

export function importMatches(data: LeagueData, request: ImportRequest, now: string): CommandResult<ImportResult> {
  const playersResult = createImportPlayers(data, request.newPlayerNames, now);
  if ("errors" in playersResult) return playersResult;

  let current = playersResult.data;
  const knownFingerprints = new Set(current.matches.map(getMatchFingerprint));
  const importedIds: string[] = [];
  const skippedDuplicates: number[] = [];
  const errors: string[] = [];

  request.matches.forEach((rawInput, index) => {
    const input = sanitizeMatchInput(resolvePlaceholders(rawInput, playersResult.result));
    const fingerprint = getMatchFingerprint(input);
    if (knownFingerprints.has(fingerprint)) {
      skippedDuplicates.push(index);
      return;
    }
    const matchErrors = validateMatchInput(input, current);
    if (matchErrors.length > 0) {
      errors.push(...matchErrors.map((error) => `Partida ${index + 1}: ${error}`));
      return;
    }
    const createdAt = new Date(Date.parse(now) + index).toISOString();
    const match = { ...input, id: createId("match"), createdAt, updatedAt: createdAt };
    current = { ...current, matches: [...current.matches, match] };
    knownFingerprints.add(fingerprint);
    importedIds.push(match.id);
  });

  if (errors.length > 0) return { errors };
  const summary = `${importedIds.length} partidas importadas, ${skippedDuplicates.length} duplicadas ignoradas`;
  return { data: withAudit(current, now, "matches-imported", summary), result: { importedIds, skippedDuplicates } };
}
