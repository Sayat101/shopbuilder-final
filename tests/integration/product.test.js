const request = require('supertest');
const app = require('../../src/app');

describe('Product Variant Matrix', () => {
  let merchantToken;
  let tenantId;

  beforeAll(async () => {
    // Register merchant
    const reg = await request(app).post('/auth/register').send({
      email: `merchant_${Date.now()}@test.kz`,
      password: 'SecurePass123!',
      role: 'MERCHANT',
      tenantId: 'test_tenant',
    });
    merchantToken = reg.body.accessToken;
    tenantId = reg.body.user.tenantId;
  });

  test('creates product with full variant matrix', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        title: 'Sweater',
        description: 'Warm sweater',
        price: 15000,
        options: {
          colors: ['Red', 'Blue'],
          sizes: ['S', 'M', 'L'],
        },
        tenantId,
      });

    expect(res.status).toBe(201);
    expect(res.body.product.variants).toHaveLength(6); // 2 × 3
    
    const skus = res.body.product.variants.map((v) => v.sku);
    expect(skus).toContain('SWEATER-RED-S');
    expect(skus).toContain('SWEATER-BLUE-L');
    
    // All SKUs must be unique
    expect(new Set(skus).size).toBe(6);
  });

  test('each variant has independent inventory', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        title: 'Jacket',
        price: 25000,
        options: { colors: ['Black', 'White'] },
        tenantId,
      });

    expect(res.status).toBe(201);
    const variants = res.body.product.variants;
    expect(variants).toHaveLength(2);
    // Each variant has its own inventory level
    variants.forEach((v) => {
      expect(v.inventory).toBeDefined();
    });
  });

  test('unauthenticated request is rejected with 401', async () => {
    const res = await request(app).post('/products').send({ title: 'Test', price: 1000 });
    expect(res.status).toBe(401);
  });
});
