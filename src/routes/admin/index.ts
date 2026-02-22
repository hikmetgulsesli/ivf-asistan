import express from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { StatsService } from '../../services/stats-service';
import { ValidationError } from '../../utils/errors';

const router = express.Router();

export function createAdminRouter(pool: Pool): express.Router {
  const statsService = new StatsService(pool);

  router.use(authMiddleware);

  // Status endpoint for auth verification
  router.get('/status', (req: AuthenticatedRequest, res) => {
    res.json({
      data: {
        authenticated: true,
        adminId: req.admin?.adminId,
        username: req.admin?.username,
      },
    });
  });

  /**
   * GET /api/admin/stats
   * Returns comprehensive stats including daily counts, totals, sentiment distribution, and top queries
   */
  router.get('/stats', async (req, res, next) => {
    try {
      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string, 10);

      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        throw new ValidationError([{ field: 'days', message: 'Days must be between 1 and 365' }]);
      }

      const [contentStats, statsSummary] = await Promise.all([
        // Existing content stats
        Promise.all([
          pool.query('SELECT COUNT(*) as count FROM articles WHERE status = $1', ['published']),
          pool.query('SELECT COUNT(*) as count FROM faqs'),
          pool.query('SELECT COUNT(*) as count FROM videos WHERE analysis_status = $1', ['done']),
          pool.query('SELECT COUNT(DISTINCT session_id) as count FROM conversations'),
          pool.query('SELECT COUNT(*) as total, COALESCE(SUM(hit_count), 0) as total_hits FROM response_cache'),
        ]),
        // New stats summary
        statsService.getStatsSummary(daysNum),
      ]);

      const [articleCount, faqCount, videoCount, conversationCount, cacheStats] = contentStats;

      const totalEntries = parseInt(cacheStats.rows[0].total);
      const totalHits = parseInt(cacheStats.rows[0].total_hits);
      const avgHits = totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) / 100 : 0;

      res.json({
        data: {
          content: {
            articles: parseInt(articleCount.rows[0].count),
            faqs: parseInt(faqCount.rows[0].count),
            videos: parseInt(videoCount.rows[0].count),
          },
          conversations: {
            sessions: parseInt(conversationCount.rows[0].count),
            totals: statsSummary.totals,
            daily: statsSummary.daily,
            sentimentDistribution: statsSummary.sentimentDistribution,
            topQueries: statsSummary.topQueries,
          },
          cache: {
            totalEntries,
            totalHits,
            avgHits,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/admin/conversations
   * Returns paginated recent conversations (anonymized, no PII)
   */
  router.get('/conversations', async (req, res, next) => {
    try {
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        throw new ValidationError([{ field: 'page', message: 'Page must be a positive number' }]);
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ValidationError([{ field: 'limit', message: 'Limit must be between 1 and 100' }]);
      }

      const result = await statsService.getRecentConversations(pageNum, limitNum);

      res.json({
        data: result.conversations,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/admin/stats/sentiment
   * Returns sentiment distribution data for charts
   */
  router.get('/stats/sentiment', async (_req, res, next) => {
    try {
      const sentimentDistribution = await statsService.getSentimentDistribution();

      res.json({
        data: sentimentDistribution,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/admin/stats/queries
   * Returns top queries data
   */
  router.get('/stats/queries', async (req, res, next) => {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        throw new ValidationError([{ field: 'limit', message: 'Limit must be between 1 and 50' }]);
      }

      const topQueries = await statsService.getTopQueries(limitNum);

      res.json({
        data: topQueries,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/admin/stats/daily
   * Returns daily conversation counts
   */
  router.get('/stats/daily', async (req, res, next) => {
    try {
      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string, 10);

      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        throw new ValidationError([{ field: 'days', message: 'Days must be between 1 and 365' }]);
      }

      const dailyStats = await statsService.getDailyStats(daysNum);

      res.json({
        data: dailyStats,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/reindex', async (_req, res) => {
    res.json({
      data: {
        status: 'queued',
        message: 'Reindexing job queued. This feature is not yet implemented.',
      },
    });
  });

  router.get('/cache-stats', async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE expires_at < NOW()) as expired,
          COALESCE(SUM(hit_count), 0) as total_hits
        FROM response_cache
      `);

      const row = result.rows[0];

      res.json({
        data: {
          total: parseInt(row.total, 10),
          expired: parseInt(row.expired, 10),
          active: parseInt(row.total, 10) - parseInt(row.expired, 10),
          totalHits: parseInt(row.total_hits, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/cache', async (req, res, next) => {
    try {
      const { pattern } = req.query;

      const result = await pool.query(
        pattern
          ? 'DELETE FROM response_cache WHERE query_text ILIKE $1'
          : 'DELETE FROM response_cache',
        pattern ? [`%${pattern}%`] : []
      );

      res.json({
        data: {
          deleted: result.rowCount || 0,
          pattern: pattern || 'all',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
