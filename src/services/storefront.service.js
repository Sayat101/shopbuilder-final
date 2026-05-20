const { prisma } = require('../config/database');
const { NotFoundError } = require('../errors/AppError');

// Публичный каталог магазина по subdomain
async function getStorefront(subdomain) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant || tenant.status !== 'ACTIVE') {
    throw new NotFoundError('Store not found');
  }

  return { tenant: { id: tenant.id, subdomain: tenant.subdomain, plan: tenant.plan } };
}

// Публичный список продуктов магазина
async function getStorefrontProducts(subdomain, { cursor, limit = 20 }) {
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
  if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundError('Store not found');

  const take = parseInt(limit) + 1;
  const args = {
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    include: {
      variants: {
        include: { inventory: true },
      },
    },
    take,
    orderBy: { createdAt: 'desc' },
  };

  if (cursor) {
    args.cursor = { id: cursor };
    args.skip = 1;
  }

  const products = await prisma.product.findMany(args);
  const hasMore = products.length > parseInt(limit);
  if (hasMore) products.pop();

  return {
    data: products,
    meta: {
      hasMore,
      nextCursor: hasMore ? products[products.length - 1].id : null,
    },
  };
}

// Публичная страница продукта
async function getStorefrontProduct(subdomain, productId) {
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
  if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundError('Store not found');

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id, status: 'ACTIVE' },
    include: {
      variants: {
        include: { inventory: true },
      },
    },
  });

  if (!product) throw new NotFoundError('Product not found');
  return { product };
}

module.exports = { getStorefront, getStorefrontProducts, getStorefrontProduct };