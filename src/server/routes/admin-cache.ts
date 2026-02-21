import { Router, type Request, type Response } from 'express';
import { getCacheStats, clearCache } from '../services/cache.js';

const router = Router();

/**
 * GET /api/admin/cache-stats
 * Returns cache hit rates and analytics
 */
router.get('/cache-stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getCacheStats();
    res.json({
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cache statistics',
      },
    });
  }
});

/**
 * DELETE /api/admin/cache
 * Clears all cache entries
 */
router.delete('/cache', async (_req: Request, res: Response) => {
  try {
    const deletedCount = await clearCache();
    res.json({
      data: {
        message: 'Cache cleared successfully',
        deletedCount,
      },
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear cache',
      },
    });
  }
});

export default router;
