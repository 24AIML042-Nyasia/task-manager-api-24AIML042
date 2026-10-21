const request = require('supertest');
const app = require('../server');

// These tests cover task route protection.
// They do not require a live MongoDB connection — the auth middleware
// rejects all requests before any DB query is attempted.

describe('Task routes (auth protection)', () => {

  // ── GET /tasks ─────────────────────────────────────────────────────────────
  describe('GET /tasks', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /tasks ────────────────────────────────────────────────────────────
  describe('POST /tasks', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ id: 1, title: 'Test task' });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── PUT /tasks/:id ─────────────────────────────────────────────────────────
  describe('PUT /tasks/:id', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .put('/tasks/64a1b2c3d4e5f6a7b8c9d0e1')
        .send({ title: 'Updated task' });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── DELETE /tasks/:id ──────────────────────────────────────────────────────
  describe('DELETE /tasks/:id', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .delete('/tasks/64a1b2c3d4e5f6a7b8c9d0e1');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /cache-stats ───────────────────────────────────────────────────────
  describe('GET /cache-stats', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/cache-stats');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

});
