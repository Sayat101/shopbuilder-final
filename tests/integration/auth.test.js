const request = require('supertest');
const app = require('../../src/app');

// Note: These tests require a running PostgreSQL + Redis
// Run with: docker compose up postgres redis -d first

describe('Auth Endpoints', () => {
  const testEmail = `test_${Date.now()}@shopbuilder.kz`;
  const testPassword = 'SecurePass123!';
  let accessToken;
  let refreshToken;

  
  
  describe('POST /auth/register', () => { 
    test('registers a new user successfully', async () => {
      const res = await request(app).post('/auth/register').send({
        email: testEmail,
        password: testPassword,
        role: 'MERCHANT',
        subdomain: `merchant-${Date.now()}`,
      });
      
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(testEmail);
      // Password must never be in response
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test('rejects duplicate email with 409', async () => {
      const res = await request(app).post('/auth/register').send({
        email: testEmail,
        password: testPassword,
      });
      expect(res.status).toBe(409);
    });

    test('rejects weak password with 422', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'new@test.kz',
        password: '123',
      });
      expect(res.status).toBe(422);
    });

    test('rejects invalid email with 422', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'not-an-email',
        password: 'SecurePass123!',
      });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      const { prisma } = require('../../src/config/database');
      await prisma.user.update({
        where: { email: testEmail },
        data: { emailVerified: true },
      });
    });  

    test('logs in successfully', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    test('rejects wrong password with 401', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });

    test('rejects unknown email with 401', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'nobody@nowhere.kz',
        password: 'anything',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me - Protected endpoint', () => {
    test('returns user with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });

    test('returns 401 with no token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    test('issues new access token', async () => {
      const res = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    test('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid' });
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC - Role restrictions', () => {
    let customerToken;

    beforeAll(async () => {
      const email = `customer_${Date.now()}@test.kz`;
      await request(app).post('/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'CUSTOMER',
      });
      const { prisma } = require('../../src/config/database');
      await prisma.user.update({ where: { email }, data: { emailVerified: true } });
      const login = await request(app).post('/auth/login').send({
        email,
        password: 'SecurePass123!',
      });
      customerToken = login.body.accessToken;
    });

    test('customer gets 403 on merchant-only endpoint', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ title: 'Test', price: 1000 });

      expect(res.status).toBe(403);
    });

    test('customer gets 403 on tenant creation', async () => {
      const res = await request(app)
        .post('/tenants')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ subdomain: 'test-store' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /auth/logout', () => {
    test('logs out and invalidates token', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });
});
