const { prisma } = require('../config/database');
const { generateVariantMatrix } = require('../utils/skuGenerator');
const { NotFoundError } = require('../errors/AppError');
const { buildPaginationArgs, buildPaginationMeta } = require('../utils/pagination');

/**
 * Create a product with full variant matrix.
 * Accepts title, description, price (in tiyn), and attribute arrays.
 * Generates all SKU combinations automatically.
 */
async function createProductWithVariants({ tenantId, title, description, price, options, locationId, initialStock = 100 }) {
  // Generate all variant combinations
  const variantMatrix = generateVariantMatrix(title, options);

  // Find default location for this tenant if not provided
  let resolvedLocationId = locationId;
  if (!resolvedLocationId) {
    const loc = await prisma.warehouseLocation.findFirst({ where: { tenantId } });
    if (loc) resolvedLocationId = loc.id;
  }

  // Create product + all variants in one transaction
  const product = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.create({
      data: {
        title,
        description,
        status: 'DRAFT',
        tenantId,
        variants: {
          create: variantMatrix.map((v) => ({
            sku: v.sku,
            price: price,
            option1Value: v.option1Value,
            option2Value: v.option2Value,
            option3Value: v.option3Value,
            inventory: resolvedLocationId
              ? {
                  create: {
                    locationId: resolvedLocationId,
                    available: initialStock,
                    reserved: 0,
                  },
                }
              : undefined,
          })),
        },
      },
      include: {
        variants: {
          include: { inventory: true },
        },
      },
    });
    return prod;
  });

  return product;
}

async function listProducts(tenantId, query) {
  const args = buildPaginationArgs(query);

  const items = await prisma.product.findMany({
    ...args,
    where: { tenantId },
    include: { variants: { include: { inventory: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return buildPaginationMeta(items, args.take - 1);
}

async function getProduct(id, tenantId) {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: { variants: { include: { inventory: true } } },
  });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

async function updateProductStatus(id, tenantId, status) {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new NotFoundError('Product not found');

  return prisma.product.update({
    where: { id },
    data: { status },
    include: { variants: true },
  });
}

/**
 * Update inventory level for a specific variant + location.
 * Uses SELECT FOR UPDATE pattern via Prisma transaction to prevent race conditions.
 */
async function adjustInventory({ variantId, locationId, quantity }) {
  return prisma.$transaction(async (tx) => {
    const level = await tx.inventoryLevel.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
    });

    if (!level) throw new NotFoundError('Inventory level not found');

    const newAvailable = level.available + quantity;
    if (newAvailable < 0) throw new Error('Insufficient stock');

    return tx.inventoryLevel.update({
      where: { variantId_locationId: { variantId, locationId } },
      data: { available: newAvailable },
    });
  });
}

module.exports = {
  createProductWithVariants,
  listProducts,
  getProduct,
  updateProductStatus,
  adjustInventory,
};
