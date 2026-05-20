const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('../config/redis');
const { AppError } = require('../errors/AppError');

// Auth endpoints: 5 attempts per minute per IP
const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 5,
  duration: 60,
});

function rateLimitAuth(req, res, next) {
  const key = req.ip;
  authLimiter
    .consume(key)
    .then(() => next())
    .catch(() => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Max 5 attempts per minute. Try again later.',
        retryAfter: 60,
      });
    });
}

module.exports = { rateLimitAuth };
