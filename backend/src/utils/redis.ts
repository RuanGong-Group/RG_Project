type Store = {
  isRedis: boolean;
  incrWithExpiry: (key: string, ttlSeconds: number) => Promise<number>;
  getInt: (key: string) => Promise<number>;
  del: (key: string) => Promise<void>;
  quit: () => Promise<void>;
};

let store: Store;

function secondsToNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return Math.floor((next.getTime() - now.getTime()) / 1000);
}

// Memory fallback implementation
function createMemoryStore(): Store {
  const map = new Map<string, { v: number; exp: number | null }>();

  const cleanupIfExpired = (k: string) => {
    const item = map.get(k);
    if (!item) return;
    if (item.exp !== null && Date.now() > item.exp) map.delete(k);
  };

  return {
    isRedis: false,
    incrWithExpiry: async (key: string, ttlSeconds: number) => {
      cleanupIfExpired(key);
      const it = map.get(key);
      if (it) {
        it.v += 1;
        return it.v;
      }
      const exp = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      map.set(key, { v: 1, exp });
      return 1;
    },
    getInt: async (key: string) => {
      cleanupIfExpired(key);
      const it = map.get(key);
      return it ? it.v : 0;
    },
    del: async (key: string) => { map.delete(key); },
    quit: async () => { map.clear(); }
  };
}

function createRedisStore(): Store {
  const url = process.env.REDIS_URL || process.env.REDIS || null;
  if (!url) return createMemoryStore();
  // dynamic require so package absence doesn't crash startup
  let client: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const redis = require('redis');
    client = redis.createClient({ url });
    client.on('error', (err: any) => console.error('Redis client error', err));
    client.connect().catch((err: any) => console.error('Redis connect error', err));
  } catch (err) {
    console.error('redis package not found or failed to init, falling back to memory store', err);
    return createMemoryStore();
  }

  return {
    isRedis: true,
    incrWithExpiry: async (key: string, ttlSeconds: number) => {
      const val = await client.incr(key);
      if (ttlSeconds > 0) {
        const ttl = await client.ttl(key);
        if (ttl === -1 || ttl === -2) {
          await client.expire(key, ttlSeconds);
        }
      }
      return Number(val);
    },
    getInt: async (key: string) => {
      const v = await client.get(key);
      return v ? Number(v) : 0;
    },
    del: async (key: string) => { await client.del(key); },
    quit: async () => { await client.quit(); }
  };
}

// initialize store lazily
export function getStore(): Store {
  if (!store) {
    try {
      store = createRedisStore();
    } catch (err) {
      console.error('Failed to create redis store, falling back to memory', err);
      store = createMemoryStore();
    }
  }
  return store;
}

export function dailyKeyForBooster(userId: number, meaningId: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `user:${userId}:meaning:${meaningId}:booster_count:${y}${m}${day}`;
}

export function secondsUntilMidnight() { return secondsToNextMidnight(); }
import dotenv from 'dotenv';
dotenv.config();

type RedisLike = {
  incrby?: (key: string, by: number) => Promise<number>;
  get?: (key: string) => Promise<string | null>;
  set?: (key: string, val: string) => Promise<void>;
};

let client: RedisLike | null = null;
let inMemory = new Map<string, number>();

// Try to create a redis client lazily if REDIS_URL is provided and 'redis' is installed
export async function getRedisClient(): Promise<RedisLike | null> {
  if (client) return client;
  const url = process.env.REDIS_URL || process.env.REDIS;
  if (!url) return null;
  try {
    // dynamic import to avoid hard dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const redis = require('redis');
    const rc = redis.createClient({ url });
    rc.on('error', (e: any) => console.error('Redis error', e));
    await rc.connect();
    client = {
      incrby: async (key: string, by: number) => {
        const res = await rc.incrBy(key, by);
        return Number(res);
      },
      get: async (key: string) => {
        return await rc.get(key);
      },
      set: async (key: string, val: string) => {
        await rc.set(key, val);
      }
    };
    console.log('✅ Redis client connected');
    return client;
  } catch (err) {
    console.warn('Redis not available or not installed, falling back to in-memory:', String(err));
    client = null;
    return null;
  }
}

export async function getCount(key: string): Promise<number> {
  const rc = await getRedisClient();
  if (rc && rc.get) {
    const v = await rc.get(key);
    return v ? Number(v) : 0;
  }
  return inMemory.get(key) || 0;
}

export async function incrCount(key: string, by = 1): Promise<number> {
  const rc = await getRedisClient();
  if (rc && rc.incrby) {
    return await rc.incrby(key, by);
  }
  const cur = inMemory.get(key) || 0;
  const next = cur + by;
  inMemory.set(key, next);
  return next;
}

export async function setCount(key: string, val: number): Promise<void> {
  const rc = await getRedisClient();
  if (rc && rc.set) {
    await rc.set(key, String(val));
    return;
  }
  inMemory.set(key, val);
}

export function resetInMemoryForTests() {
  inMemory = new Map<string, number>();
}
