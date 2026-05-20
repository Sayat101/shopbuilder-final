const { prisma } = require('../config/database');
const { queueAbandonedCartEmail } = require('../workers/email.worker');

// Найти брошенные корзины (не обновлялись 1 час и статус ACTIVE)
async function getAbandonedCarts(tenantId) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const carts = await prisma.cart.findMany({
    where: {
      status: 'ACTIVE',
      updatedAt: { lte: oneHourAgo },
      items: { some: {} }, // корзина не пустая
      user: { tenantId },
    },
    include: {
      user: { select: { id: true, email: true } },
      items: {
        include: {
          variant: {
            include: { product: { select: { title: true } } },
          },
        },
      },
    },
  });

  // Помечаем как ABANDONED
  await prisma.cart.updateMany({
    where: {
      id: { in: carts.map((c) => c.id) },
    },
    data: { status: 'ABANDONED' },
  });

  return { abandonedCarts: carts, count: carts.length };
}

// Отправить recovery email вручную
async function recoverCart(tenantId, cartId) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      user: { select: { email: true, tenantId: true } },
      items: {
        include: {
          variant: {
            include: { product: { select: { title: true } } },
          },
        },
      },
    },
  });

  if (!cart) throw new Error('Cart not found');
  if (cart.user.tenantId !== tenantId) throw new Error('Cart not found');

  // Обновляем статус
  await prisma.cart.update({
    where: { id: cartId },
    data: { status: 'RECOVERY_SENT' },
  });

  // Отправляем email через BullMQ
  await queueAbandonedCartEmail(cart.user.email, cart.items);

  return { message: 'Recovery email sent', cartId };
}

module.exports = { getAbandonedCarts, recoverCart };