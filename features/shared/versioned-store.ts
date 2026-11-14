import { Redis } from "@upstash/redis";

export interface Versioned {
  version: number;
}

export interface VersionedStore<T extends Versioned> {
  get(key: string): Promise<T | null>;
  create(key: string, value: T): Promise<boolean>;
  replace(key: string, value: T, expectedVersion: number): Promise<boolean>;
}

interface StoreOptions {
  ttlSeconds?: number;
}

const REPLACE_IF_VERSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
if cjson.decode(current).version ~= tonumber(ARGV[2]) then return 0 end
if tonumber(ARGV[3]) > 0 then
  redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])
else
  redis.call("SET", KEYS[1], ARGV[1])
end
return 1
`;

function shouldUseMemoryStore(): boolean {
  const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  return !hasRedisConfig && process.env.NODE_ENV !== "production";
}

function createRedisStore<T extends Versioned>({ ttlSeconds = 0 }: StoreOptions): VersionedStore<T> {
  const redis = Redis.fromEnv();
  return {
    get: (key) => redis.get<T>(key),
    create: async (key, value) => {
      const options = ttlSeconds > 0 ? { nx: true as const, ex: ttlSeconds } : { nx: true as const };
      return (await redis.set(key, value, options)) === "OK";
    },
    replace: async (key, value, expectedVersion) =>
      (await redis.eval(REPLACE_IF_VERSION_SCRIPT, [key], [JSON.stringify(value), expectedVersion, ttlSeconds])) === 1,
  };
}

const globalForStores = globalThis as typeof globalThis & { memoryStoreEntries?: Map<string, unknown> };

export function createMemoryStore<T extends Versioned>(): VersionedStore<T> {
  const entries = (globalForStores.memoryStoreEntries ??= new Map());
  return {
    get: async (key) => (entries.get(key) as T | undefined) ?? null,
    create: async (key, value) => {
      if (entries.has(key)) return false;
      entries.set(key, value);
      return true;
    },
    replace: async (key, value, expectedVersion) => {
      if ((entries.get(key) as T | undefined)?.version !== expectedVersion) return false;
      entries.set(key, value);
      return true;
    },
  };
}

export function createVersionedStore<T extends Versioned>(options: StoreOptions = {}): () => VersionedStore<T> {
  let store: VersionedStore<T> | null = null;
  return () => {
    store ??= shouldUseMemoryStore() ? createMemoryStore<T>() : createRedisStore<T>(options);
    return store;
  };
}
