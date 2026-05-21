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
  EMAIL_FROM_ADDRESS: z.string().email().default('onboarding@resend.dev'),
  APP_URL: z.string().default('http://localhost:3000'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:8080'),
});

const raw = {
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
};

let env;
try {
  env = envSchema.parse(raw);
} catch (err) {
  console.error('❌ Invalid environment variables:');
  err.errors.forEach((e) => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

module.exports = env;
