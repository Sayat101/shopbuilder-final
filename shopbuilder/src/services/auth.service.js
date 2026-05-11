const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const redis = require('../config/redis');
const env = require('../config/env');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../errors/AppError');

const SALT_ROUNDS = 12;

function generateTokens(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId || null,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

async function register({ email, password, role, tenantId }) {
  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  // Password strength: min 8 chars
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role || 'CUSTOMER',
      tenantId: tenantId || 'platform',
    },
    select: { id: true, email: true, role: true, tenantId: true, createdAt: true },
  });

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token in Redis (7 days)
  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  return { user, accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token in Redis
  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  return {
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    accessToken,
    refreshToken,
  };
}

async function refresh(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Check token is still valid in Redis
  const stored = await redis.get(`refresh:${decoded.sub}`);
  if (!stored || stored !== refreshToken) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) throw new NotFoundError('User not found');

  const tokens = generateTokens(user);

  // Rotate refresh token
  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

  return tokens;
}

async function logout(userId) {
  await redis.del(`refresh:${userId}`);
}

module.exports = { register, login, refresh, logout };
