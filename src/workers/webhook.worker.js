const { Worker, Queue } = require('bullmq');
const { prisma } = require('../config/database');
const env = require('../config/env');
const fetch = require('node-fetch');
const crypto = require('crypto');
const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port) || 6379,
  maxRetriesPerRequest: null,
};

const webhookQueue = new Queue('webhooks', { connection });

// Worker: читает WebhookDelivery из БД и доставляет
const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    const { deliveryId } = job.data;

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.status === 'DELIVERED') return;

    try {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: delivery.endpointId },
});

if (!endpoint || !endpoint.isActive) return;

const payload = JSON.stringify(delivery.payload);
const signature = crypto
  .createHmac('sha256', endpoint.secret)
  .update(payload)
  .digest('hex');

const response = await fetch(endpoint.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-ShopBuilder-Signature': `sha256=${signature}`,
    'X-ShopBuilder-Event': delivery.eventType,
  },
  body: payload,
  timeout: 10000,
});

if (!response.ok) throw new Error(`HTTP ${response.status}`);

await prisma.webhookDelivery.update({
  where: { id: deliveryId },
  data: { status: 'DELIVERED', attemptCount: delivery.attemptCount + 1 },
});

      console.log(`✅ Webhook delivered: ${deliveryId}`);
    } catch (err) {
      const nextAttempt = delivery.attemptCount + 1;
      // Exponential backoff: 2^n * 5 seconds (5s, 10s, 20s, 40s...)
      const backoffMs = Math.pow(2, nextAttempt) * 5000;
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: nextAttempt >= 5 ? 'FAILED' : 'RETRYING',
          attemptCount: nextAttempt,
          nextRetryAt,
        },
      });

      throw err; // BullMQ сам сделает retry
    }
  },
  {
    connection,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s, 40s, 80s
  }
);

webhookWorker.on('completed', (job) => {
  console.log(`✅ Webhook job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`❌ Webhook job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

// Helper: поставить webhook в очередь
async function queueWebhookDelivery(endpointId, eventType, payload) {
  // Создаём запись в БД
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId,
      eventType,
      payload,
      status: 'PENDING',
      attemptCount: 0,
    },
  });

  // Ставим в очередь
  await webhookQueue.add('deliver', { deliveryId: delivery.id });

  return delivery;
}

module.exports = { webhookQueue, queueWebhookDelivery };