const { z } = require('zod');

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MOCK_PAYMENT_SECRET: z.string().min(8),
  RESEND_API_KEY: z.string().min(1),
  APP_URL: z.string().default('http://localhost:3000'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().optional(),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('❌ Invalid environment variables:');
  err.errors.forEach((e) => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

module.exports = env;
