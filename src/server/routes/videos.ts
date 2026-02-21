import { Router, type Request, type Response } from 'express';
import * as videos from '../db/queries/videos.js';
import type { VideoCreateInput, VideoUpdateInput } from '../db/types.js';
import { invalidateCache } from '../services/cache.js';

const router = Router();

// GET /api/admin/videos - List videos with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const result = await videos.listVideos({ page, limit, category, status });
    res.json(result);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list videos' } });
  }
});

// GET /api/admin/videos/:id - Get single video
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid video ID' } });
    }

    const video = await videos.getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Video with id ${id} not found` } });
    }

    res.json({ data: video });
  } catch (error) {
    console.error('Error getting video:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get video' } });
  }
});

// GET /api/admin/videos/:id/status - Get video analysis status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid video ID' } });
    }

    const status = await videos.getVideoAnalysisStatus(id);
    if (!status) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Video with id ${id} not found` } });
    }

    res.json(status);
  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get video status' } });
  }
});

// POST /api/admin/videos - Create new video
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: VideoCreateInput = req.body as VideoCreateInput;

    // Validate required fields
    if (!input.title || !input.url || !input.category) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: [
            { field: 'title', message: 'Title is required' },
            { field: 'url', message: 'URL is required' },
            { field: 'category', message: 'Category is required' },
          ],
        },
      });
    }

    const video = await videos.createVideo(input);
    
    // Invalidate cache when new content is added
    await invalidateCache();
    
    res.status(201).json({ data: video });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create video' } });
  }
});

// PUT /api/admin/videos/:id - Update video
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid video ID' } });
    }

    const input: VideoUpdateInput = req.body as VideoUpdateInput;

    const video = await videos.updateVideo(id, input);
    if (!video) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Video with id ${id} not found` } });
    }

    res.json({ data: video });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update video' } });
  }
});

// DELETE /api/admin/videos/:id - Delete video
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid video ID' } });
    }

    const deleted = await videos.deleteVideo(id);
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Video with id ${id} not found` } });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete video' } });
  }
});

export default router;
