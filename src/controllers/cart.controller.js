const { z } = require('zod');
const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/asyncHandler');

const addItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0), // 0 means remove
});

/**
 * GET /cart
 * Returns the current user's cart, creating an empty one if needed.
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(req.user.id);
  res.json({ cart });
});

/**
 * POST /cart/items
 * Add a variant to the cart. Body: { variantId, quantity }
 */
const addItem = asyncHandler(async (req, res) => {
  const data = addItemSchema.parse(req.body);
  const cart = await cartService.addItem(req.user.id, data);
  res.status(201).json({ cart });
});

/**
 * PATCH /cart/items/:variantId
 * Update quantity of an item. Send quantity: 0 to remove it.
 */
const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = updateItemSchema.parse(req.body);
  const cart = await cartService.updateItem(req.user.id, req.params.variantId, quantity);
  res.json({ cart });
});

/**
 * DELETE /cart/items/:variantId
 * Remove a specific item from the cart.
 */
const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.user.id, req.params.variantId);
  res.json({ cart });
});

/**
 * DELETE /cart
 * Clear all items from the cart.
 */
const clearCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user.id);
  res.json({ message: 'Cart cleared' });
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
