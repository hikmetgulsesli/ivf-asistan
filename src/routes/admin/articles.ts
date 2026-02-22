import { Router, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import * as articleService from '../../services/article-service.js';
import { generateEmbedding } from '../../services/embedding-service.js';
import { SearchService } from '../../services/search-service.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

function getQueryString(req: AuthenticatedRequest, key: string): string | undefined {
  const value = (req.query as Record<string, unknown>)[key];
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0] as string;
  return String(value);
}

function getBodyString(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0] as string;
  return String(value);
}

function getBodyStringArray(body: unknown, key: string): string[] | undefined {
  const value = (body as Record<string, unknown>)[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.map(v => String(v));
}

export function createArticlesRouter(pool: Pool): Router {
  const router = Router();
  const searchService = new SearchService(pool);

  router.use(authMiddleware);

  // GET /api/admin/articles
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(getQueryString(req, 'page') || '1', 10);
      const limit = parseInt(getQueryString(req, 'limit') || '20', 10);
      const category = getQueryString(req, 'category');
      const status = getQueryString(req, 'status');

      const params: articleService.ArticleListParams = { page, limit };
      if (category) params.category = category;
      if (status) params.status = status;

      const result = await articleService.listArticles(pool, params);
      res.json({ data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/articles
  router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const title = getBodyString(body, 'title');
      const content = getBodyString(body, 'content');
      const category = getBodyString(body, 'category');
      const tags = getBodyStringArray(body, 'tags');
      const status = getBodyString(body, 'status');

      if (!title || !content || !category) {
        throw new ValidationError('Missing required fields', [
          { field: 'title', message: 'Title is required' },
          { field: 'content', message: 'Content is required' },
          { field: 'category', message: 'Category is required' },
        ]);
      }

      const input: articleService.CreateArticleInput = {
        title, content, category,
        tags: tags || [],
        status: (status as articleService.CreateArticleInput['status']) || 'draft',
      };

      const article = await articleService.createArticle(pool, input);

      if (article.status === 'published') {
        try {
          const searchText = `${article.title} ${article.content} ${article.category} ${(article.tags || []).join(' ')}`;
          const { embedding } = await generateEmbedding(searchText);
          await searchService.updateArticleEmbedding(article.id, embedding);
        } catch (embeddingError) {
          console.error('Failed to generate embedding for article:', article.id, embeddingError);
        }
      }

      res.status(201).json({ data: article });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/articles/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid ID', [{ field: 'id', message: 'ID must be a number' }]);
      }
      const article = await articleService.getArticleById(pool, id);
      if (!article) throw new NotFoundError('Article', id);
      res.json({ data: article });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/admin/articles/:id
  router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid ID', [{ field: 'id', message: 'ID must be a number' }]);
      }

      const body = req.body;
      const title = getBodyString(body, 'title');
      const content = getBodyString(body, 'content');
      const category = getBodyString(body, 'category');
      const tags = getBodyStringArray(body, 'tags');
      const status = getBodyString(body, 'status');

      const input: articleService.UpdateArticleInput = {};
      if (title !== undefined) input.title = title;
      if (content !== undefined) input.content = content;
      if (category !== undefined) input.category = category;
      if (tags !== undefined) input.tags = tags;
      if (status !== undefined) input.status = status as 'draft' | 'published' | 'archived';

      const article = await articleService.updateArticle(pool, id, input);
      if (!article) throw new NotFoundError('Article', id);

      if (article.status === 'published' && (title || content || category || tags)) {
        try {
          const searchText = `${article.title} ${article.content} ${article.category} ${(article.tags || []).join(' ')}`;
          const { embedding } = await generateEmbedding(searchText);
          await searchService.updateArticleEmbedding(article.id, embedding);
        } catch (embeddingError) {
          console.error('Failed to generate embedding for article:', article.id, embeddingError);
        }
      }

      res.json({ data: article });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/admin/articles/:id
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid ID', [{ field: 'id', message: 'ID must be a number' }]);
      }
      const deleted = await articleService.deleteArticle(pool, id);
      if (!deleted) throw new NotFoundError('Article', id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createArticlesRouter;
