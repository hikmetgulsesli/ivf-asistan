import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('POST /api/admin/auth/login', () => {
  beforeAll(async () => {
    const { initializeAdmin } = await import('../services/auth-service.js');
    await initializeAdmin();
  });

  it('returns JWT on valid credentials', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'ivf2024' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data.admin.username).toBe('admin');
  });

  it('returns 401 on invalid credentials', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });

  it('returns 400 on missing username', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ password: 'ivf2024' });

    expect(response.status).toBe(400);
  });

  it('returns 400 on missing password', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin' });

    expect(response.status).toBe(400);
  });
});

describe('Protected Admin Routes', () => {
  beforeAll(async () => {
    const { initializeAdmin } = await import('../services/auth-service.js');
    await initializeAdmin();
  });

  it('returns 401 without valid JWT', async () => {
    const response = await request(app)
      .get('/api/admin/status');

    expect(response.status).toBe(401);
  });

  it('returns 401 with invalid JWT', async () => {
    const response = await request(app)
      .get('/api/admin/status')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('returns 200 with valid JWT', async () => {
    const loginResponse = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'ivf2024' });

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .get('/api/admin/status')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.authenticated).toBe(true);
    expect(response.body.data.username).toBe('admin');
  });
});
