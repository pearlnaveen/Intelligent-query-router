import dotenv from "dotenv";

dotenv.config({ path: "./config.env" });

const redisEnabled = (process.env.REDIS_ENABLED || "false").toLowerCase() === "true";
const redisUrl = process.env.REDIS_URL || null;

let redis = null;
let Redis = null;

if (redisEnabled) {
  try {
    const module = await import("ioredis");
    Redis = module.default;
  } catch (err) {
    console.warn("Redis cache disabled: ioredis package not installed.");
  }
}

if (redisEnabled && Redis) {
  const retryStrategy = (times) => {
    if (times > 3) return null; // Stop retrying if server is down
    return Math.min(times * 200, 2000);
  };

  redis = redisUrl
    ? new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy,
      })
    : new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy,
      });

  redis.on("error", (err) => {
    if (err.code === "ECONNREFUSED") {
      if (!global.lastRedisClientErr || Date.now() - global.lastRedisClientErr > 60000) {
        console.warn("⚠️ Redis server not available (direct DB fallback active)");
        global.lastRedisClientErr = Date.now();
      }
    } else {
      console.error("Redis error:", err.message);
    }
  });
}

export const isRedisReady = () => Boolean(redis && redis.status === "ready");
export default redis;
