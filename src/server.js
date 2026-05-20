const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const redis = require('./config/redis');
const env = require('./config/env');
const { Queue } = require('bullmq');

const PORT = env.PORT || 3000;

async function start() {
  await connectDB();

  // Cron: проверка брошенных корзин каждые 30 минут
  const connection = {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port) || 6379,
    maxRetriesPerRequest: null,
  };

  const abandonedCartQueue = new Queue('abandoned-cart', { connection });
  await abandonedCartQueue.add('check', {}, {
    repeat: { every: 30 * 60 * 1000 }
  });

  const server = app.listen(PORT, () => {
    console.log(`ShopBuilder API running on http://localhost:${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/docs`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      await redis.quit();
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});