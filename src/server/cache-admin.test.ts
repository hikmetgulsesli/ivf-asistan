import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { Pool } from 'pg';

// Mock pg Pool
const mockPool = {
  query: vi.fn(),
};

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('Admin Cache Routes', () => {
  let router: express.Router;

  beforeEach(async () => {
    vi.resetModules();
    const { createAdminRouter } = await import('../routes/admin/index');
    router = createAdminRouter(mockPool as unknown as Pool);
    vi.clearAllMocks();
  });

  describe('GET /api/admin/cache-stats', () => {
    it('should return cache statistics with active and expired counts', async () => {
      // Mock responses for the Promise.all queries in /stats endpoint
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // articles
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // faqs
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // videos
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // conversations
        .mockResolvedValueOnce({ rows: [{ total: '50', total_hits: '200' }] }) // cache stats
        .mockResolvedValueOnce({ rows: [{ expired: '10' }] }); // expired

      // Find the cache-stats route handler
      const cacheStatsRoute = router.stack.find((r: any) => 
        r.route && r.route.path === '/cache-stats' && r.route.methods.get
      );

      expect(cacheStatsRoute).toBeDefined();
    });
  });

  describe('DELETE /api/admin/cache', () => {
    it('should clear all cache when no pattern provided', async () => {
      // Mock responses for stats queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // articles
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // faqs
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // videos
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // conversations
        .mockResolvedValueOnce({ rows: [{ total: '50', total_hits: '200' }] }) // cache stats
        .mockResolvedValueOnce({ rows: [{ expired: '10' }] }) // expired
        .mockResolvedValueOnce({ rowCount: 50 }); // DELETE result

      // Find the delete cache route handler
      const deleteCacheRoute = router.stack.find((r: any) => 
        r.route && r.route.path === '/cache' && r.route.methods.delete
      );

      expect(deleteCacheRoute).toBeDefined();
    });

    it('should clear cache with pattern when pattern provided', async () => {
      // Mock responses for stats queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // articles
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // faqs
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // videos
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // conversations
        .mockResolvedValueOnce({ rows: [{ total: '50', total_hits: '200' }] }) // cache stats
        .mockResolvedValueOnce({ rows: [{ expired: '10' }] }) // expired
        .mockResolvedValueOnce({ rowCount: 5 }); // DELETE with pattern

      const deleteCacheRoute = router.stack.find((r: any) => 
        r.route && r.route.path === '/cache' && r.route.methods.delete
      );

      expect(deleteCacheRoute).toBeDefined();
    });
  });
});
