import express from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../../middleware/auth';
import { getKimiVideoAnalysisService, VideoAnalysisResult } from '../../services/kimi-video-analysis-service';
import { generateEmbedding } from '../../services/embedding-service';
import { ValidationError, NotFoundError } from '../../utils/errors';

const router = express.Router();

interface VideoRow {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  key_topics: string[] | null;
  timestamps: Array<{ time: string; topic: string }> | null;
  category: string;
  duration_seconds: number | null;
  embedding: number[] | null;
  analysis_status: 'pending' | 'processing' | 'done' | 'failed';
  analysis_error: string | null;
  analysis_attempts: number;
  created_at: Date;
  updated_at: Date;
}

function rowToVideo(row: VideoRow) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary,
    key_topics: row.key_topics || [],
    timestamps: row.timestamps || [],
    category: row.category,
    duration_seconds: row.duration_seconds,
    embedding: row.embedding,
    analysis_status: row.analysis_status,
    analysis_error: row.analysis_error,
    analysis_attempts: row.analysis_attempts,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createVideoRouter(pool: Pool): express.Router {
  // All video routes require authentication
  router.use(authMiddleware);

  // GET /api/admin/videos - List all videos
  router.get('/videos', async (req, res, next) => {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      if (limitNum < 1 || limitNum > 100) {
        throw new ValidationError('limit', 'Limit must be between 1 and 100');
      }

      let query = 'SELECT * FROM videos';
      const params: (string | number)[] = [];

      if (status) {
        query += ' WHERE analysis_status = $1';
        params.push(status as string);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limitNum, offsetNum);

      const result = await pool.query(query, params);

      res.json({
        data: result.rows.map(rowToVideo),
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

  // GET /api/admin/videos/:id - Get single video
  router.get('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Video', id);
      }

      res.json({ data: rowToVideo(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/videos/:id/status - Get video analysis status
  router.get('/videos/:id/status', async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT id, title, analysis_status, analysis_error, analysis_attempts, updated_at FROM videos WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Video', id);
      }

      const video = result.rows[0];
      res.json({
        data: {
          id: video.id,
          title: video.title,
          status: video.analysis_status,
          error: video.analysis_error,
          attempts: video.analysis_attempts,
          last_updated: video.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/videos - Create new video (triggers analysis)
  router.post('/videos', async (req, res, next) => {
    try {
      const { title, url, category, duration_seconds } = req.body;

      if (!title || typeof title !== 'string') {
        throw new ValidationError('title', 'Title is required');
      }

      if (!url || typeof url !== 'string') {
        throw new ValidationError('url', 'URL is required');
      }

      if (!category || typeof category !== 'string') {
        throw new ValidationError('category', 'Category is required');
      }

      // Create video with pending status
      const result = await pool.query(
        `INSERT INTO videos (title, url, category, duration_seconds, analysis_status, analysis_attempts)
         VALUES ($1, $2, $3, $4, 'pending', 0)
         RETURNING *`,
        [title, url, category, duration_seconds || null]
      );

      const video = rowToVideo(result.rows[0]);

      // Trigger async analysis
      queueVideoAnalysis(pool, video.id, url, title).catch(err => {
        console.error('[VideoRouter] Background analysis failed:', err);
      });

      res.status(201).json({ data: video });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/admin/videos/:id - Update video (triggers re-analysis)
  router.put('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, url, category, duration_seconds } = req.body;

      // Check if video exists
      const existing = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        throw new NotFoundError('Video', id);
      }

      const updateFields: string[] = [];
      const params: (string | number | null)[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        params.push(title);
      }

      if (url !== undefined) {
        updateFields.push(`url = $${paramIndex++}`);
        params.push(url);
      }

      if (category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        params.push(category);
      }

      if (duration_seconds !== undefined) {
        updateFields.push(`duration_seconds = $${paramIndex++}`);
        params.push(duration_seconds);
      }

      // If URL changed, trigger re-analysis
      const urlChanged = url && url !== existing.rows[0].url;
      if (urlChanged) {
        updateFields.push(`analysis_status = $${paramIndex++}`);
        params.push('pending');
        updateFields.push(`analysis_attempts = $${paramIndex++}`);
        params.push(0);
        updateFields.push(`analysis_error = $${paramIndex++}`);
        params.push(null);
      }

      updateFields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(
        `UPDATE videos SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      const video = rowToVideo(result.rows[0]);

      // Trigger re-analysis if URL changed
      if (urlChanged) {
        queueVideoAnalysis(pool, video.id, url, title || existing.rows[0].title).catch(err => {
          console.error('[VideoRouter] Background re-analysis failed:', err);
        });
      }

      res.json({ data: video });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/admin/videos/:id
  router.delete('/videos/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await pool.query('DELETE FROM videos WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Video', id);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/videos/:id/analyze - Manually trigger analysis
  router.post('/videos/:id/analyze', async (req, res, next) => {
    try {
      const { id } = req.params;

      const existing = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        throw new NotFoundError('Video', id);
      }

      const video = existing.rows[0];

      // Update status to pending
      await pool.query(
        "UPDATE videos SET analysis_status = 'pending', analysis_attempts = 0, analysis_error = NULL WHERE id = $1",
        [id]
      );

      // Trigger analysis
      queueVideoAnalysis(pool, video.id, video.url, video.title).catch(err => {
        console.error('[VideoRouter] Manual analysis failed:', err);
      });

      res.json({
        data: {
          id: video.id,
          status: 'pending',
          message: 'Analysis queued',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default router;

/**
 * Queue video analysis job with retry logic
 */
async function queueVideoAnalysis(
  pool: Pool,
  videoId: number,
  videoUrl: string,
  videoTitle: string,
  maxRetries: number = 3
): Promise<void> {
  console.log(`[VideoAnalysis] Starting analysis for video ${videoId}`);

  try {
    // Update status to processing
    await pool.query(
      "UPDATE videos SET analysis_status = 'processing', analysis_attempts = analysis_attempts + 1, updated_at = NOW() WHERE id = $1",
      [videoId]
    );

    // Get Kimi service and analyze video
    const kimiService = getKimiVideoAnalysisService();
    const startTime = Date.now();

    const analysisResult: VideoAnalysisResult = await kimiService.analyzeVideo(videoUrl, videoTitle);

    const durationMs = Date.now() - startTime;
    console.log(`[VideoAnalysis] Analysis completed in ${durationMs}ms for video ${videoId}`);

    // Check if completed within 2 minutes (acceptance criteria)
    if (durationMs > 120000) {
      console.warn(`[VideoAnalysis] Analysis took longer than 2 minutes: ${durationMs}ms`);
    }

    // Generate embedding from summary
    const embedding = await generateEmbedding(analysisResult.summary);

    // Update video with analysis results
    await pool.query(
      `UPDATE videos SET
        summary = $1,
        key_topics = $2,
        timestamps = $3,
        embedding = $4,
        analysis_status = 'done',
        analysis_error = NULL,
        updated_at = NOW()
       WHERE id = $5`,
      [
        analysisResult.summary,
        JSON.stringify(analysisResult.key_topics),
        JSON.stringify(analysisResult.timestamps),
        JSON.stringify(embedding),
        videoId,
      ]
    );

    console.log(`[VideoAnalysis] Video ${videoId} analysis completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[VideoAnalysis] Error analyzing video ${videoId}:`, errorMessage);

    // Get current attempts
    const result = await pool.query('SELECT analysis_attempts FROM videos WHERE id = $1', [videoId]);
    const attempts = result.rows[0]?.analysis_attempts || 0;

    if (attempts < maxRetries) {
      // Retry with exponential backoff
      const delayMs = Math.pow(2, attempts) * 2000;
      console.log(`[VideoAnalysis] Scheduling retry ${attempts + 1}/${maxRetries} for video ${videoId} in ${delayMs}ms`);

      setTimeout(() => {
        queueVideoAnalysis(pool, videoId, videoUrl, videoTitle, maxRetries).catch(err => {
          console.error('[VideoAnalysis] Retry failed:', err);
        });
      }, delayMs);

      // Update status to pending (for retry)
      await pool.query(
        "UPDATE videos SET analysis_status = 'pending', analysis_error = $1 WHERE id = $2",
        [errorMessage, videoId]
      );
    } else {
      // Max retries exceeded - mark as failed
      await pool.query(
        "UPDATE videos SET analysis_status = 'failed', analysis_error = $1, updated_at = NOW() WHERE id = $2",
        [errorMessage, videoId]
      );

      console.error(`[VideoAnalysis] Video ${videoId} failed after ${maxRetries} attempts`);
    }
  }
}
