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
const cartRoutes    = require('./routes/cart.routes');    // NEW
const orderRoutes   = require('./routes/order.routes');   // NEW

const app = express();

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? ['https://shopbuilder.kz', 'https://admin.shopbuilder.kz']
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/auth',     authRoutes);
app.use('/tenants',  tenantRoutes);
app.use('/products', productRoutes);
app.use('/payments', paymentRoutes);
app.use('/cart',     cartRoutes);    // NEW
app.use('/orders',   orderRoutes);   // NEW

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
