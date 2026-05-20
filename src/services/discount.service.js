const { prisma } = require('../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../errors/AppError');

// Создать промокод (MERCHANT)
async function createDiscount(tenantId, data) {
  const { code, type, value, minOrderAmount, isStackable, maxUsage, expiresAt } = data;

  const existing = await prisma.discountCode.findUnique({ where: { code } });
  if (existing) throw new ConflictError('Discount code already exists');

  const discount = await prisma.discountCode.create({
    data: {
      tenantId,
      code: code.toUpperCase(),
      type,
      value,
      minOrderAmount: minOrderAmount || null,
      isStackable: isStackable || false,
      maxUsage: maxUsage || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return { discount };
}

// Список промокодов (MERCHANT)
async function listDiscounts(tenantId) {
  const discounts = await prisma.discountCode.findMany({
    where: { tenantId },
    orderBy: { expiresAt: 'asc' },
  });
  return { discounts };
}

// Применить промокод — возвращает итоговую сумму
async function applyDiscount(tenantId, code, orderAmount) {
  const discount = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount) throw new NotFoundError('Discount code not found');
  if (discount.tenantId !== tenantId) throw new NotFoundError('Discount code not found');

  // Проверяем срок действия
  if (discount.expiresAt && new Date() > discount.expiresAt) {
    throw new ValidationError('Discount code has expired');
  }

  // Проверяем лимит использований
  if (discount.maxUsage && discount.usageCount >= discount.maxUsage) {
    throw new ValidationError('Discount code usage limit reached');
  }

  // Проверяем минимальную сумму заказа
  if (discount.minOrderAmount && orderAmount < discount.minOrderAmount) {
    throw new ValidationError(
      `Minimum order amount is ${discount.minOrderAmount} tiyn`
    );
  }

  // Считаем скидку
  let discountAmount = 0;
  if (discount.type === 'PERCENTAGE') {
    discountAmount = Math.floor((orderAmount * discount.value) / 100);
  } else if (discount.type === 'FIXED') {
    discountAmount = discount.value;
  }

  const finalAmount = Math.max(0, orderAmount - discountAmount);
  const VAT_RATE = 0.12; // 12% НДС Казахстан
  const vatAmount = Math.floor(finalAmount * VAT_RATE);
  const totalWithVat = finalAmount + vatAmount;

  return {
    originalAmount: orderAmount,
    discountAmount,
    finalAmount,
    vatAmount,
    totalWithVat,
    discountCode: discount.code,
    discountType: discount.type,
    isStackable: discount.isStackable,
  };

  // Увеличиваем счётчик использований
  await prisma.discountCode.update({
    where: { code: code.toUpperCase() },
    data: { usageCount: { increment: 1 } },
  });

  return {
    originalAmount: orderAmount,
    discountAmount,
    finalAmount,
    discountCode: discount.code,
    discountType: discount.type,
  };
}

// Удалить промокод (MERCHANT)
async function deleteDiscount(tenantId, discountId) {
  const discount = await prisma.discountCode.findUnique({
    where: { id: discountId },
  });

  if (!discount) throw new NotFoundError('Discount code not found');
  if (discount.tenantId !== tenantId) throw new NotFoundError('Discount code not found');

  await prisma.discountCode.delete({ where: { id: discountId } });

  return { message: 'Discount code deleted successfully' };
}

module.exports = { createDiscount, listDiscounts, applyDiscount, deleteDiscount };