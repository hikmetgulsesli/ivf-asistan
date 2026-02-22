import express from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../../middleware/auth';
import { queueVideoAnalysis, initVideoAnalysisService } from '../../services/video-analysis-service';

const router = express.Router();

export function createContentRouter(pool: Pool): express.Router {
  // Initialize video analysis service with pool
  initVideoAnalysisService(pool);
  router.use(authMiddleware);

  // ARTICLES
  router.get('/articles', async (req, res, next) => {
    try {
      const { search, category, status, limit: limitParam = '50', offset: offsetParam = '0' } = req.query;
      const limitNum = parseInt(limitParam as string, 10);
      const offsetNum = parseInt(offsetParam as string, 10);

      let query = 'SELECT * FROM articles WHERE 1=1';
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND title ILIKE $${paramIndex}`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(String(category));
        paramIndex++;
      }
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(String(status));
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitNum, offsetNum);

      const result = await pool.query(query, params);
      const countResult = await pool.query('SELECT COUNT(*) FROM articles');
      const total = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows,
        meta: { limit: limitNum, offset: offsetNum, total },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/articles/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Article not found' },
        });
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/articles', async (req, res, next) => {
    try {
      const { title, content, category, status = 'draft' } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Title and content are required' },
        });
      }

      const result = await pool.query(
        'INSERT INTO articles (title, content, category, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, content, category || 'general', status]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.put('/articles/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, content, category, status } = req.body;

      const fields: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (content !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        params.push(content);
      }
      if (category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        params.push(category);
      }
      if (status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      fields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(
        `UPDATE articles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Article not found' },
        });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/articles/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Article not found' },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // FAQS
  router.get('/faqs', async (req, res, next) => {
    try {
      const result = await pool.query('SELECT * FROM faqs ORDER BY order_index ASC, created_at DESC');
      res.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/faqs/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM faqs WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'FAQ not found' },
        });
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/faqs', async (req, res, next) => {
    try {
      const { question, answer, category } = req.body;
      
      if (!question || !answer) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Question and answer are required' },
        });
      }

      const maxOrder = await pool.query('SELECT MAX(order_index) as max FROM faqs');
      const nextOrder = (maxOrder.rows[0]?.max || 0) + 1;

      const result = await pool.query(
        'INSERT INTO faqs (question, answer, category, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [question, answer, category || 'general', nextOrder]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.put('/faqs/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { question, answer, category } = req.body;

      const fields: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (question !== undefined) {
        fields.push(`question = $${paramIndex++}`);
        params.push(question);
      }
      if (answer !== undefined) {
        fields.push(`answer = $${paramIndex++}`);
        params.push(answer);
      }
      if (category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        params.push(category);
      }
      fields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(
        `UPDATE faqs SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'FAQ not found' },
        });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/faqs/reorder', async (req, res, next) => {
    try {
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'items must be an array' },
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (let i = 0; i < items.length; i++) {
          await client.query('UPDATE faqs SET order_index = $1 WHERE id = $2', [i, items[i]]);
        }
        
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const result = await pool.query('SELECT * FROM faqs ORDER BY order_index ASC');
      res.json({ data: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/faqs/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM faqs WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'FAQ not found' },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // VIDEOS
  router.get('/videos', async (req, res, next) => {
    try {
      const { analysis_status, limit: limitParam = '50', offset: offsetParam = '0' } = req.query;
      const limitNum = parseInt(limitParam as string, 10);
      const offsetNum = parseInt(offsetParam as string, 10);

      let query = 'SELECT * FROM videos WHERE 1=1';
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (analysis_status) {
        query += ` AND analysis_status = $${paramIndex}`;
        params.push(String(analysis_status));
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitNum, offsetNum);

      const result = await pool.query(query, params);
      const countResult = await pool.query('SELECT COUNT(*) FROM videos');
      const total = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows,
        meta: { limit: limitNum, offset: offsetNum, total },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.get('/videos/:id/analyze', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT id, title, url, analysis_status, summary, timestamps, error_message FROM videos WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
      }
      
      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos', async (req, res, next) => {
    try {
      const { title, url, category } = req.body;
      
      if (!title || !url) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Title and url are required' },
        });
      }

      const result = await pool.query(
        'INSERT INTO videos (title, url, category, analysis_status) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, url, category || 'general', 'pending']
      );

      const video = result.rows[0];
      
      // Trigger async video analysis
      queueVideoAnalysis(video.id);

      res.status(201).json({ data: video });
    } catch (error) {
      next(error);
    }
  });

  router.put('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, url, category } = req.body;

      const fields: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (url !== undefined) {
        fields.push(`url = $${paramIndex++}`);
        params.push(url);
      }
      if (category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        params.push(category);
      }
      fields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(
        `UPDATE videos SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM videos WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // SETTINGS
  router.get('/settings', async (_req, res, next) => {
    try {
      const result = await pool.query("SELECT key, value FROM settings WHERE category = 'system'");
      const settings: Record<string, string> = {};
      for (const row of result.rows) {
        settings[row.key] = row.value;
      }
      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  });

  router.put('/settings', async (req, res, next) => {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'settings object is required' },
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const [key, value] of Object.entries(settings)) {
          await client.query(
            `INSERT INTO settings (key, value, category, updated_at) 
             VALUES ($1, $2, 'system', NOW()) 
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, value]
          );
        }
        
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const result = await pool.query("SELECT key, value FROM settings WHERE category = 'system'");
      const updatedSettings: Record<string, string> = {};
      for (const row of result.rows) {
        updatedSettings[row.key] = row.value;
      }
      
      res.json({ data: updatedSettings });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
