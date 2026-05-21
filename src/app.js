const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('yaml');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const errorHandler = require('./middleware/errorHandler');
const authRoutes    = require('./routes/auth.routes');
const tenantRoutes  = require('./routes/tenant.routes');
const productRoutes = require('./routes/product.routes');
const paymentRoutes = require('./routes/payment.routes');
const cartRoutes    = require('./routes/cart.routes');
const orderRoutes   = require('./routes/order.routes');
const discountRoutes = require('./routes/discount.routes');
const webhookRoutes = require('./routes/webhook.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const storefrontRoutes = require('./routes/storefront.routes');
const abandonedCartRoutes = require('./routes/abandonedCart.routes');
const app = express();

// require('./workers/email.worker');
// require('./workers/webhook.worker');

// ─── CORS ─────────────────────────────────────────────────────
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:8080'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// ─── BODY PARSING ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── SWAGGER UI ───────────────────────────────────────────────
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: { url: '/openapi.yaml' },
  })
);
app.use('/openapi.yaml', express.static(path.join(__dirname, '../openapi.yaml')));

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/auth',     authRoutes);
app.use('/tenants',  tenantRoutes);
app.use('/products', productRoutes);
app.use('/payments', paymentRoutes);
app.use('/cart',     cartRoutes); 
app.use('/orders',   orderRoutes);   
app.use('/discounts', discountRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/storefront', storefrontRoutes);
app.use('/cart', abandonedCartRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);
module.exports = app;
