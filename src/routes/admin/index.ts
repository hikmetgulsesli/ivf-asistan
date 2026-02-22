import express from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../../middleware/auth';
import { createVideosRouter } from './videos';

const router = express.Router();

export function createAdminRouter(pool: Pool): express.Router {
  router.use(authMiddleware);

  router.get('/stats', async (_req, res, next) => {
    try {
      const [articleCount, faqCount, videoCount, conversationCount, cacheStats] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM articles WHERE status = $1', ['published']),
        pool.query('SELECT COUNT(*) as count FROM faqs'),
        pool.query('SELECT COUNT(*) as count FROM videos WHERE analysis_status = $1', ['done']),
        pool.query('SELECT COUNT(DISTINCT session_id) as count FROM conversations'),
        pool.query('SELECT COUNT(*) as total, COALESCE(SUM(hit_count), 0) as total_hits FROM response_cache'),
      ]);

      const totalEntries = parseInt(cacheStats.rows[0].total);
      const totalHits = parseInt(cacheStats.rows[0].total_hits);
      const avgHits = totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) / 100 : 0;

      res.json({
        data: {
          articles: parseInt(articleCount.rows[0].count),
          faqs: parseInt(faqCount.rows[0].count),
          videos: parseInt(videoCount.rows[0].count),
          sessions: parseInt(conversationCount.rows[0].count),
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

  router.get('/conversations', async (req, res, next) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      if (limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 100',
          },
        });
      }

      const result = await pool.query(
        `SELECT DISTINCT session_id, MAX(created_at) as last_activity
         FROM conversations
         GROUP BY session_id
         ORDER BY last_activity DESC
         LIMIT $1 OFFSET $2`,
        [limitNum, offsetNum]
      );

      res.json({
        data: result.rows,
        meta: {
          limit: limitNum,
          offset: offsetNum,
          count: result.rows.length,
        },
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

  router.get('/cache-stats', async (_req, res, next) => {
    try {
      const statsResult = await pool.query(
        `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(hit_count), 0) AS total_hits,
          COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired
        FROM response_cache`
      );

      const totalEntries = parseInt(statsResult.rows[0].total, 10);
      const totalHits = parseInt(statsResult.rows[0].total_hits, 10);
      const expiredEntries = parseInt(statsResult.rows[0].expired, 10);
      const activeEntries = totalEntries - expiredEntries;
      const avgHits = totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) / 100 : 0;

      res.json({
        data: {
          totalEntries,
          activeEntries,
          expiredEntries,
          totalHits,
          avgHits,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Mount videos router
  router.use('/videos', createVideosRouter(pool));

  return router;
}
