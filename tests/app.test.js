const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

function makeToken({ id = '11111111-1111-1111-1111-111111111111', email = 't@example.com', role = 'viewer' } = {}) {
  // Auth middleware only checks signature + role; for these RBAC tests we avoid hitting DB by expecting 401/403 gates first.
  return jwt.sign({ id, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});

describe('Auth validation', () => {
  it('POST /api/auth/login rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('POST /api/auth/register rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
  });
});

describe('Protected routes without JWT', () => {
  it('GET /api/records returns 401', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  it('GET /api/users/me returns 401', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/audit/logs returns 401', async () => {
    const res = await request(app).get('/api/audit/logs');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/users/:id returns 401', async () => {
    const res = await request(app).patch('/api/users/any-id');
    expect(res.status).toBe(401);
  });
});

describe('RBAC: permission checks (no DB required)', () => {
  it('viewer cannot create records (POST /api/records) -> 403', async () => {
    const tokenViewer = makeToken({ role: 'viewer' });
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({}); // invalid body is fine; allowRoles should block first
    expect(res.status).toBe(403);
  });

  it('viewer cannot generate insights -> 403', async () => {
    const tokenViewer = makeToken({ role: 'viewer' });
    const res = await request(app)
      .post('/api/analytics/insights/generate')
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('analyst cannot view audit logs -> 403', async () => {
    const tokenAnalyst = makeToken({ role: 'analyst' });
    const res = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${tokenAnalyst}`);
    expect(res.status).toBe(403);
  });

  it('viewer cannot patch users (role/status mgmt) -> 403', async () => {
    const tokenViewer = makeToken({ role: 'viewer' });
    const res = await request(app)
      .patch('/api/users/some-user-id')
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });
});
