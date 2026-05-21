const { Queue, Worker } = require('bullmq');
const env = require('../config/env');
const { prisma } = require('../config/database');
const { queueAbandonedCartEmail } = require('./email.worker');

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

const queue = new Queue('abandoned-cart-scan', { connection });

if (process.env.NODE_ENV !== 'test') {
  queue.add(
    'scan',
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'abandoned-hourly' }
  );

  new Worker(
    'abandoned-cart-scan',
    async () => {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const carts = await prisma.cart.findMany({
        where: { status: 'ACTIVE', updatedAt: { lt: cutoff } },
        include: {
          user: true,
          items: {
            include: {
              variant: {
                include: { product: { select: { title: true } } },
              },
            },
          },
        },
      });
      for (const cart of carts) {
        if (!cart.items.length) continue;
        await prisma.cart.update({
          where: { id: cart.id },
          data: { status: 'ABANDONED' },
        });
        if (cart.user?.email) {
          await queueAbandonedCartEmail(cart.user.email, cart.items);
        }
      }
      console.log(`Abandoned cart scan: ${carts.length} carts processed`);
    },
    { connection }
  );
}

module.exports = { queue };
