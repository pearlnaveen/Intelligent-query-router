import Redis from 'ioredis';

const redisEnabled = (process.env.REDIS_ENABLED || "false").toLowerCase() === "true";
let redisClient = null;

if (redisEnabled) {
  const retryStrategy = (times) => {
    if (times > 3) return null; // Stop reconnecting after 3 failed attempts
    return Math.min(times * 200, 2000);
  };

  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy
    });
  } else {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy
    });
  }

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      if (!global.lastRedisError || Date.now() - global.lastRedisError > 60000) {
        console.warn('⚠️ Redis not available on 127.0.0.1:6379 (using in-memory/direct DB fallback)');
        global.lastRedisError = Date.now();
      }
    } else {
      console.error('❌ Redis error:', err.message);
    }
  });
} else {
  // Safe dummy interface when Redis is disabled
  redisClient = {
    on: () => {},
    get: async () => null,
    set: async () => null,
    del: async () => null,
    status: 'disabled'
  };
}

export default redisClient;
