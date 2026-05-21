const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../errors/AppError');
const { buildPaginationArgs, buildPaginationMeta } = require('../utils/pagination');
const {
  queueOrderConfirmationEmail,
  queueMerchantOrderEmail,
} = require('../workers/email.worker');

/**
 * Place an order from the customer's active cart.
 * Steps:
 *   1. Load cart with items + inventory
 *   2. Validate all items have sufficient stock
 *   3. In a single transaction:
 *      a. Create Order with OrderItems
 *      b. Reserve inventory for each variant (double-check inside tx)
 *      c. Mark cart as CONVERTED + clear items
 *      d. Write AuditLog
 *   4. Queue emails: customer confirmation + merchant notification
 */
async function placeOrder(userId, { tenantId, shippingAddress }) {
  // Load cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: { inventory: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty — add items before placing an order');
  }

  // Pre-flight stock check (fast fail before hitting the transaction)
  for (const item of cart.items) {
    const available = item.variant.inventory.reduce(
      (sum, inv) => sum + inv.available - inv.reserved,
      0
    );
    if (available < item.quantity) {
      throw new ValidationError(
        `Insufficient stock for SKU "${item.variant.sku}": requested ${item.quantity}, available ${available}`
      );
    }
  }

  // Calculate total (prices stored in tiyn — smallest currency unit)
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0
  );

  // One atomic transaction: order + inventory reservation + cart conversion + audit
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        tenantId,
        status: 'PENDING',
        totalAmount,
        idempotencyKey: uuidv4(),
        shippingAddress: JSON.stringify(shippingAddress),
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant.price, // snapshot price at time of order
          })),
        },
      },
      include: {
        items: { include: { variant: true } },
      },
    });

    // Reserve inventory — re-read INSIDE the tx to avoid race conditions
    for (const item of cart.items) {
      const inv = await tx.inventoryLevel.findFirst({
        where: { variantId: item.variantId },
      });
      if (inv) {
        if (inv.available - inv.reserved < item.quantity) {
          throw new ValidationError(
            `Stock changed for SKU "${item.variant.sku}" — please refresh your cart`
          );
        }
        await tx.inventoryLevel.update({
          where: { id: inv.id },
          data: { reserved: inv.reserved + item.quantity },
        });
      }
    }

    // Convert cart so it can't be ordered again
    await tx.cart.update({
      where: { id: cart.id },
      data: { status: 'CONVERTED' },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    await tx.auditLog.create({
      data: {
        userId,
        tenantId,
        action: 'ORDER_PLACED',
        entityType: 'Order',
        entityId: newOrder.id,
        after: { totalAmount, itemCount: cart.items.length, status: 'PENDING' },
      },
    });

    return newOrder;
  });

  // Queue emails (async, non-blocking)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (user) {
    await queueOrderConfirmationEmail(user.email, order);
  }

  // Notify the merchant who owns this tenant
  const merchant = await prisma.user.findFirst({
    where: { tenantId, role: 'MERCHANT' },
    select: { email: true },
  });
  if (merchant) {
    await queueMerchantOrderEmail(merchant.email, order);
  }

  return order;
}

/** List orders for the authenticated customer. */
async function listMyOrders(userId, query) {
  const args = buildPaginationArgs(query);

  const items = await prisma.order.findMany({
    ...args,
    where: { userId },
    include: {
      items: { include: { variant: { include: { product: { select: { title: true } } } } } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return buildPaginationMeta(items, args.take - 1);
}

/** List ALL orders for a tenant (merchant view). */
async function listTenantOrders(tenantId, query) {
  const args = buildPaginationArgs(query);
  const where = { tenantId };
  if (query.status) where.status = query.status;

  const items = await prisma.order.findMany({
    ...args,
    where,
    include: {
      user: { select: { id: true, email: true } },
      items: { include: { variant: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return buildPaginationMeta(items, args.take - 1);
}

/** Get a single order. Customers can only see their own. */
async function getOrder(orderId, userId, role) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { id: true, title: true } } } },
        },
      },
      payment: true,
      user: { select: { id: true, email: true } },
    },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (role === 'CUSTOMER' && order.userId !== userId) throw new ForbiddenError('Access denied');

  return order;
}

/**
 * Update order status — merchant only.
 * Valid transitions: PENDING → PAID → FULFILLED → REFUNDED | CANCELLED
 */
const VALID_TRANSITIONS = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLED', 'REFUNDED', 'CANCELLED'],
  FULFILLED: ['REFUNDED'],
  REFUNDED: [],
  CANCELLED: [],
};

async function updateOrderStatus(orderId, tenantId, newStatus, userId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) throw new NotFoundError('Order not found');

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition order from "${order.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    await tx.auditLog.create({
      data: {
        userId,
        tenantId,
        action: 'ORDER_STATUS_UPDATED',
        entityType: 'Order',
        entityId: orderId,
        before: { status: order.status },
        after: { status: newStatus },
      },
    });

    return result;
  });

  return updated;
}

/** Cancel an order — customer can cancel if still PENDING. */
async function cancelOrder(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (order.userId !== userId) throw new ForbiddenError('Access denied');
  if (order.status !== 'PENDING') {
    throw new ValidationError(
      `Cannot cancel order with status "${order.status}". Only PENDING orders can be cancelled.`
    );
  }

  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const inv = await tx.inventoryLevel.findFirst({ where: { variantId: item.variantId } });
      if (inv) {
        await tx.inventoryLevel.update({
          where: { id: inv.id },
          data: { reserved: Math.max(0, inv.reserved - item.quantity) },
        });
      }
    }

    const result = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    await tx.auditLog.create({
      data: {
        userId,
        tenantId: order.tenantId,
        action: 'ORDER_CANCELLED',
        entityType: 'Order',
        entityId: orderId,
        before: { status: 'PENDING' },
        after: { status: 'CANCELLED' },
      },
    });

    return result;
  });
}

/** Request refund — customer only, PAID or FULFILLED orders. */
async function refundOrder(userId, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (order.userId !== userId) throw new ForbiddenError('Access denied');
  if (!['PAID', 'FULFILLED'].includes(order.status)) {
    throw new ValidationError('Only PAID or FULFILLED orders can be refunded');
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' },
    });

    for (const item of order.items) {
      await tx.inventoryLevel.updateMany({
        where: { variantId: item.variantId },
        data: {
          reserved: { decrement: item.quantity },
          available: { increment: item.quantity },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        tenantId: order.tenantId,
        action: 'ORDER_REFUNDED',
        entityType: 'Order',
        entityId: orderId,
        before: { status: order.status },
        after: { status: 'REFUNDED' },
      },
    });

    return updated;
  });

  return { order: updatedOrder, message: 'Refund processed successfully' };
}

/** Order audit timeline — customer can view their own. */
async function getOrderTimeline(userId, orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  if (order.userId !== userId) throw new ForbiddenError('Access denied');

  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'Order', entityId: orderId },
    orderBy: { createdAt: 'asc' },
  });

  return {
    orderId,
    currentStatus: order.status,
    timeline: logs.map((log) => ({
      action: log.action,
      before: log.before,
      after: log.after,
      timestamp: log.createdAt,
    })),
  };
}

module.exports = {
  placeOrder,
  listMyOrders,
  listTenantOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  refundOrder,
  getOrderTimeline,
};