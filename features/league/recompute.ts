import { createInitialRating, rateMatch, regressTowardMean } from "./rating";
import { ALL_TIME_SCOPE, type LeagueData, type LeagueMatch, type Season, type SkillRating } from "./types";

export interface RatingHistoryEntry {
  scope: string;
  matchId: string;
  date: string;
  playerId: string;
  isWinner: boolean;
  before: SkillRating;
  after: SkillRating;
}

export interface ScopeComputation {
  scope: string;
  seeds: Map<string, SkillRating>;
  ratings: Map<string, SkillRating>;
  entries: RatingHistoryEntry[];
  matches: LeagueMatch[];
}

export interface LeagueComputation {
  allTime: ScopeComputation;
  seasons: Map<string, ScopeComputation>;
}

export function sortMatchesChronologically(matches: readonly LeagueMatch[]): LeagueMatch[] {
  return [...matches].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

function replay(scope: string, matches: LeagueMatch[], seeds: Map<string, SkillRating>): ScopeComputation {
  const ratings = new Map(seeds);
  const entries: RatingHistoryEntry[] = [];

  for (const match of matches) {
    const before = match.participants.map(({ playerId }) => ratings.get(playerId) ?? createInitialRating());
    const after = rateMatch(before, match.participants.map(({ isWinner }) => isWinner));
    match.participants.forEach(({ playerId, isWinner }, index) => {
      ratings.set(playerId, after[index]);
      entries.push({ scope, matchId: match.id, date: match.date, playerId, isWinner, before: before[index], after: after[index] });
    });
  }

  return { scope, seeds, ratings, entries, matches };
}

export function getRatingsBefore(entries: readonly RatingHistoryEntry[], date: string): Map<string, SkillRating> {
  const ratings = new Map<string, SkillRating>();
  for (const entry of entries) {
    if (entry.date < date) ratings.set(entry.playerId, entry.after);
  }
  return ratings;
}

function computeSeason(season: Season, sortedMatches: LeagueMatch[], allTime: ScopeComputation): ScopeComputation {
  const priorRatings = getRatingsBefore(allTime.entries, season.startDate);
  const seeds = new Map([...priorRatings].map(([playerId, skill]) => [playerId, regressTowardMean(skill, season.carryOver)]));
  return replay(season.id, sortedMatches.filter((match) => match.seasonId === season.id), seeds);
}

export function computeLeague(data: Pick<LeagueData, "matches" | "seasons">): LeagueComputation {
  const sortedMatches = sortMatchesChronologically(data.matches);
  const allTime = replay(ALL_TIME_SCOPE, sortedMatches, new Map());
  const seasons = new Map(data.seasons.map((season) => [season.id, computeSeason(season, sortedMatches, allTime)]));
  return { allTime, seasons };
}
