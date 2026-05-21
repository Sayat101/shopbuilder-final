const { Queue, Worker } = require('bullmq');
const emailService = require('../services/email.service');
const env = require('../config/env');

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};

const emailQueue = new Queue('emails', { connection });

let emailWorker = null;

if (process.env.NODE_ENV !== 'test') {
  emailWorker = new Worker(
    'emails',
    async (job) => {
      const { type, data } = job.data;

      console.log(`Processing email job: ${type}`);

      switch (type) {
        case 'verification':
          await emailService.sendVerificationEmail(data.email, data.token);
          break;
        case 'password-reset':
          await emailService.sendPasswordResetEmail(data.email, data.token);
          break;
        case 'order-confirmation':
          await emailService.sendOrderConfirmationEmail(data.email, data.order);
          break;
        case 'payment-receipt':
          await emailService.sendPaymentReceiptEmail(data.email, data.order, data.payment);
          break;
        case 'abandoned-cart':
          await emailService.sendAbandonedCartEmail(data.email, data.itemList);
          break;
        case 'merchant-order':
          await emailService.sendMerchantOrderEmail(data.email, data.order);
          break;
        default:
          console.warn(`Unknown email type: ${type}`);
      }

      console.log(`Email sent: ${type} -> ${data.email}`);
    },
    {
      connection,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job.id} failed:`, err.message);
  });
}

async function queueVerificationEmail(email, token) {
  await emailQueue.add('send', { type: 'verification', data: { email, token } });
}

async function queuePasswordResetEmail(email, token) {
  await emailQueue.add('send', { type: 'password-reset', data: { email, token } });
}

async function queueOrderConfirmationEmail(email, order) {
  await emailQueue.add('send', { type: 'order-confirmation', data: { email, order } });
}

async function queuePaymentReceiptEmail(email, order, payment) {
  await emailQueue.add('send', { type: 'payment-receipt', data: { email, order, payment } });
}

async function queueMerchantOrderEmail(email, order) {
  await emailQueue.add('send', { type: 'merchant-order', data: { email, order } });
}

async function queueAbandonedCartEmail(email, items) {
  const itemList = items
    .map((i) => `${i.variant?.product?.title || i.variant?.sku || 'Product'} x${i.quantity}`)
    .join(', ');

  await emailQueue.add('send', {
    type: 'abandoned-cart',
    data: { email, itemList },
  });
}

module.exports = {
  emailQueue,
  emailWorker,
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueOrderConfirmationEmail,
  queuePaymentReceiptEmail,
  queueAbandonedCartEmail,
  queueMerchantOrderEmail,
};
