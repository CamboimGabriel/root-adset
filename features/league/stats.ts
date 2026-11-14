import { FACTIONS_BY_ID, type ContentSource } from "../adset/factions";
import { DECKS_BY_ID, MAPS_BY_ID } from "../adset/maps-and-decks";
import { DEFAULT_MIN_MATCHES, toDisplayConservative, toDisplayRating, toDisplayUncertainty } from "./rating";
import type { LeagueComputation, RatingHistoryEntry, ScopeComputation } from "./recompute";
import {
  ALL_TIME_SCOPE,
  PRESEASON_LABEL,
  VICTORY_TYPE_LABELS,
  type LeagueData,
  type LeagueMatch,
  type Player,
  type Season,
  type SeasonStatus,
} from "./types";

export const SMALL_SAMPLE_MATCHES = 10;
export const RECENT_MATCHES_LIMIT = 10;

const SERIES_COLORS = ["#fbbf24", "#60a5fa", "#f87171", "#34d399", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6", "#a3e635", "#94a3b8"];

export interface ScopeOption {
  id: string;
  label: string;
  status: SeasonStatus | null;
}

export interface LeaderboardRow {
  position: number;
  playerId: string;
  name: string;
  rating: number;
  conservative: number;
  uncertainty: number;
  recentChange: number | null;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  isProvisional: boolean;
}

export interface RatingPoint {
  index: number;
  date: string;
  rating: number;
  conservative: number;
}

export interface RatingSeries {
  playerId: string;
  name: string;
  color: string;
  points: RatingPoint[];
}

export interface CountStat {
  id: string;
  label: string;
  matches: number;
  wins: number;
  winRate: number;
}

export interface PlayerMatchView {
  matchId: string;
  date: string;
  scopeLabel: string;
  isWinner: boolean;
  factionName: string;
  factionIcon: string;
  factionColor: string;
  victoryLabel: string;
  mapName: string | null;
  deckName: string | null;
  points: number | null;
  ratingAfter: number;
  delta: number;
  opponents: { name: string; factionName: string; isWinner: boolean }[];
}

export interface PlayerProfileView {
  player: Player;
  row: LeaderboardRow | null;
  minMatches: number;
  series: RatingSeries;
  matches: PlayerMatchView[];
  factions: CountStat[];
  maps: CountStat[];
  opponents: CountStat[];
}

export interface FactionStatsRow {
  key: string;
  factionId: string;
  name: string;
  version: string | null;
  icon: string;
  color: string;
  source: ContentSource;
  matches: number;
  wins: number;
  winRate: number;
  pickRate: number;
  isSmallSample: boolean;
  players: CountStat[];
  maps: CountStat[];
  decks: CountStat[];
}

export interface FactionStatsView {
  totalMatches: number;
  official: FactionStatsRow[];
  fan: FactionStatsRow[];
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getSeasonStatus(season: Season, today: string): SeasonStatus {
  if (today < season.startDate) return "upcoming";
  return today > season.endDate ? "ended" : "active";
}

export function getScopeOptions(seasons: readonly Season[], today: string): ScopeOption[] {
  const seasonOptions = [...seasons]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((season) => ({ id: season.id, label: season.name, status: getSeasonStatus(season, today) }));
  return [{ id: ALL_TIME_SCOPE, label: "Histórico geral", status: null }, ...seasonOptions];
}

export function resolveScope(requested: string | undefined, seasons: readonly Season[], today: string): string {
  if (requested === ALL_TIME_SCOPE || seasons.some((season) => season.id === requested)) return requested!;
  return seasons.find((season) => getSeasonStatus(season, today) === "active")?.id ?? ALL_TIME_SCOPE;
}

export function getScopeComputation(computation: LeagueComputation, scope: string): ScopeComputation {
  return scope === ALL_TIME_SCOPE ? computation.allTime : (computation.seasons.get(scope) ?? computation.allTime);
}

export function getScopeMinMatches(seasons: readonly Season[], scope: string): number {
  return seasons.find((season) => season.id === scope)?.minMatches ?? DEFAULT_MIN_MATCHES;
}

function getMatchesInScope(matches: readonly LeagueMatch[], scope: string): LeagueMatch[] {
  return scope === ALL_TIME_SCOPE ? [...matches] : matches.filter((match) => match.seasonId === scope);
}

function toWinRate(wins: number, matches: number): number {
  return matches === 0 ? 0 : wins / matches;
}

function groupEntriesByPlayer(entries: readonly RatingHistoryEntry[]): Map<string, RatingHistoryEntry[]> {
  const byPlayer = new Map<string, RatingHistoryEntry[]>();
  for (const entry of entries) byPlayer.set(entry.playerId, [...(byPlayer.get(entry.playerId) ?? []), entry]);
  return byPlayer;
}

export function buildLeaderboard(data: LeagueData, computation: LeagueComputation, scope: string): LeaderboardRow[] {
  const scoped = getScopeComputation(computation, scope);
  const minMatches = getScopeMinMatches(data.seasons, scope);
  const playersById = new Map(data.players.map((player) => [player.id, player]));

  const rows = [...groupEntriesByPlayer(scoped.entries)].map(([playerId, entries]) => {
    const skill = scoped.ratings.get(playerId)!;
    const last = entries[entries.length - 1];
    const wins = entries.filter((entry) => entry.isWinner).length;
    return {
      position: 0,
      playerId,
      name: playersById.get(playerId)?.name ?? "Jogador removido",
      rating: toDisplayRating(skill.mu),
      conservative: toDisplayConservative(skill),
      uncertainty: toDisplayUncertainty(skill.sigma),
      recentChange: toDisplayRating(last.after.mu) - toDisplayRating(last.before.mu),
      wins,
      losses: entries.length - wins,
      matches: entries.length,
      winRate: toWinRate(wins, entries.length),
      isProvisional: entries.length < minMatches,
    };
  });

  rows.sort(
    (a, b) =>
      Number(a.isProvisional) - Number(b.isProvisional) ||
      b.conservative - a.conservative ||
      b.rating - a.rating ||
      a.name.localeCompare(b.name),
  );
  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}

export function getChampion(rows: readonly LeaderboardRow[], season: Season | undefined, today: string): LeaderboardRow | null {
  if (!season || getSeasonStatus(season, today) !== "ended") return null;
  return rows.find((row) => !row.isProvisional) ?? null;
}

export function buildRatingSeries(
  data: LeagueData,
  computation: LeagueComputation,
  scope: string,
  playerIds: readonly string[],
): RatingSeries[] {
  const scoped = getScopeComputation(computation, scope);
  const matchIndex = new Map(scoped.matches.map((match, index) => [match.id, index + 1]));
  const byPlayer = groupEntriesByPlayer(scoped.entries);
  const playersById = new Map(data.players.map((player) => [player.id, player]));

  return playerIds.map((playerId, seriesIndex) => {
    const entries = byPlayer.get(playerId) ?? [];
    const first = entries[0];
    const seed = first
      ? [{ index: matchIndex.get(first.matchId)! - 1, date: first.date, rating: toDisplayRating(first.before.mu), conservative: toDisplayConservative(first.before) }]
      : [];
    return {
      playerId,
      name: playersById.get(playerId)?.name ?? "",
      color: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
      points: [
        ...seed,
        ...entries.map((entry) => ({
          index: matchIndex.get(entry.matchId)!,
          date: entry.date,
          rating: toDisplayRating(entry.after.mu),
          conservative: toDisplayConservative(entry.after),
        })),
      ],
    };
  });
}

function countBy<T>(
  items: readonly T[],
  getKey: (item: T) => string | null,
  getLabel: (key: string) => string,
  isWin: (item: T) => boolean,
): CountStat[] {
  const stats = new Map<string, CountStat>();
  for (const item of items) {
    const key = getKey(item);
    if (key === null) continue;
    const stat = stats.get(key) ?? { id: key, label: getLabel(key), matches: 0, wins: 0, winRate: 0 };
    stat.matches++;
    if (isWin(item)) stat.wins++;
    stats.set(key, stat);
  }
  return [...stats.values()]
    .map((stat) => ({ ...stat, winRate: toWinRate(stat.wins, stat.matches) }))
    .sort((a, b) => b.matches - a.matches || b.wins - a.wins || a.label.localeCompare(b.label));
}

function factionName(factionId: string): string {
  return FACTIONS_BY_ID.get(factionId)?.name ?? factionId;
}

export function buildPlayerProfile(
  data: LeagueData,
  computation: LeagueComputation,
  scope: string,
  playerId: string,
): PlayerProfileView | null {
  const player = data.players.find((item) => item.id === playerId);
  if (!player) return null;

  const scoped = getScopeComputation(computation, scope);
  const playersById = new Map(data.players.map((item) => [item.id, item]));
  const seasonsById = new Map(data.seasons.map((season) => [season.id, season]));
  const entryByMatch = new Map(scoped.entries.filter((entry) => entry.playerId === playerId).map((entry) => [entry.matchId, entry]));
  const playerMatches = scoped.matches.filter((match) => entryByMatch.has(match.id));
  const seats = playerMatches.map((match) => ({ match, seat: match.participants.find((item) => item.playerId === playerId)! }));

  const matches = seats
    .map(({ match, seat }) => {
      const entry = entryByMatch.get(match.id)!;
      const faction = FACTIONS_BY_ID.get(seat.factionId);
      return {
        matchId: match.id,
        date: match.date,
        scopeLabel: match.seasonId ? (seasonsById.get(match.seasonId)?.name ?? "") : PRESEASON_LABEL,
        isWinner: seat.isWinner,
        factionName: factionName(seat.factionId) + (seat.factionVersion ? ` (${seat.factionVersion})` : ""),
        factionIcon: faction?.icon ?? "",
        factionColor: faction?.color ?? "#555",
        victoryLabel: VICTORY_TYPE_LABELS[match.victoryType],
        mapName: match.mapId ? (MAPS_BY_ID.get(match.mapId)?.name ?? null) : null,
        deckName: match.deckId ? (DECKS_BY_ID.get(match.deckId)?.name ?? null) : null,
        points: seat.points ?? null,
        ratingAfter: toDisplayRating(entry.after.mu),
        delta: toDisplayRating(entry.after.mu) - toDisplayRating(entry.before.mu),
        opponents: match.participants
          .filter((item) => item.playerId !== playerId)
          .map((item) => ({ name: playersById.get(item.playerId)?.name ?? "?", factionName: factionName(item.factionId), isWinner: item.isWinner })),
      };
    })
    .reverse();

  const opponentSeats = seats.flatMap(({ match, seat }) =>
    match.participants.filter((item) => item.playerId !== playerId).map((item) => ({ opponentId: item.playerId, isWinner: seat.isWinner })),
  );

  return {
    player,
    row: buildLeaderboard(data, computation, scope).find((row) => row.playerId === playerId) ?? null,
    minMatches: getScopeMinMatches(data.seasons, scope),
    series: buildRatingSeries(data, computation, scope, [playerId])[0],
    matches,
    factions: countBy(seats, ({ seat }) => seat.factionId, factionName, ({ seat }) => seat.isWinner),
    maps: countBy(seats, ({ match }) => match.mapId ?? null, (id) => MAPS_BY_ID.get(id)?.name ?? id, ({ seat }) => seat.isWinner),
    opponents: countBy(opponentSeats, (item) => item.opponentId, (id) => playersById.get(id)?.name ?? "?", (item) => item.isWinner),
  };
}

export function buildFactionStats(data: LeagueData, scope: string): FactionStatsView {
  const matches = getMatchesInScope(data.matches, scope);
  const playersById = new Map(data.players.map((player) => [player.id, player]));
  const seats = matches.flatMap((match) => match.participants.map((seat) => ({ match, seat })));
  const byKey = new Map<string, typeof seats>();
  for (const item of seats) {
    const key = `${item.seat.factionId}@${item.seat.factionVersion ?? ""}`;
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
  }

  const rows = [...byKey].map(([key, items]) => {
    const { factionId, factionVersion } = items[0].seat;
    const faction = FACTIONS_BY_ID.get(factionId);
    const wins = items.filter(({ seat }) => seat.isWinner).length;
    const isWin = ({ seat }: (typeof items)[number]) => seat.isWinner;
    return {
      key,
      factionId,
      name: factionName(factionId),
      version: factionVersion ?? null,
      icon: faction?.icon ?? "",
      color: faction?.color ?? "#555",
      source: faction?.source ?? "fan",
      matches: items.length,
      wins,
      winRate: toWinRate(wins, items.length),
      pickRate: toWinRate(items.length, matches.length),
      isSmallSample: items.length < SMALL_SAMPLE_MATCHES,
      players: countBy(items, ({ seat }) => seat.playerId, (id) => playersById.get(id)?.name ?? "?", isWin),
      maps: countBy(items, ({ match }) => match.mapId ?? null, (id) => MAPS_BY_ID.get(id)?.name ?? id, isWin),
      decks: countBy(items, ({ match }) => match.deckId ?? null, (id) => DECKS_BY_ID.get(id)?.name ?? id, isWin),
    } satisfies FactionStatsRow;
  });

  rows.sort((a, b) => b.matches - a.matches || b.winRate - a.winRate || a.name.localeCompare(b.name));
  return {
    totalMatches: matches.length,
    official: rows.filter((row) => row.source === "official"),
    fan: rows.filter((row) => row.source === "fan"),
  };
}
