const { z } = require('zod');
const tenantService = require('../services/tenant.service');
const asyncHandler = require('../utils/asyncHandler');

const createSchema = z.object({
  subdomain: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
});

const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const tenant = await tenantService.createTenant(data);
  res.status(201).json({ tenant });
});

const list = asyncHandler(async (req, res) => {
  const result = await tenantService.listTenants({
    cursor: req.query.cursor,
    limit: parseInt(req.query.limit) || 20,
    role: req.user.role,
    tenantId: req.user.tenantId,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const tenant = await tenantService.getTenant(req.params.id, req.user);
  res.json({ tenant });
});

module.exports = { create, list, getOne };
