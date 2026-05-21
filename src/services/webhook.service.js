const { prisma } = require('../config/database');
const { NotFoundError, ConflictError } = require('../errors/AppError');
const crypto = require('crypto');
const { webhookQueue } = require('../workers/webhook.worker');

// Зарегистрировать webhook endpoint (MERCHANT)
async function createEndpoint(tenantId, data) {
  const { url, events } = data;

  const secret = crypto.randomBytes(32).toString('hex');

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      tenantId,
      url,
      events,
      secret,
      isActive: true,
    },
  });

  return { endpoint, secret };
}

// Список endpoints (MERCHANT)
async function listEndpoints(tenantId) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
      // secret намеренно не возвращаем
    },
  });
  return { endpoints };
}

// История доставок (MERCHANT)
async function listDeliveries(tenantId) {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      endpoint: { tenantId },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return { deliveries };
}

// Тестовый webhook вызов
async function testEndpoint(tenantId, endpointId) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
  if (endpoint.tenantId !== tenantId) throw new NotFoundError('Webhook endpoint not found');

  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId,
      eventType: 'webhook.test',
      payload: { message: 'Test webhook from ShopBuilder', timestamp: new Date() },
      status: 'PENDING',
      attemptCount: 0,
    },
  });

  await webhookQueue.add('deliver', { deliveryId: delivery.id });

  return { message: 'Test webhook queued', deliveryId: delivery.id };
}

// Удалить endpoint
async function deleteEndpoint(tenantId, endpointId) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
  if (endpoint.tenantId !== tenantId) throw new NotFoundError('Webhook endpoint not found');

  await prisma.webhookEndpoint.delete({ where: { id: endpointId } });
  return { message: 'Webhook endpoint deleted' };
}

module.exports = { createEndpoint, listEndpoints, listDeliveries, testEndpoint, deleteEndpoint };
