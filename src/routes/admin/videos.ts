import { Router, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { initVideoService, VideoService } from '../../services/video-service.js';
import { generateEmbedding } from '../../services/embedding-service.js';
import { initSearchService, SearchService } from '../../services/search-service.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

const VALID_ANALYSIS_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
type AnalysisStatus = typeof VALID_ANALYSIS_STATUSES[number];

// Helper to safely extract string from query param
function getQueryString(req: AuthenticatedRequest, key: string): string | undefined {
  const value = (req.query as Record<string, unknown>)[key];
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
}

// Helper to safely extract string from body
function getBodyString(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
}

// Helper to safely extract number from body
function getBodyNumber(body: unknown, key: string): number | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

// Helper to safely extract string array from body
function getBodyStringArray(body: unknown, key: string): string[] | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.map(v => String(v));
}

// Helper to safely extract and validate object array from body
function getBodyObjectArray<T extends Record<string, unknown>>(
  body: unknown, 
  key: string, 
  validator?: (item: unknown) => item is T
): T[] | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  
  if (validator) {
    return value.filter(validator);
  }
  
  // Default validation - ensure items are objects
  return value.filter((item): item is T => 
    typeof item === 'object' && item !== null
  );
}

// Validator for timestamp objects
function isTimestampObject(item: unknown): item is { time: string; topic: string } {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.time === 'string' && typeof obj.topic === 'string';
}

// Validate analysis status
function validateAnalysisStatus(status: string): AnalysisStatus {
  if (!VALID_ANALYSIS_STATUSES.includes(status as AnalysisStatus)) {
    throw new ValidationError(
      'analysis_status',
      `Must be one of: ${VALID_ANALYSIS_STATUSES.join(', ')}`
    );
  }
  return status as AnalysisStatus;
}

export function createVideosRouter(pool: Pool): Router {
  const router = Router();
  
  // Initialize services with pool
  initVideoService(pool);
  initSearchService(pool);
  const videoService = new VideoService(pool);
  const searchService = new SearchService(pool);

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // GET /api/admin/videos - List videos with pagination and filtering
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(getQueryString(req, 'page') || '1', 10);
      const limit = parseInt(getQueryString(req, 'limit') || '20', 10);
      const category = getQueryString(req, 'category');
      const analysis_status = getQueryString(req, 'analysis_status');

      const result = await videoService.listVideos({
        page,
        limit,
        category,
        analysis_status,
      });

      res.json({
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/videos - Create a new video
  router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      const title = getBodyString(body, 'title');
      const url = getBodyString(body, 'url');
      const category = getBodyString(body, 'category');
      const duration_seconds = getBodyNumber(body, 'duration_seconds');

      if (!title) {
        throw new ValidationError('title', 'Title is required');
      }
      if (!url) {
        throw new ValidationError('url', 'URL is required');
      }
      if (!category) {
        throw new ValidationError('category', 'Category is required');
      }

      const video = await videoService.createVideo({
        title,
        url,
        category,
        duration_seconds,
      });

      res.status(201).json({
        data: video,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/videos/:id - Get a single video
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        throw new ValidationError('id', 'ID must be a number');
      }

      const video = await videoService.getVideoById(id);

      if (!video) {
        throw new NotFoundError('Video', id);
      }

      res.json({
        data: video,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/videos/:id/status - Get video analysis status
  router.get('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        throw new ValidationError('id', 'ID must be a number');
      }

      const status = await videoService.getVideoAnalysisStatus(id);

      if (!status) {
        throw new NotFoundError('Video', id);
      }

      res.json({
        data: status,
      });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/admin/videos/:id - Update a video
  router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        throw new ValidationError('id', 'ID must be a number');
      }

      const body = req.body;

      const title = getBodyString(body, 'title');
      const url = getBodyString(body, 'url');
      const summary = getBodyString(body, 'summary');
      const key_topics = getBodyStringArray(body, 'key_topics');
      const timestamps = getBodyObjectArray(body, 'timestamps', isTimestampObject);
      const category = getBodyString(body, 'category');
      const duration_seconds = getBodyNumber(body, 'duration_seconds');
      const analysis_status = getBodyString(body, 'analysis_status');

      const input: {
        title?: string;
        url?: string;
        summary?: string;
        key_topics?: string[];
        timestamps?: Array<{ time: string; topic: string }>;
        category?: string;
        duration_seconds?: number;
        analysis_status?: AnalysisStatus;
      } = {};

      if (title !== undefined) input.title = title;
      if (url !== undefined) input.url = url;
      if (summary !== undefined) input.summary = summary;
      if (key_topics !== undefined) input.key_topics = key_topics;
      if (timestamps !== undefined) input.timestamps = timestamps;
      if (category !== undefined) input.category = category;
      if (duration_seconds !== undefined) input.duration_seconds = duration_seconds;
      if (analysis_status !== undefined) {
        input.analysis_status = validateAnalysisStatus(analysis_status);
      }

      const video = await videoService.updateVideo(id, input);

      if (!video) {
        throw new NotFoundError('Video', id);
      }

      // Generate embedding when video analysis is complete
      if (input.analysis_status === 'done' && video.summary) {
        try {
          const searchText = `${video.title} ${video.summary} ${(video.key_topics || []).join(' ')} ${video.category}`;
          const { embedding } = await generateEmbedding(searchText);
          await searchService.updateVideoEmbedding(video.id, embedding);
        } catch (embeddingError) {
          console.error('Failed to generate embedding for video:', video.id, embeddingError);
        }
      }

      res.json({
        data: video,
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/admin/videos/:id - Delete a video
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);

      if (isNaN(id)) {
        throw new ValidationError('id', 'ID must be a number');
      }

      const deleted = await videoService.deleteVideo(id);

      if (!deleted) {
        throw new NotFoundError('Video', id);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createVideosRouter;
