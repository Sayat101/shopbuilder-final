const { z } = require('zod');
const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const { prisma } = require('../config/database');

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().int().positive(),
  options: z.object({
    colors: z.array(z.string()).optional(),
    sizes: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
  }).optional(),
  locationId: z.string().optional(),
});

const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const tenantId = req.user.tenantId || req.body.tenantId;

  const product = await productService.createProductWithVariants({
    tenantId,
    ...data,
  });

  res.status(201).json({ product });
});

const list = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId || req.query.tenantId;
  const result = await productService.listProducts(tenantId, req.query);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId || req.query.tenantId;
  const product = await productService.getProduct(req.params.id, tenantId);
  res.json({ product });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']) }).parse(req.body);
  const tenantId = req.user.tenantId;
  const product = await productService.updateProductStatus(req.params.id, tenantId, status);
  res.json({ product });
});

const adjustInventory = asyncHandler(async (req, res) => {
  const data = z.object({
    variantId: z.string(),
    locationId: z.string(),
    quantity: z.number().int(),
  }).parse(req.body);

  const level = await productService.adjustInventory(data);
  res.json({ inventoryLevel: level });
});

// Обновить продукт (title, description)
async function update(req, res, next) {
  try {
    const { title, description } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { title, description },
    });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// Архивировать продукт
async function archive(req, res, next) {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// Получить варианты продукта
async function getVariants(req, res, next) {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: req.params.id },
      include: { inventory: true },
    });
    res.json({ variants });
  } catch (err) {
    next(err);
  }
}

// Обновить цену варианта
async function updateVariant(req, res, next) {
  try {
    const { price } = req.body;
    const variant = await prisma.productVariant.update({
      where: { id: req.params.variantId },
      data: { price },
    });
    res.json({ variant });
  } catch (err) {
    next(err);
  }
}

// Список складов
async function listLocations(req, res, next) {
  try {
    const locations = await prisma.warehouseLocation.findMany({
      where: { tenantId: req.user.tenantId },
      include: { inventory: true },
    });
    res.json({ locations });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, updateStatus, adjustInventory, update, archive, getVariants, updateVariant, listLocations};
