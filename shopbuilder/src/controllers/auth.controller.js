const { z } = require('zod');
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'MERCHANT', 'CUSTOMER', 'STAFF', 'DEVELOPER']).optional(),
  tenantId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json({
    message: 'Registration successful',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  const tokens = await authService.refresh(refreshToken);
  res.json(tokens);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.json({ message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { register, login, refresh, logout, me };
