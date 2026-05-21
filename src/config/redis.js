const Redis = require('ioredis');
const env = require('./env');

const redisUrl = new URL(env.REDIS_URL);

const redis = new Redis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

module.exports = redis;