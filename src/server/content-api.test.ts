import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

const { mockPool } = vi.hoisted(() => ({
  mockPool: {
    query: vi.fn(),
  },
}));

vi.mock('./db/connection.js', () => {
  return {
    getPool: () => mockPool,
    pool: mockPool,
  };
});

vi.mock('./services/cache.js', () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}));

import articlesRouter from './routes/articles';

// Setup test app
const app = express();
app.use(cors());
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  (req as unknown as { admin: { adminId: number; username: string } }).admin = { adminId: 1, username: 'admin' };
  next();
});

app.use('/api/admin/articles', articlesRouter);

// Test data
const mockArticle = {
  id: 1,
  title: 'Test Article',
  content: 'Test content for IVF treatment',
  category: 'treatment',
  tags: ['ivf', 'fertility'],
  status: 'published',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

describe('Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/articles', () => {
    it('should return paginated articles', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: [mockArticle] }); // data query

      const response = await request(app).get('/api/admin/articles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.total).toBe(1);
    });

    it('should filter by category', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockArticle] });

      const response = await request(app).get('/api/admin/articles?category=treatment');

      expect(response.status).toBe(200);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by status', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockArticle] });

      const response = await request(app).get('/api/admin/articles?status=published');

      expect(response.status).toBe(200);
    });

    it('should handle pagination params', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({ rows: [mockArticle] });

      const response = await request(app).get('/api/admin/articles?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(10);
    });
  });

  describe('GET /api/admin/articles/:id', () => {
    it('should return article by id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockArticle] });

      const response = await request(app).get('/api/admin/articles/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: 1,
        title: 'Test Article',
        category: 'treatment',
        status: 'published'
      });
    });

    it('should return 404 for non-existent article', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/admin/articles/999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).get('/api/admin/articles/abc');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/admin/articles', () => {
    it('should create article with valid input', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockArticle] });

      const response = await request(app)
        .post('/api/admin/articles')
        .send({
          title: 'Test Article',
          content: 'Test content',
          category: 'treatment',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/admin/articles')
        .send({
          title: 'Test Article',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/admin/articles/:id', () => {
    it('should update article with valid input', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockArticle, title: 'Updated Title' }] });

      const response = await request(app)
        .put('/api/admin/articles/1')
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent article', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/admin/articles/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app)
        .put('/api/admin/articles/abc')
        .send({ title: 'Updated' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/articles/:id', () => {
    it('should delete article', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app).delete('/api/admin/articles/1');

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent article', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const response = await request(app).delete('/api/admin/articles/999');

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).delete('/api/admin/articles/abc');

      expect(response.status).toBe(400);
    });
  });
});
