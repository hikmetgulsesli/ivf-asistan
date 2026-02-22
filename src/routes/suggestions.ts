import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

export function createSuggestionsRouter(pool: Pool): express.Router {
  router.get('/suggestions', async (req, res, next) => {
    try {
      const { category, limit } = req.query;

      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      if (limitNum < 1 || limitNum > 20) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 20',
          },
        });
      }

      let query = 'SELECT question FROM faqs';
      const params: unknown[] = [];

      if (category && typeof category === 'string' && category.trim().length > 0) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' ORDER BY sort_order ASC, id ASC LIMIT $' + (params.length + 1);
      params.push(limitNum);

      const result = await pool.query(query, params);

      const suggestions = result.rows.map((row) => row.question);

      res.json({
        data: suggestions,
        meta: {
          category: category || 'all',
          count: suggestions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
