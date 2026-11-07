import { Redis } from "@upstash/redis";
import type { DraftState } from "./draft";
import { MATCH_ID_ALPHABET, MATCH_ID_LENGTH } from "./validators";

export interface Match {
  id: string;
  version: number;
  draft: DraftState;
}

interface MatchStore {
  get(id: string): Promise<Match | null>;
  create(match: Match): Promise<boolean>;
  replace(match: Match, expectedVersion: number): Promise<boolean>;
}

const MATCH_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_CREATE_ATTEMPTS = 5;

const REPLACE_IF_VERSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
if cjson.decode(current).version ~= tonumber(ARGV[2]) then return 0 end
redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])
return 1
`;

function matchKey(id: string): string {
  return `match:${id}`;
}

function shouldUseMemoryStore(): boolean {
  const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  return !hasRedisConfig && process.env.NODE_ENV === "development";
}

function createRedisStore(): MatchStore {
  const redis = Redis.fromEnv();
  return {
    get: (id) => redis.get<Match>(matchKey(id)),
    create: async (match) => (await redis.set(matchKey(match.id), match, { nx: true, ex: MATCH_TTL_SECONDS })) === "OK",
    replace: async (match, expectedVersion) =>
      (await redis.eval(REPLACE_IF_VERSION_SCRIPT, [matchKey(match.id)], [JSON.stringify(match), expectedVersion, MATCH_TTL_SECONDS])) === 1,
  };
}

const globalForMatches = globalThis as typeof globalThis & { memoryMatches?: Map<string, Match> };

function createMemoryStore(): MatchStore {
  const matches = (globalForMatches.memoryMatches ??= new Map());
  return {
    get: async (id) => matches.get(id) ?? null,
    create: async (match) => {
      if (matches.has(match.id)) return false;
      matches.set(match.id, match);
      return true;
    },
    replace: async (match, expectedVersion) => {
      if (matches.get(match.id)?.version !== expectedVersion) return false;
      matches.set(match.id, match);
      return true;
    },
  };
}

let cachedStore: MatchStore | null = null;

function getStore(): MatchStore {
  cachedStore ??= shouldUseMemoryStore() ? createMemoryStore() : createRedisStore();
  return cachedStore;
}

function generateMatchId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(MATCH_ID_LENGTH));
  return Array.from(bytes, (byte) => MATCH_ID_ALPHABET[byte % MATCH_ID_ALPHABET.length]).join("");
}

export function getMatch(id: string): Promise<Match | null> {
  return getStore().get(id);
}

export async function createMatch(draft: DraftState): Promise<Match> {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const match = { id: generateMatchId(), version: 0, draft };
    if (await getStore().create(match)) return match;
  }
  throw new Error("Não foi possível gerar um ID de partida.");
}

export async function updateMatch(match: Match, draft: DraftState): Promise<Match | null> {
  const updated = { ...match, version: match.version + 1, draft };
  return (await getStore().replace(updated, match.version)) ? updated : null;
}
