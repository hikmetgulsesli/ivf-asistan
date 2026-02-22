import express from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { createVideosRouter } from './videos.js';
import { createArticlesRouter } from './articles.js';
import { createFaqsRouter } from './faqs.js';
import { SearchService } from '../../services/search-service.js';

export function createAdminRouter(pool: Pool): express.Router {
  const router = express.Router();
  const searchService = new SearchService(pool);

  router.use(authMiddleware);
  // In-memory settings store with defaults
  const defaultSettings: Record<string, string> = {
    systemPrompt: "Sen IVF (Tup Bebek) klinikleri icin gelistirilmis bir hasta asistanisin.",
    theme: "light",
    primaryColor: "#059669",
  };



  // GET /api/admin/status - Check authentication status
  router.get('/status', (req: AuthenticatedRequest, res) => {
    res.json({
      data: {
        authenticated: true,
        adminId: String(req.admin?.adminId),
        username: req.admin?.username,
      },
    });
  });

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

  // POST /api/admin/reindex - Reindex all content (regenerate all embeddings)
  router.post('/reindex', async (_req, res, next) => {
    try {
      const result = await searchService.reindexAllContent();
      
      res.json({
        data: result,
        message: `Reindexed ${result.articles} articles, ${result.faqs} FAQs, ${result.videos} videos`,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/reindex - Also supports GET for compatibility
  router.get('/reindex', async (_req, res, next) => {
    try {
      const result = await searchService.reindexAllContent();
      
      res.json({
        data: result,
        message: `Reindexed ${result.articles} articles, ${result.faqs} FAQs, ${result.videos} videos`,
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

  router.get('/cache-stats', async (_req, res, next) => {
    try {
      const [statsResult, expiredResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as total, COALESCE(SUM(hit_count), 0) as total_hits FROM response_cache'),
        pool.query('SELECT COUNT(*) as expired FROM response_cache WHERE expires_at <= NOW()'),
      ]);

      const totalEntries = parseInt(statsResult.rows[0].total);
      const totalHits = parseInt(statsResult.rows[0].total_hits);
      const expiredEntries = parseInt(expiredResult.rows[0].expired);
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

  // GET /api/admin/stats/sentiment - Get sentiment analysis stats
  router.get('/stats/sentiment', async (_req, res, next) => {
    try {
      // Placeholder for sentiment stats
      res.json({
        data: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/stats/queries - Get query stats
  router.get('/stats/queries', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string || '10', 10);
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 100',
          },
        });
      }
      // Placeholder for query stats
      res.json({
        data: [],
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/stats/daily - Get daily stats
  router.get('/stats/daily', async (_req, res, next) => {
    try {
      // Placeholder for daily stats
      res.json({
        data: [],
      });
    } catch (error) {
      next(error);
    }
  });


  // Dashboard routes (frontend compatibility)
  router.get('/dashboard', async (_req, res, next) => {
    try {
      const [articleCount, faqCount, videoCount, conversationCount, cacheStats] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM articles WHERE status = $1", ['published']),
        pool.query("SELECT COUNT(*) as count FROM faqs"),
        pool.query("SELECT COUNT(*) as count FROM videos WHERE analysis_status = $1", ['done']),
        pool.query("SELECT COUNT(DISTINCT session_id) as count FROM conversations"),
        pool.query("SELECT COUNT(*) as total, COALESCE(SUM(hit_count), 0) as total_hits FROM response_cache"),
      ]);
      const totalEntries = parseInt(cacheStats.rows[0].total);
      const totalHits = parseInt(cacheStats.rows[0].total_hits);
      res.json({ data: { articles: parseInt(articleCount.rows[0].count), faqs: parseInt(faqCount.rows[0].count), videos: parseInt(videoCount.rows[0].count), sessions: parseInt(conversationCount.rows[0].count), cache: { totalEntries, totalHits, avgHits: totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) / 100 : 0 } } });
    } catch (error) { next(error); }
  });

  router.get('/dashboard/top-questions', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string || '10', 10);
      res.json({ data: [] });
    } catch (error) { next(error); }
  });

  router.get('/dashboard/sentiment', async (_req, res, next) => {
    try {
      res.json({ data: { positive: 0, neutral: 0, negative: 0 } });
    } catch (error) { next(error); }
  });

  router.get('/dashboard/conversations', async (req, res, next) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await pool.query(
        "SELECT DISTINCT session_id, MAX(created_at) as last_activity FROM conversations GROUP BY session_id ORDER BY last_activity DESC LIMIT $1 OFFSET $2",
        [parseInt(limit as string, 10), parseInt(offset as string, 10)]
      );
      res.json({ data: result.rows, meta: { limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10), count: result.rows.length } });
    } catch (error) { next(error); }
  });


  // Settings endpoints (in-memory store)
  router.get("/settings", (_req, res) => {
    res.json({ data: { ...defaultSettings } });
  });

  router.put("/settings", (req, res) => {
    const { settings } = req.body;
    if (settings && typeof settings === "object") {
      Object.assign(defaultSettings, settings as Record<string, string>);
    }
    res.json({ data: { ...defaultSettings } });
  });

  // Mount video routes
  router.use('/videos', createVideosRouter(pool));
  
  // Mount articles routes
  router.use('/articles', createArticlesRouter(pool));
  
  // Mount faqs routes
  router.use('/faqs', createFaqsRouter(pool));

  return router;
}
