const { z } = require('zod');
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'MERCHANT', 'CUSTOMER', 'STAFF', 'DEVELOPER']).optional(),
  subdomain: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens').optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8),
});

const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json(result);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });
  const result = await authService.verifyEmail(token);
  res.json(result);
});

const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const result = await authService.forgotPassword(email);
  res.json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = resetSchema.parse(req.body);
  const result = await authService.resetPassword(data.token, data.newPassword);
  res.json(result);
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

module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, refresh, logout, me };
