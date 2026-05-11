
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const redis = require('./config/redis');
const env = require('./config/env');
const PORT = env.PORT || 3000;

async function start() {
  await redis.connect();
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(` ShopBuilder API running on http://localhost:${PORT}`);
    console.log(` Swagger docs: http://localhost:${PORT}/docs`);
  });

  // Graceful shutdown
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
