import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import * as videoService from '../../services/video-service';
import { generateEmbedding } from '../../services/embedding-service';
import { updateVideoEmbedding } from '../../services/search-service';
import { ValidationError, NotFoundError } from '../../utils/errors';

// Helper to safely extract string from query param
function getQueryString(req: AuthenticatedRequest, key: string): string | undefined {
  const value = (req.query as Record<string, unknown>)[key];
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0] as string;
  return String(value);
}

// Helper to safely extract string from body
function getBodyString(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0] as string;
  return String(value);
}

// Helper to safely extract number from body
function getBodyNumber(body: unknown, key: string): number | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10);
  return undefined;
}

// Helper to safely extract string array from body
function getBodyStringArray(body: unknown, key: string): string[] | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.map(v => String(v));
}

// Helper to safely extract object array from body
function getBodyObjectArray<T>(body: unknown, key: string): T[] | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value as T[];
}

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/admin/videos - List videos with pagination and filtering
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(getQueryString(req, 'page') || '1', 10);
    const limit = parseInt(getQueryString(req, 'limit') || '20', 10);
    const category = getQueryString(req, 'category');
    const analysis_status = getQueryString(req, 'analysis_status');
    
    const params: videoService.VideoListParams = {
      page,
      limit,
    };
    
    if (category) params.category = category;
    if (analysis_status) params.analysis_status = analysis_status;
    
    const result = videoService.listVideos(params);
    
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
    
    if (!title || !url || !category) {
      throw new ValidationError('Missing required fields', [
        { field: 'title', message: 'Title is required' },
        { field: 'url', message: 'URL is required' },
        { field: 'category', message: 'Category is required' },
      ]);
    }
    
    const input: videoService.CreateVideoInput = {
      title,
      url,
      category,
      duration_seconds,
    };
    
    const video = videoService.createVideo(input);
    
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
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const video = videoService.getVideoById(id);
    
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
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const status = videoService.getVideoAnalysisStatus(id);
    
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
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const body = req.body;
    
    const title = getBodyString(body, 'title');
    const url = getBodyString(body, 'url');
    const summary = getBodyString(body, 'summary');
    const key_topics = getBodyStringArray(body, 'key_topics');
    const timestamps = getBodyObjectArray<{ time: string; topic: string }>(body, 'timestamps');
    const category = getBodyString(body, 'category');
    const duration_seconds = getBodyNumber(body, 'duration_seconds');
    const analysis_status = getBodyString(body, 'analysis_status');
    
    const input: videoService.UpdateVideoInput = {};
    
    if (title !== undefined) input.title = title;
    if (url !== undefined) input.url = url;
    if (summary !== undefined) input.summary = summary;
    if (key_topics !== undefined) input.key_topics = key_topics;
    if (timestamps !== undefined) input.timestamps = timestamps;
    if (category !== undefined) input.category = category;
    if (duration_seconds !== undefined) input.duration_seconds = duration_seconds;
    if (analysis_status !== undefined) input.analysis_status = analysis_status as 'pending' | 'processing' | 'done' | 'failed';
    
    const video = videoService.updateVideo(id, input);
    
    if (!video) {
      throw new NotFoundError('Video', id);
    }
    
    // Generate embedding when video analysis is complete
    if (analysis_status === 'done' && video.summary) {
      try {
        const searchText = `${video.title} ${video.summary} ${(video.key_topics || []).join(' ')} ${video.category}`;
        const { embedding } = await generateEmbedding(searchText);
        updateVideoEmbedding(video.id, embedding);
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
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const deleted = videoService.deleteVideo(id);
    
    if (!deleted) {
      throw new NotFoundError('Video', id);
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
