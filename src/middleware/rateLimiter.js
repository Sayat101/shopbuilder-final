const requests = new Map();

function rateLimitAuth(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 5;

  if (!requests.has(key)) {
    requests.set(key, []);
  }

  const timestamps = requests.get(key).filter(t => now - t < windowMs);
  
  if (timestamps.length >= max) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Max 5 attempts per minute. Try again later.',
      retryAfter: 60,
    });
  }

  timestamps.push(now);
  requests.set(key, timestamps);
  next();
}

module.exports = { rateLimitAuth };