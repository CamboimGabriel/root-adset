export type VictoryType = "points" | "dominance" | "coalition";

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  minMatches: number;
  carryOver: number;
}

export type SeasonStatus = "upcoming" | "active" | "ended";

export interface MatchParticipant {
  playerId: string;
  factionId: string;
  factionVersion?: string;
  isWinner: boolean;
  points?: number;
}

export interface MatchInput {
  date: string;
  seasonId: string | null;
  victoryType: VictoryType;
  participants: MatchParticipant[];
  mapId?: string;
  deckId?: string;
  notes?: string;
}

export interface LeagueMatch extends MatchInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction = "player-created" | "season-saved" | "match-created" | "match-updated" | "match-deleted" | "matches-imported";

export interface AuditEntry {
  at: string;
  action: AuditAction;
  summary: string;
  matchId?: string;
}

export interface LeagueData {
  version: number;
  players: Player[];
  seasons: Season[];
  matches: LeagueMatch[];
  audit: AuditEntry[];
}

export interface SkillRating {
  mu: number;
  sigma: number;
}

export const ALL_TIME_SCOPE = "all";
export const PRESEASON_LABEL = "Pré-temporada";

export const VICTORY_TYPE_LABELS: Record<VictoryType, string> = {
  points: "Pontos",
  dominance: "Dominância",
  coalition: "Coalizão",
};
