import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

export function createCategoriesRouter(pool: Pool): express.Router {
  router.get('/categories', async (_req, res, next) => {
    try {
      const [articleCategories, faqCategories, videoCategories] = await Promise.all([
        pool.query('SELECT DISTINCT category FROM articles WHERE status = $1 ORDER BY category', ['published']),
        pool.query('SELECT DISTINCT category FROM faqs ORDER BY category'),
        pool.query('SELECT DISTINCT category FROM videos WHERE analysis_status = $1 ORDER BY category', ['done']),
      ]);

      const categories = new Set<string>();

      articleCategories.rows.forEach((row) => categories.add(row.category));
      faqCategories.rows.forEach((row) => categories.add(row.category));
      videoCategories.rows.forEach((row) => categories.add(row.category));

      res.json({
        data: Array.from(categories).sort(),
        meta: {
          count: categories.size,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
