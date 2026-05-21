const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const redis = require('./config/redis');
const env = require('./config/env');

const PORT = env.PORT || 3000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShopBuilder API running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/docs`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      await redis.quit();
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