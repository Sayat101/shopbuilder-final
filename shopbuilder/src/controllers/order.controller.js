const { z } = require('zod');
const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

const placeOrderSchema = z.object({
  tenantId: z.string().min(1),
  shippingAddress: z.object({
    name:    z.string().min(1),
    street:  z.string().min(1),
    city:    z.string().min(1),
    country: z.string().length(2), // ISO 3166-1 alpha-2, e.g. "KZ"
    zip:     z.string().min(1),
  }),
});

const updateStatusSchema = z.object({
  status: z.enum(['PAID', 'FULFILLED', 'REFUNDED', 'CANCELLED']),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

/**
 * POST /orders
 * Customer places an order from their active cart.
 */
const placeOrder = asyncHandler(async (req, res) => {
  const data = placeOrderSchema.parse(req.body);
  const order = await orderService.placeOrder(req.user.id, data);
  res.status(201).json({ order });
});

/**
 * GET /orders
 * Customer: their own orders only.
 */
const listMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listMyOrders(req.user.id, req.query);
  res.json(result);
});

/**
 * GET /orders/all
 * Merchant: all orders for their tenant, optional ?status= filter.
 */
const listTenantOrders = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId || req.query.tenantId;
  const result = await orderService.listTenantOrders(tenantId, req.query);
  res.json(result);
});

/**
 * GET /orders/:id
 * Both roles can use this — service enforces ownership for CUSTOMER.
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id, req.user.id, req.user.role);
  res.json({ order });
});

/**
 * PATCH /orders/:id/status
 * Merchant moves the order through its lifecycle.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  // SUPER_ADMIN has tenantId='platform' — fall back to query param so they can manage any tenant's orders
  const tenantId = req.user.role === 'SUPER_ADMIN'
    ? (req.query.tenantId || req.body.tenantId)
    : req.user.tenantId;
  const order = await orderService.updateOrderStatus(req.params.id, tenantId, status, req.user.id);
  res.json({ order });
});

/**
 * PATCH /orders/:id/cancel
 * Customer cancels their own PENDING order.
 */
const cancelOrder = asyncHandler(async (req, res) => {
  cancelSchema.parse(req.body); // optional reason, no side effects
  const order = await orderService.cancelOrder(req.params.id, req.user.id);
  res.json({ order });
});

module.exports = { placeOrder, listMyOrders, listTenantOrders, getOrder, updateOrderStatus, cancelOrder };
