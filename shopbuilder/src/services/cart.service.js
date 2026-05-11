const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../errors/AppError');

/**
 * Get cart for a user, creating an empty one if it doesn't exist yet.
 * This is the standard "get or create" pattern for carts.
 */
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, title: true } },
              inventory: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId, status: 'ACTIVE' },
      include: { items: true },
    });
  }

  // If the previous cart was CONVERTED (order was placed), reset it to ACTIVE
  // so the customer can start a new shopping session
  if (cart.status === 'CONVERTED') {
    cart = await prisma.cart.update({
      where: { userId },
      data: { status: 'ACTIVE' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true } },
                inventory: true,
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

/**
 * Add a variant to the cart.
 * If the variant is already in the cart, increment quantity instead of duplicating.
 */
async function addItem(userId, { variantId, quantity }) {
  // Validate variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true },
  });
  if (!variant) throw new NotFoundError('Product variant not found');

  // Check available stock
  const totalAvailable = variant.inventory.reduce((sum, inv) => sum + inv.available - inv.reserved, 0);
  if (totalAvailable < quantity) {
    throw new ValidationError(`Only ${totalAvailable} units available in stock`);
  }

  const cart = await getOrCreateCart(userId);

  // Upsert: if item already in cart — add to quantity, else create
  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      data: { quantity: existingItem.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId, quantity },
    });
  }

  // Return full updated cart
  return getOrCreateCart(userId);
}

/**
 * Update quantity of a specific item in the cart.
 * Passing quantity: 0 removes the item entirely.
 */
async function updateItem(userId, variantId, quantity) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new NotFoundError('Cart not found');

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, variantId },
    });
  } else {
    const item = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    if (!item) throw new NotFoundError('Item not in cart');

    await prisma.cartItem.update({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      data: { quantity },
    });
  }

  return getOrCreateCart(userId);
}

/**
 * Remove a single item from the cart by variantId.
 */
async function removeItem(userId, variantId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new NotFoundError('Cart not found');

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, variantId },
  });

  return getOrCreateCart(userId);
}

/**
 * Remove all items from the cart. Called after a successful order placement.
 */
async function clearCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'CONVERTED' },
  });
}

module.exports = { getOrCreateCart, addItem, updateItem, removeItem, clearCart };
