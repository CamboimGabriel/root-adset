import { FACTIONS, findByReference, normalizeName } from "../adset/factions";
import { DECKS, MAPS } from "../adset/maps-and-decks";
import { getMatchFingerprint, NEW_PLAYER_PREFIX, sanitizeMatchInput, type ImportRequest } from "./league-commands";
import type { LeagueData, MatchInput, Player, VictoryType } from "./types";
import { validateMatchInput } from "./validators";

export interface ImportedParticipant {
  playerName: string;
  factionRef: string;
  isWinner: boolean;
  points?: number;
  factionVersion?: string;
}

export interface ImportedMatch {
  key: string;
  date: string;
  seasonRef: string;
  victoryTypeRef: string;
  mapRef: string;
  deckRef: string;
  notes: string;
  participants: ImportedParticipant[];
}

export interface ParsedImport {
  matches: ImportedMatch[];
  errors: string[];
}

export interface ImportPreviewMatch {
  index: number;
  key: string;
  input: MatchInput;
  errors: string[];
  isDuplicate: boolean;
}

export type PlayerMapping = Record<string, string>;

export const NEW_PLAYER_OPTION = "__new__";

export const IMPORT_CSV_TEMPLATE = [
  "partida;data;temporada;jogador;faccao;vencedor;vitoria;mapa;baralho;pontos;versao;observacoes",
  "1;2025-09-01;pre;Gabriel;Marqueses;sim;pontos;Outono;Baralho base;30;;",
  "1;2025-09-01;pre;Matheus;Dinastia das Rapinas;nao;pontos;Outono;Baralho base;24;;",
  "1;2025-09-01;pre;Lucas;Aliança da Floresta;nao;pontos;Outono;Baralho base;19;;",
  "2;2025-09-08;pre;Gabriel;Malandro;sim;coalizao;Inverno;;;;Coalizão com o Ducado",
  "2;2025-09-08;pre;Matheus;Ducado Subterrâneo;sim;coalizao;Inverno;;;;",
  "2;2025-09-08;pre;Lucas;Lagartos Cultistas;nao;coalizao;Inverno;;;;",
  "2;2025-09-08;pre;Ana;A Serpente Voraz;nao;coalizao;Inverno;;;v2;",
].join("\n");

const PRESEASON_REFERENCES = new Set(["", "pre", "pre-temporada", "pretemporada", "preseason", "pre-season"]);
const TRUE_VALUES = new Set(["true", "1", "sim", "s", "yes", "y", "x", "v", "vencedor", "winner"]);
const VICTORY_REFERENCES: Record<string, VictoryType> = {
  points: "points",
  pontos: "points",
  pontuacao: "points",
  dominance: "dominance",
  dominancia: "dominance",
  coalition: "coalition",
  coalizao: "coalition",
};
const COLUMN_ALIASES: Record<string, string[]> = {
  key: ["match", "partida", "id", "jogo"],
  date: ["date", "data"],
  season: ["season", "temporada"],
  player: ["player", "jogador"],
  faction: ["faction", "faccao"],
  winner: ["winner", "vencedor", "venceu"],
  victoryType: ["victory_type", "victorytype", "tipo_vitoria", "vitoria", "tipo"],
  map: ["map", "mapa"],
  deck: ["deck", "baralho"],
  points: ["points", "pontos"],
  notes: ["notes", "observacoes", "obs"],
  version: ["version", "versao", "faction_version"],
};

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let isQuoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && isQuoted && line[index + 1] === '"') {
      cell += '"';
      index++;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === delimiter && !isQuoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseOptionalPoints(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const points = Number(value);
  return Number.isNaN(points) ? Number.NaN : points;
}

function parseWinner(value: unknown): boolean {
  return value === true || TRUE_VALUES.has(normalizeName(String(value ?? "")));
}

function findColumns(header: string[]): Record<string, number> {
  const normalizedHeader = header.map((cell) => normalizeName(cell).replaceAll(" ", "_"));
  return Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([column, aliases]) => [column, normalizedHeader.findIndex((cell) => aliases.includes(cell))]),
  );
}

export function parseCsv(text: string): ParsedImport {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { matches: [], errors: ["O CSV precisa de um cabeçalho e pelo menos uma linha."] };

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const columns = findColumns(parseCsvLine(lines[0], delimiter));
  const missing = ["date", "player", "faction", "winner"].filter((column) => columns[column] < 0);
  if (missing.length > 0) return { matches: [], errors: [`Colunas obrigatórias ausentes: ${missing.join(", ")}.`] };

  const byKey = new Map<string, ImportedMatch>();
  lines.slice(1).forEach((line, lineIndex) => {
    const cells = parseCsvLine(line, delimiter);
    const read = (column: string) => (columns[column] >= 0 ? (cells[columns[column]] ?? "") : "");
    const key = read("key") || `${read("date")}#${lineIndex}`;
    const match = byKey.get(key) ?? {
      key,
      date: read("date"),
      seasonRef: read("season"),
      victoryTypeRef: read("victoryType"),
      mapRef: read("map"),
      deckRef: read("deck"),
      notes: read("notes"),
      participants: [],
    };
    match.participants.push({
      playerName: read("player"),
      factionRef: read("faction"),
      isWinner: parseWinner(read("winner")),
      points: parseOptionalPoints(read("points")),
      factionVersion: read("version") || undefined,
    });
    byKey.set(key, match);
  });
  return { matches: [...byKey.values()], errors: [] };
}

function toImportedMatch(value: unknown, index: number): ImportedMatch | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const players = Array.isArray(raw.players) ? raw.players : Array.isArray(raw.participants) ? raw.participants : null;
  if (!players) return null;
  const text = (field: unknown) => (typeof field === "string" || typeof field === "number" ? String(field) : "");
  return {
    key: text(raw.id ?? raw.key) || `json#${index}`,
    date: text(raw.date),
    seasonRef: text(raw.season),
    victoryTypeRef: text(raw.victoryType ?? raw.victory_type),
    mapRef: text(raw.map),
    deckRef: text(raw.deck),
    notes: text(raw.notes),
    participants: players.map((player: Record<string, unknown>) => ({
      playerName: text(player?.name ?? player?.player),
      factionRef: text(player?.faction),
      isWinner: parseWinner(player?.winner ?? player?.isWinner),
      points: parseOptionalPoints(player?.points),
      factionVersion: text(player?.version ?? player?.factionVersion) || undefined,
    })),
  };
}

export function parseJson(text: string): ParsedImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { matches: [], errors: ["JSON inválido."] };
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown> | null)?.matches;
  if (!Array.isArray(list)) return { matches: [], errors: ["O JSON precisa ser uma lista de partidas ou { \"matches\": [...] }."] };
  const matches = list.map(toImportedMatch);
  const invalidIndexes = matches.flatMap((match, index) => (match ? [] : [index + 1]));
  return {
    matches: matches.filter((match): match is ImportedMatch => match !== null),
    errors: invalidIndexes.map((index) => `Partida ${index} do JSON não tem a lista de jogadores.`),
  };
}

export function parseImportFile(fileName: string, text: string): ParsedImport {
  const isJson = fileName.toLowerCase().endsWith(".json") || /^\s*[[{]/.test(text);
  return isJson ? parseJson(text) : parseCsv(text);
}

export function getImportedPlayerNames(matches: readonly ImportedMatch[]): string[] {
  return [...new Set(matches.flatMap((match) => match.participants.map((participant) => participant.playerName.trim())))].filter(Boolean);
}

export function suggestPlayerMapping(names: readonly string[], players: readonly Player[]): PlayerMapping {
  return Object.fromEntries(names.map((name) => [name, findByReference(players, name)?.id ?? NEW_PLAYER_OPTION]));
}

function resolveVictoryType(reference: string, winnerCount: number): VictoryType | null {
  if (!reference.trim()) return winnerCount > 1 ? "coalition" : "points";
  return VICTORY_REFERENCES[normalizeName(reference)] ?? null;
}

function resolveImportedMatch(
  match: ImportedMatch,
  data: Pick<LeagueData, "seasons">,
  mapping: PlayerMapping,
): { input: MatchInput; errors: string[] } {
  const errors: string[] = [];
  const winnerCount = match.participants.filter((participant) => participant.isWinner).length;
  const victoryType = resolveVictoryType(match.victoryTypeRef, winnerCount);
  if (!victoryType) errors.push(`Tipo de vitória desconhecido: ${match.victoryTypeRef}.`);

  const isPreseason = PRESEASON_REFERENCES.has(normalizeName(match.seasonRef).replaceAll(" ", "-"));
  const season = isPreseason ? undefined : findByReference(data.seasons, match.seasonRef);
  if (!isPreseason && !season) errors.push(`Temporada desconhecida: ${match.seasonRef}.`);

  const map = match.mapRef ? findByReference(MAPS, match.mapRef) : undefined;
  if (match.mapRef && !map) errors.push(`Mapa desconhecido: ${match.mapRef}.`);
  const deck = match.deckRef ? findByReference(DECKS, match.deckRef) : undefined;
  if (match.deckRef && !deck) errors.push(`Baralho desconhecido: ${match.deckRef}.`);

  const participants = match.participants.map((participant) => {
    const faction = findByReference(FACTIONS, participant.factionRef);
    if (!faction) errors.push(`Facção desconhecida: ${participant.factionRef || "(vazia)"}.`);
    const mapped = mapping[participant.playerName.trim()];
    return {
      playerId: !mapped || mapped === NEW_PLAYER_OPTION ? `${NEW_PLAYER_PREFIX}${participant.playerName.trim()}` : mapped,
      factionId: faction?.id ?? participant.factionRef,
      isWinner: participant.isWinner,
      points: participant.points,
      factionVersion: participant.factionVersion,
    };
  });

  const input = sanitizeMatchInput({
    date: match.date,
    seasonId: season?.id ?? null,
    victoryType: victoryType ?? "points",
    participants,
    mapId: map?.id,
    deckId: deck?.id,
    notes: match.notes,
  });
  return { input, errors };
}

export function buildImportPreview(
  matches: readonly ImportedMatch[],
  data: Pick<LeagueData, "players" | "seasons" | "matches">,
  mapping: PlayerMapping,
): ImportPreviewMatch[] {
  const newPlayers = Object.entries(mapping)
    .filter(([, playerId]) => playerId === NEW_PLAYER_OPTION)
    .map(([name]) => ({ id: `${NEW_PLAYER_PREFIX}${name}`, name, createdAt: "" }));
  const validationData = { players: [...data.players, ...newPlayers], seasons: data.seasons };
  const knownFingerprints = new Set(data.matches.map(getMatchFingerprint));

  return matches.map((match, index) => {
    const { input, errors } = resolveImportedMatch(match, data, mapping);
    const fingerprint = getMatchFingerprint(input);
    const isDuplicate = knownFingerprints.has(fingerprint);
    knownFingerprints.add(fingerprint);
    return { index, key: match.key, input, errors: [...new Set([...errors, ...validateMatchInput(input, validationData)])], isDuplicate };
  });
}

export function toImportRequest(previews: readonly ImportPreviewMatch[], mapping: PlayerMapping): ImportRequest {
  const importable = previews.filter((preview) => preview.errors.length === 0 && !preview.isDuplicate);
  const usedNames = new Set(
    importable.flatMap((preview) =>
      preview.input.participants
        .filter((participant) => participant.playerId.startsWith(NEW_PLAYER_PREFIX))
        .map((participant) => participant.playerId.slice(NEW_PLAYER_PREFIX.length)),
    ),
  );
  return {
    newPlayerNames: Object.keys(mapping).filter((name) => mapping[name] === NEW_PLAYER_OPTION && usedNames.has(name)),
    matches: importable.map((preview) => preview.input),
  };
}
