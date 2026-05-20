const { prisma } = require('../config/database');
const redis = require('../config/redis');

// Общая аналитика магазина (MERCHANT)
async function getOverview(tenantId) {
  const cacheKey = `analytics:overview:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [totalOrders, totalRevenue, pendingOrders, totalProducts, topProducts] =
    await Promise.all([
      prisma.order.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId, status: { in: ['PAID', 'FULFILLED'] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.product.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.orderItem.groupBy({
        by: ['variantId'],
        where: { order: { tenantId, status: { in: ['PAID', 'FULFILLED'] } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

  const topProductsWithNames = await Promise.all(
    topProducts.map(async (item) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { title: true } } },
      });
      return {
        variantId: item.variantId,
        sku: variant?.sku,
        productTitle: variant?.product?.title,
        totalSold: item._sum.quantity,
      };
    })
  );

  const result = {
    overview: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingOrders,
      totalProducts,
    },
    topProducts: topProductsWithNames,
  };

  // Кэшируем на 5 минут — избегаем full table scan на каждый запрос
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  return result;
}

// Аналитика инвентаря (MERCHANT)
async function getInventoryAnalytics(tenantId) {
  const cacheKey = `analytics:inventory:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const lowStock = await prisma.inventoryLevel.findMany({
    where: {
      available: { lte: 10 },
      variant: { product: { tenantId } },
    },
    include: {
      variant: {
        include: { product: { select: { title: true } } },
      },
      location: { select: { name: true, city: true } },
    },
    orderBy: { available: 'asc' },
    take: 20,
  });

  const deadStock = await prisma.inventoryLevel.findMany({
    where: {
      reserved: { gt: 0 },
      variant: { product: { tenantId } },
    },
    include: {
      variant: { select: { sku: true } },
      location: { select: { name: true } },
    },
    take: 20,
  });

  const result = {
    lowStock: lowStock.map((item) => ({
      sku: item.variant.sku,
      productTitle: item.variant.product.title,
      available: item.available,
      reserved: item.reserved,
      location: item.location.name,
      city: item.location.city,
    })),
    deadStock: deadStock.map((item) => ({
      sku: item.variant.sku,
      reserved: item.reserved,
      location: item.location.name,
    })),
  };

  // Кэшируем на 2 минуты
  await redis.setex(cacheKey, 120, JSON.stringify(result));

  return result;
}

// Выручка по дням за последние 30 дней
async function getRevenueByDay(tenantId) {
  const cacheKey = `analytics:revenue:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ['PAID', 'FULFILLED'] },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const revenueByDay = {};
  orders.forEach((order) => {
    const day = order.createdAt.toISOString().split('T')[0];
    revenueByDay[day] = (revenueByDay[day] || 0) + order.totalAmount;
  });

  const result = {
    revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue,
    })),
  };

  // Кэшируем на 10 минут
  await redis.setex(cacheKey, 600, JSON.stringify(result));

  return result;
}

module.exports = { getOverview, getInventoryAnalytics, getRevenueByDay };
