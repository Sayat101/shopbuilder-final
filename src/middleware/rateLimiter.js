const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('../config/redis');

// Auth endpoints: 10 attempts per minute per IP (Redis-backed)
const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth',
  points: 10,
  duration: 60,
});

// General API: 100 requests per minute per IP
const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:api',
  points: 100,
  duration: 60,
});

async function rateLimitAuth(req, res, next) {
  try {
    await authLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many login attempts. Try again in 60 seconds.',
      retryAfter: 60,
    });
  }
}

async function rateLimitApi(req, res, next) {
  try {
    await apiLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: 60,
    });
  }
}

module.exports = { rateLimitAuth, rateLimitApi };