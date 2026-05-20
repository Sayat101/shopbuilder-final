const Redis = require('ioredis');
const env = require('./env');
 
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
 
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));
 
module.exports = redis;
 