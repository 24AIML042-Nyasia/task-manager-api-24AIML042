const request = require('supertest');
const app = require('../server');

// These tests cover the public auth endpoints.
// No MongoDB connection is needed for the 401/400 responses tested here
// since the middleware rejects before any DB query.

describe('Auth routes', () => {

  // ── POST /auth/register ────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    test('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ password: 'password123' });
      expect(res.statusCode).toBe(200); // deliberately wrong for CI failure screenshot
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: '123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    test('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /auth/me ───────────────────────────────────────────────────────────
  describe('GET /auth/me', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

});
