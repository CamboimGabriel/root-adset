import type { ImportRequest, ImportResult } from "./league-commands";
import type { LeagueData, LeagueMatch, MatchInput, Player, Season } from "./types";

export interface LeagueSnapshot {
  data: LeagueData;
  isAdmin: boolean;
  isAdminConfigured: boolean;
}

export interface CommandResponse<T> {
  data: LeagueData;
  result: T;
}

export class LeagueRequestError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join(" "));
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new LeagueRequestError(Array.isArray(body.errors) ? body.errors : ["Erro de conexão."]);
  return body as T;
}

function post<T>(url: string, payload: unknown): Promise<T> {
  return requestJson<T>(url, { method: "POST", body: JSON.stringify(payload) });
}

export function fetchLeague(): Promise<LeagueSnapshot> {
  return requestJson("/api/league");
}

export function loginAdmin(password: string): Promise<{ isAdmin: boolean }> {
  return post("/api/league/session", { password });
}

export function logoutAdmin(): Promise<{ isAdmin: boolean }> {
  return requestJson("/api/league/session", { method: "DELETE" });
}

export function addPlayerRequest(name: string): Promise<CommandResponse<Player>> {
  return post("/api/league", { action: "add-player", name });
}

export function saveSeasonRequest(season: Season): Promise<CommandResponse<Season>> {
  return post("/api/league", { action: "save-season", season });
}

export function createLeagueMatchRequest(match: MatchInput): Promise<CommandResponse<LeagueMatch>> {
  return post("/api/league/matches", { action: "create", match });
}

export function updateLeagueMatchRequest(id: string, match: MatchInput): Promise<CommandResponse<LeagueMatch>> {
  return post("/api/league/matches", { action: "update", id, match });
}

export function deleteLeagueMatchRequest(id: string): Promise<CommandResponse<undefined>> {
  return post("/api/league/matches", { action: "delete", id });
}

export function importMatchesRequest(request: ImportRequest): Promise<CommandResponse<ImportResult>> {
  return post("/api/league/matches", { action: "import", request });
}
