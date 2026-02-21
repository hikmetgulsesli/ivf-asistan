import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateQueryHash, getCachedResponse, cacheResponse, invalidateCache, clearCache, getCacheStats } from '../services/cache.js';

// Mock the prisma client
vi.mock('../db/connection.js', () => ({
  prisma: {
    responseCache: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db/connection.js';

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQueryHash', () => {
    it('should generate consistent SHA-256 hash for normalized queries', () => {
      const hash1 = generateQueryHash('  Test  Query  ');
      const hash2 = generateQueryHash('test query');
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should return different hashes for different queries', () => {
      const hash1 = generateQueryHash('What is IVF?');
      const hash2 = generateQueryHash('What is IUI?');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty-ish strings', () => {
      const hash = generateQueryHash('');
      expect(hash).toHaveLength(64);
    });
  });

  describe('getCachedResponse', () => {
    it('should return cached response when cache hit and not expired', async () => {
      const mockCached = {
        id: 1,
        queryHash: 'abc123',
        queryText: 'test query',
        response: 'test response',
        sources: null,
        hitCount: 1,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      };

      vi.mocked(prisma.responseCache.findFirst).mockResolvedValue(mockCached);
      vi.mocked(prisma.responseCache.update).mockResolvedValue({ ...mockCached, hitCount: 2 });

      const result = await getCachedResponse('abc123');

      expect(result).not.toBeNull();
      expect(result?.response).toBe('test response');
      expect(prisma.responseCache.update).toHaveBeenCalled();
    });

    it('should return null when cache miss', async () => {
      vi.mocked(prisma.responseCache.findFirst).mockResolvedValue(null);

      const result = await getCachedResponse('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      vi.mocked(prisma.responseCache.findFirst).mockRejectedValue(new Error('DB error'));

      const result = await getCachedResponse('abc123');

      expect(result).toBeNull();
    });
  });

  describe('cacheResponse', () => {
    it('should create new cache entry when query does not exist', async () => {
      const mockCreated = {
        id: 1,
        queryHash: 'abc123',
        queryText: 'test query',
        response: 'test response',
        sources: null,
        hitCount: 1,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      vi.mocked(prisma.responseCache.upsert).mockResolvedValue(mockCreated);

      const result = await cacheResponse('abc123', 'test query', 'test response', null);

      expect(result).not.toBeNull();
      expect(result?.queryHash).toBe('abc123');
      expect(prisma.responseCache.upsert).toHaveBeenCalled();
    });

    it('should update existing cache entry and increment hit count', async () => {
      const mockUpdated = {
        id: 1,
        queryHash: 'abc123',
        queryText: 'test query',
        response: 'updated response',
        sources: null,
        hitCount: 5,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      vi.mocked(prisma.responseCache.upsert).mockResolvedValue(mockUpdated);

      const result = await cacheResponse('abc123', 'test query', 'updated response', null);

      expect(result).not.toBeNull();
      expect(result?.hitCount).toBe(5);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.responseCache.upsert).mockRejectedValue(new Error('DB error'));

      const result = await cacheResponse('abc123', 'test query', 'test response', null);

      expect(result).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should delete all cache entries', async () => {
      vi.mocked(prisma.responseCache.deleteMany).mockResolvedValue({ count: 10 });

      const result = await invalidateCache();

      expect(result).toBe(10);
      expect(prisma.responseCache.deleteMany).toHaveBeenCalledWith({});
    });

    it('should return 0 on error', async () => {
      vi.mocked(prisma.responseCache.deleteMany).mockRejectedValue(new Error('DB error'));

      const result = await invalidateCache();

      expect(result).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should call invalidateCache', async () => {
      vi.mocked(prisma.responseCache.deleteMany).mockResolvedValue({ count: 5 });

      const result = await clearCache();

      expect(result).toBe(5);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct statistics', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const pastDate = new Date(Date.now() - 3600000);
      
      vi.mocked(prisma.responseCache.findMany).mockResolvedValue([
        { id: 1, queryHash: 'abc', queryText: 'q1', response: 'r1', sources: null, hitCount: 5, createdAt: new Date(), expiresAt: futureDate },
        { id: 2, queryHash: 'def', queryText: 'q2', response: 'r2', sources: null, hitCount: 3, createdAt: new Date(), expiresAt: futureDate },
        { id: 3, queryHash: 'ghi', queryText: 'q3', response: 'r3', sources: null, hitCount: 1, createdAt: new Date(), expiresAt: futureDate },
        { id: 4, queryHash: 'jkl', queryText: 'q4', response: 'r4', sources: null, hitCount: 2, createdAt: new Date(), expiresAt: pastDate },
      ]);

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(4);
      expect(stats.totalHits).toBe(11);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.averageHitCount).toBe(3); // (5+3+1)/3 = 3
    });

    it('should handle empty cache', async () => {
      vi.mocked(prisma.responseCache.findMany).mockResolvedValue([]);

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should return 0 on error', async () => {
      vi.mocked(prisma.responseCache.findMany).mockRejectedValue(new Error('DB error'));

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });
});
