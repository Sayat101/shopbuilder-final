const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const { ConflictError, NotFoundError } = require('../errors/AppError');

/**
 * Mock payment processor.
 * MOCK_CARD → always SUCCESS
 * MOCK_FAIL → always FAILED
 */
async function processPayment({ orderId, amount, method, idempotencyKey, userId }) {
  // Check idempotency — same key returns same result
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return {
      paymentId: existing.id,
      status: existing.status,
      amount,
      method: existing.provider,
      transactedAt: existing.createdAt,
      idempotent: true,
    };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  if (order.status === 'PAID') throw new ConflictError('Order already paid');

  const paymentStatus = method === 'MOCK_FAIL' ? 'FAILED' : 'PAID';
  const orderStatus = method === 'MOCK_FAIL' ? 'CANCELLED' : 'PAID';

  // Atomic transaction: create payment + update order
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        orderId,
        provider: method,
        status: paymentStatus,
        idempotencyKey,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: orderStatus },
    });

    // If payment failed, release reserved inventory
    if (paymentStatus === 'FAILED') {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        const inv = await tx.inventoryLevel.findFirst({
          where: { variantId: item.variantId },
        });
        if (inv) {
          await tx.inventoryLevel.update({
            where: { id: inv.id },
            data: { reserved: Math.max(0, inv.reserved - item.quantity) },
          });
        }
      }
    }

    // Write audit log atomically
    await tx.auditLog.create({
      data: {
        userId,
        tenantId: order.tenantId,
        action: 'PAYMENT_PROCESSED',
        entityType: 'Payment',
        entityId: payment.id,
        after: { orderId, status: paymentStatus, amount, method },
      },
    });

    return payment;
  });

  return {
    paymentId: result.id,
    status: result.status,
    amount,
    method,
    transactedAt: result.createdAt,
  };
}

module.exports = { processPayment };
