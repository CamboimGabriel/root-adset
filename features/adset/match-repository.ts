import { createVersionedStore } from "../shared/versioned-store";
import type { CompetitiveSession } from "./competitive-draft";
import type { DraftSettings, DraftState } from "./draft";
import { MATCH_ID_ALPHABET, MATCH_ID_LENGTH } from "./validators";

export type MatchMode = "classic" | "competitive";

export interface Match {
  id: string;
  version: number;
  mode: MatchMode;
  settings: DraftSettings;
  competitive: CompetitiveSession | null;
  draft: DraftState | null;
}

export type MatchContent = Pick<Match, "mode" | "settings" | "competitive" | "draft">;

const MATCH_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_CREATE_ATTEMPTS = 5;

const getStore = createVersionedStore<Match>({ ttlSeconds: MATCH_TTL_SECONDS });

function matchKey(id: string): string {
  return `match:${id}`;
}

function generateMatchId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(MATCH_ID_LENGTH));
  return Array.from(bytes, (byte) => MATCH_ID_ALPHABET[byte % MATCH_ID_ALPHABET.length]).join("");
}

export function getMatch(id: string): Promise<Match | null> {
  return getStore().get(matchKey(id));
}

export async function createMatch(content: MatchContent): Promise<Match> {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const match = { id: generateMatchId(), version: 0, ...content };
    if (await getStore().create(matchKey(match.id), match)) return match;
  }
  throw new Error("Não foi possível gerar um ID de partida.");
}

export async function updateMatch(match: Match, changes: Partial<MatchContent>): Promise<Match | null> {
  const updated = { ...match, ...changes, version: match.version + 1 };
  return (await getStore().replace(matchKey(match.id), updated, match.version)) ? updated : null;
}
