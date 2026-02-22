import express from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

export function createAnalyticsRouter(pool: Pool): express.Router {
  router.use(authMiddleware);

  // Dashboard stats
  router.get('/dashboard', async (_req, res, next) => {
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
      const cacheHitRate = totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) : 0;

      res.json({
        data: {
          articles: parseInt(articleCount.rows[0].count),
          faqs: parseInt(faqCount.rows[0].count),
          videos: parseInt(videoCount.rows[0].count),
          conversations: parseInt(conversationCount.rows[0].count),
          cache: {
            totalEntries,
            totalHits,
            hitRate: cacheHitRate,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Top questions
  router.get('/dashboard/top-questions', async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const result = await pool.query(
        `SELECT message as question, COUNT(*) as count 
         FROM conversations 
         WHERE role = 'user' 
         GROUP BY message 
         ORDER BY count DESC 
         LIMIT $1`,
        [limitNum]
      );

      res.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  });

  // Sentiment distribution
  router.get('/dashboard/sentiment', async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT sentiment, COUNT(*) as count 
         FROM conversations 
         WHERE sentiment IS NOT NULL 
         GROUP BY sentiment`
      );

      const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const distribution = result.rows.map(row => ({
        sentiment: row.sentiment,
        count: parseInt(row.count),
        percentage: total > 0 ? Math.round((parseInt(row.count) / total) * 100) : 0,
      }));

      res.json({ data: distribution, meta: { total } });
    } catch (error) {
      next(error);
    }
  });

  // Recent conversations
  router.get('/dashboard/conversations', async (req, res, next) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const result = await pool.query(
        `SELECT DISTINCT ON (session_id) 
           session_id, 
           MAX(created_at) as last_activity,
           (SELECT sentiment FROM conversations c2 WHERE c2.session_id = conversations.session_id ORDER BY created_at DESC LIMIT 1) as last_sentiment
         FROM conversations 
         GROUP BY session_id 
         ORDER BY session_id, last_activity DESC 
         LIMIT $1 OFFSET $2`,
        [limitNum, offsetNum]
      );

      res.json({
        data: result.rows,
        meta: { limit: limitNum, offset: offsetNum, count: result.rows.length },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
