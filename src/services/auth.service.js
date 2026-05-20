const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const redis = require('../config/redis');
const env = require('../config/env');
const { ConflictError, UnauthorizedError, NotFoundError, ValidationError } = require('../errors/AppError');
const { queueVerificationEmail, queuePasswordResetEmail } = require('../workers/email.worker');

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

async function register({ email, password, role, subdomain }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userRole = role || 'CUSTOMER';
  let tenantId = 'platform';

  // MERCHANT: auto-create tenant on registration
  if (userRole === 'MERCHANT') {
    if (!subdomain) throw new ValidationError('subdomain is required for MERCHANT registration');

    const existingTenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existingTenant) throw new ConflictError('Subdomain already taken');

    const schemaName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '_')}`;
    const tenant = await prisma.tenant.create({
      data: { subdomain, schemaName, plan: 'BASIC', status: 'ACTIVE' },
    });

    await prisma.warehouseLocation.create({
      data: { name: 'Main Warehouse', city: 'Almaty', tenantId: tenant.id },
    });

    tenantId = tenant.id;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: userRole,
      tenantId,
      emailVerified: false,
    },
    select: { id: true, email: true, role: true, tenantId: true, createdAt: true },
  });

  // Generate verification token (24 hours)
  const verifyToken = uuidv4();
  await redis.setex(`verify:${verifyToken}`, 24 * 60 * 60, user.id);
  console.log('📧 Verification token:', verifyToken);
  // Queue verification email (async — does not block response)
  await queueVerificationEmail(email, verifyToken);

  return { user, message: 'Registration successful. Please check your email to verify your account.' };
}

async function verifyEmail(token) {
  const userId = await redis.get(`verify:${token}`);
  if (!userId) throw new ValidationError('Invalid or expired verification token');

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  await redis.del(`verify:${token}`);

  return { message: 'Email verified successfully. You can now log in.' };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  // Block unverified users
  if (!user.emailVerified) {
    throw new UnauthorizedError('Please verify your email before logging in');
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  return {
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    accessToken,
    refreshToken,
  };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user) return { message: 'If that email exists, a reset link has been sent.' };

  const resetToken = uuidv4();
  await redis.setex(`reset:${resetToken}`, 60 * 60, user.id); // 1 hour

  await queuePasswordResetEmail(email, resetToken);

  return { message: 'If that email exists, a reset link has been sent.' };
}

async function resetPassword(token, newPassword) {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) throw new ValidationError('Invalid or expired reset token');

  if (newPassword.length < 8) throw new ValidationError('Password must be at least 8 characters');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await redis.del(`reset:${token}`);

  return { message: 'Password reset successfully. You can now log in.' };
}

async function refresh(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const stored = await redis.get(`refresh:${decoded.sub}`);
  if (!stored || stored !== refreshToken) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) throw new NotFoundError('User not found');

  const tokens = generateTokens(user);
  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

  return tokens;
}

async function logout(userId) {
  await redis.del(`refresh:${userId}`);
}

module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, refresh, logout };
