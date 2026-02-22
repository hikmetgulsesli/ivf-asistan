import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createAdminRouter } from '../routes/admin/index';
import { errorHandler } from '../middleware/error-handler';

// Mock the auth middleware for testing
vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).admin = { adminId: 1, username: 'admin' };
    next();
  },
}));

describe('Admin Stats API', () => {
  let app: express.Application;
  let mockPool: {
    query: ReturnType<typeof vi.fn>;
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());

    mockPool = {
      query: vi.fn(),
    };

    app.use('/api/admin', createAdminRouter(mockPool as unknown as import('pg').Pool));
    app.use(errorHandler);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should return comprehensive stats', async () => {
      // Mock all the queries in order
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // articles
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // faqs
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // videos
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // sessions
        .mockResolvedValueOnce({ rows: [{ total: '50', total_hits: '200' }] }) // cache
        .mockResolvedValueOnce({ rows: [{ date: '2024-01-01', count: '5' }] }) // daily
        .mockResolvedValueOnce({ rows: [{ messages: '500', sessions: '100' }] }) // totals messages
        .mockResolvedValueOnce({ rows: [{ count: '80' }] }) // conversations count
        .mockResolvedValueOnce({ rows: [{ sentiment: 'calm', count: '50' }] }) // sentiment
        .mockResolvedValueOnce({ rows: [{ content: 'test query', count: '10' }] }); // top queries

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('conversations');
      expect(response.body.data).toHaveProperty('cache');
      expect(response.body.data.conversations).toHaveProperty('daily');
      expect(response.body.data.conversations).toHaveProperty('totals');
      expect(response.body.data.conversations).toHaveProperty('sentimentDistribution');
      expect(response.body.data.conversations).toHaveProperty('topQueries');
    });

    it('should accept days parameter', async () => {
      // Reset mock to ensure clean state
      mockPool.query.mockClear();

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // articles
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // faqs
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // videos
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // sessions
        .mockResolvedValueOnce({ rows: [{ total: '50', total_hits: '200' }] }) // cache
        .mockResolvedValueOnce({ rows: [{ date: '2024-01-07', count: '5' }] }) // daily
        .mockResolvedValueOnce({ rows: [{ messages: '500', sessions: '100' }] }) // totals - messages/sessions
        .mockResolvedValueOnce({ rows: [{ count: '80' }] }) // totals - conversations
        .mockResolvedValueOnce({ rows: [{ sentiment: 'calm', count: '50' }] }) // sentiment
        .mockResolvedValueOnce({ rows: [{ content: 'test query', count: '10' }] }); // top queries

      const response = await request(app)
        .get('/api/admin/stats?days=7')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid days parameter', async () => {
      const response = await request(app)
        .get('/api/admin/stats?days=invalid')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for days out of range', async () => {
      const response = await request(app)
        .get('/api/admin/stats?days=500')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/conversations', () => {
    it('should return paginated conversations', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              sessionId: 'abc123def456',
              role: 'user',
              content: 'Merhaba',
              sentiment: 'calm',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
        });

      const response = await request(app)
        .get('/api/admin/conversations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/conversations?page=2&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(10);
    });

    it('should return 400 for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/admin/conversations?page=0')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });

    it('should return 400 for limit out of range', async () => {
      const response = await request(app)
        .get('/api/admin/conversations?limit=200')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/stats/sentiment', () => {
    it('should return sentiment distribution', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { sentiment: 'calm', count: '50' },
          { sentiment: 'anxious', count: '30' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/stats/sentiment')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('sentiment');
      expect(response.body.data[0]).toHaveProperty('count');
      expect(response.body.data[0]).toHaveProperty('percentage');
    });
  });

  describe('GET /api/admin/stats/queries', () => {
    it('should return top queries', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ content: 'tüp bebek nedir', count: '10' }],
      });

      const response = await request(app)
        .get('/api/admin/stats/queries')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should accept limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/stats/queries?limit=5')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/admin/stats/queries?limit=100')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/stats/daily', () => {
    it('should return daily stats', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ date: '2024-01-01', count: '5' }],
      });

      const response = await request(app)
        .get('/api/admin/stats/daily')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should accept days parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/stats/daily?days=7')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });
  });
});
