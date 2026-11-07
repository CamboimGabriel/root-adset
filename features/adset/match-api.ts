import type { DraftAction, DraftSettings } from "./draft";
import type { Match } from "./match-repository";
import { isValidDraftState } from "./validators";

export class MatchNotFoundError extends Error {}

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

async function requestMatch(url: string, init?: RequestInit): Promise<Match> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.json();
  if (response.status === NOT_FOUND_STATUS) throw new MatchNotFoundError(body.error);
  if (!response.ok && response.status !== CONFLICT_STATUS) throw new Error(body.error ?? "Erro de conexão.");
  if (!isValidDraftState(body?.draft)) throw new Error("Resposta inválida do servidor.");
  return body as Match;
}

export function createMatchRequest(settings: DraftSettings): Promise<Match> {
  return requestMatch("/api/matches", { method: "POST", body: JSON.stringify(settings) });
}

export function fetchMatch(id: string): Promise<Match> {
  return requestMatch(`/api/matches/${id}`);
}

export function sendMatchAction(match: Match, action: DraftAction): Promise<Match> {
  return requestMatch(`/api/matches/${match.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action, version: match.version }),
  });
}
