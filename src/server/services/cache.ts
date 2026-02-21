import crypto from 'crypto';
import { prisma } from '../db/connection.js';

const DEFAULT_TTL_HOURS = 24;

/**
 * Generate SHA-256 hash of normalized query text
 */
export function generateQueryHash(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Get cache TTL in hours from environment or use default
 */
function getCacheTtlHours(): number {
  const envTtl = process.env.CACHE_TTL_HOURS;
  if (envTtl) {
    const parsed = parseInt(envTtl, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TTL_HOURS;
}

/**
 * Cache entry interface
 */
export interface CacheEntry {
  id: number;
  queryHash: string;
  queryText: string;
  response: string;
  sources: unknown | null;
  hitCount: number;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Get cached response by query hash
 * Returns null if cache miss or expired
 */
export async function getCachedResponse(queryHash: string): Promise<CacheEntry | null> {
  try {
    const now = new Date();
    
    const cached = await prisma.responseCache.findFirst({
      where: {
        queryHash,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (cached) {
      // Increment hit count
      await prisma.responseCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } },
      });
    }

    return cached;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Cache a response for a query
 */
export async function cacheResponse(
  queryHash: string,
  queryText: string,
  response: string,
  sources: unknown = null
): Promise<CacheEntry | null> {
  try {
    const ttlHours = getCacheTtlHours();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const cached = await prisma.responseCache.upsert({
      where: { queryHash },
      update: {
        response,
        sources: sources as Parameters<typeof prisma.responseCache.update>[0]['data']['sources'],
        expiresAt,
        hitCount: { increment: 1 },
      },
      create: {
        queryHash,
        queryText,
        response,
        sources: sources as Parameters<typeof prisma.responseCache.create>[0]['data']['sources'],
        hitCount: 1,
        expiresAt,
      },
    });

    return cached;
  } catch (error) {
    console.error('Cache set error:', error);
    return null;
  }
}

/**
 * Invalidate all cache entries (for when new content is added)
 */
export async function invalidateCache(): Promise<number> {
  try {
    const result = await prisma.responseCache.deleteMany({});
    return result.count;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Clear all cache entries
 */
export async function clearCache(): Promise<number> {
  return invalidateCache();
}

/**
 * Get cache statistics for analytics
 */
export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  expiredEntries: number;
  hitRate: number;
  averageHitCount: number;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const now = new Date();

    // Get all entries
    const allEntries = await prisma.responseCache.findMany({
      select: {
        hitCount: true,
        expiresAt: true,
      },
    });

    const totalEntries = allEntries.length;
    const totalHits = allEntries.reduce((sum: number, entry) => sum + entry.hitCount, 0);
    const expiredEntries = allEntries.filter(entry => new Date(entry.expiresAt) < now).length;
    
    // Calculate average hit count for non-expired entries
    const validEntries = allEntries.filter(entry => new Date(entry.expiresAt) >= now);
    const averageHitCount = validEntries.length > 0
      ? validEntries.reduce((sum: number, entry) => sum + entry.hitCount, 0) / validEntries.length
      : 0;

    // Hit rate: entries with at least 2 hits / total valid entries
    const hitRateEntries = validEntries.filter(entry => entry.hitCount > 1);
    const hitRate = validEntries.length > 0
      ? (hitRateEntries.length / validEntries.length) * 100
      : 0;

    return {
      totalEntries,
      totalHits,
      expiredEntries,
      hitRate: Math.round(hitRate * 100) / 100,
      averageHitCount: Math.round(averageHitCount * 100) / 100,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      totalEntries: 0,
      totalHits: 0,
      expiredEntries: 0,
      hitRate: 0,
      averageHitCount: 0,
    };
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await prisma.responseCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}
