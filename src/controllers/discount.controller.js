const { z } = require('zod');
const discountService = require('../services/discount.service');

const createSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['PERCENTAGE', 'FIXED', 'BUY_X_GET_Y']),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().positive().optional().nullable(),
  isStackable: z.boolean().optional(),
  maxUsage: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const applySchema = z.object({
  code: z.string().min(1),
  orderAmount: z.number().int().nonnegative(),
});

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const result = await discountService.createDiscount(req.user.tenantId, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await discountService.listDiscounts(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function apply(req, res, next) {
  try {
    const { code, orderAmount } = applySchema.parse(req.body);
    const result = await discountService.applyDiscount(
      req.user.tenantId,
      code,
      orderAmount
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await discountService.deleteDiscount(
      req.user.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, apply, remove };
