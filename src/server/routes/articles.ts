import { Router, type Request, type Response } from 'express';
import * as articles from '../db/queries/articles.js';
import type { ArticleCreateInput, ArticleUpdateInput } from '../db/types.js';

const router = Router();

// GET /api/admin/articles - List articles with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const result = await articles.listArticles({ page, limit, category, status });
    res.json(result);
  } catch (error) {
    console.error('Error listing articles:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list articles' } });
  }
});

// GET /api/admin/articles/:id - Get single article
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid article ID' } });
    }

    const article = await articles.getArticleById(id);
    if (!article) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article with id ${id} not found` } });
    }

    res.json({ data: article });
  } catch (error) {
    console.error('Error getting article:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get article' } });
  }
});

// POST /api/admin/articles - Create new article
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: ArticleCreateInput = req.body as ArticleCreateInput;

    // Validate required fields
    if (!input.title || !input.content || !input.category) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: [
            { field: 'title', message: 'Title is required' },
            { field: 'content', message: 'Content is required' },
            { field: 'category', message: 'Category is required' },
          ],
        },
      });
    }

    const article = await articles.createArticle(input);
    res.status(201).json({ data: article });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create article' } });
  }
});

// PUT /api/admin/articles/:id - Update article
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid article ID' } });
    }

    const input: ArticleUpdateInput = req.body as ArticleUpdateInput;

    const article = await articles.updateArticle(id, input);
    if (!article) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article with id ${id} not found` } });
    }

    res.json({ data: article });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update article' } });
  }
});

// DELETE /api/admin/articles/:id - Delete article
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid article ID' } });
    }

    const deleted = await articles.deleteArticle(id);
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article with id ${id} not found` } });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete article' } });
  }
});

export default router;
