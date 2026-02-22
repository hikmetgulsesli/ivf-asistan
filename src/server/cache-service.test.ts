import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock pg Pool
const mockPool = {
  query: vi.fn(),
};

describe('CacheService', () => {
  let CacheService: any;
  let cacheService: any;

  beforeEach(async () => {
    vi.resetModules();
    const { CacheService: CS } = await import('../services/cache-service');
    CacheService = CS;
    cacheService = new CacheService(mockPool as any, 24);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache stores response with query_hash key', () => {
    it('should hash query using SHA-256', () => {
      const query = 'Test query';
      const hash = cacheService.hashQuery(query);
      
      const expectedHash = crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
      expect(hash).toBe(expectedHash);
      expect(hash).toHaveLength(64); // SHA-256 hex is 64 chars
    });

    it('should normalize query by trimming and lowercasing', () => {
      const query = '  Test Query  ';
      const hash = cacheService.hashQuery(query);
      
      const expectedHash = crypto.createHash('sha256').update('test query').digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should store cache entry with correct query_hash', async () => {
      const query = 'Test question about IVF';
      const response = 'Test answer';
      const sources = [{ type: 'article', id: 1, title: 'Test Article' }];

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await cacheService.set(query, response, sources as any);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO response_cache'),
        expect.arrayContaining([
          expect.any(String), // query_hash
          query,
          response,
          expect.any(String), // stringified sources
          expect.any(Date),  // expires_at
        ])
      );
    });
  });

  describe('Cache hit returns stored response', () => {
    it('should return cached response when query matches', async () => {
      const query = 'Test query';
      const cachedResponse = {
        query_text: query,
        response: 'Cached answer',
        sources: [{ type: 'article', id: 1, title: 'Test Article' }],
        hit_count: 5,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...cachedResponse, id: 1 }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await cacheService.get(query);

      expect(result).not.toBeNull();
      expect(result?.response).toBe('Cached answer');
      expect(result?.hit_count).toBe(6); // incremented
    });

    it('should return null when no cache entry exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cacheService.get('Nonexistent query');

      expect(result).toBeNull();
    });
  });

  describe('Cache expires after TTL', () => {
    it('should not return expired cache entries', async () => {
      // The cache service query uses: expires_at > NOW()
      // So expired entries won't be returned - query returns empty rows
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cacheService.get('Expired query');

      // When the query returns no rows (because expired), result should be null
      expect(result).toBeNull();
    });

    it('should calculate TTL correctly', () => {
      const cacheService24h = new CacheService(mockPool as any, 24);
      const cacheService1h = new CacheService(mockPool as any, 1);

      expect(cacheService24h['ttlMs']).toBe(24 * 60 * 60 * 1000);
      expect(cacheService1h['ttlMs']).toBe(60 * 60 * 1000);
    });

    it('should use default TTL of 24 hours', () => {
      const defaultCacheService = new CacheService(mockPool as any);
      expect(defaultCacheService['ttlMs']).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('New content invalidates related cache entries', () => {
    it('should invalidate cache with pattern', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 3 });

      const deletedCount = await cacheService.invalidate('IVF');

      expect(deletedCount).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM response_cache WHERE query_text ILIKE $1',
        ['%IVF%']
      );
    });

    it('should clear all cache when no pattern provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 10 });

      const deletedCount = await cacheService.invalidate();

      expect(deletedCount).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM response_cache');
    });
  });

  describe('GET /api/admin/cache-stats returns hit rates', () => {
    it('should return correct stats structure', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '100', total_hits: '500' }] });

      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('avgHits');
      expect(stats.totalEntries).toBe(100);
      expect(stats.totalHits).toBe(500);
      expect(stats.avgHits).toBe(5);
    });

    it('should handle zero entries', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '0', total_hits: '0' }] });

      const stats = await cacheService.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.avgHits).toBe(0);
    });
  });
});
