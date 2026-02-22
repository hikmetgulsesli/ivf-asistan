import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import * as faqService from '../../services/faq-service';
import { generateEmbedding } from '../../services/embedding-service';
import { updateFaqEmbedding } from '../../services/search-service';
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

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/admin/faqs - List FAQs with pagination and filtering
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(getQueryString(req, 'page') || '1', 10);
    const limit = parseInt(getQueryString(req, 'limit') || '20', 10);
    const category = getQueryString(req, 'category');
    
    const params: faqService.FaqListParams = {
      page,
      limit,
    };
    
    if (category) params.category = category;
    
    const result = faqService.listFaqs(params);
    
    res.json({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/faqs - Create a new FAQ
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    
    const question = getBodyString(body, 'question');
    const answer = getBodyString(body, 'answer');
    const category = getBodyString(body, 'category');
    const sort_order = getBodyNumber(body, 'sort_order');
    
    if (!question || !answer || !category) {
      throw new ValidationError('Missing required fields', [
        { field: 'question', message: 'Question is required' },
        { field: 'answer', message: 'Answer is required' },
        { field: 'category', message: 'Category is required' },
      ]);
    }
    
    const input: faqService.CreateFaqInput = {
      question,
      answer,
      category,
      sort_order,
    };
    
    const faq = faqService.createFaq(input);
    
    // Generate embedding for FAQ
    try {
      const searchText = `${faq.question} ${faq.answer} ${faq.category}`;
      const { embedding } = await generateEmbedding(searchText);
      updateFaqEmbedding(faq.id, embedding);
    } catch (embeddingError) {
      console.error('Failed to generate embedding for FAQ:', faq.id, embeddingError);
    }
    
    res.status(201).json({
      data: faq,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/faqs/:id - Get a single FAQ
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    
    if (isNaN(id)) {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const faq = faqService.getFaqById(id);
    
    if (!faq) {
      throw new NotFoundError('FAQ', id);
    }
    
    res.json({
      data: faq,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/faqs/:id - Update an FAQ
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    
    if (isNaN(id)) {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const body = req.body;
    
    const question = getBodyString(body, 'question');
    const answer = getBodyString(body, 'answer');
    const category = getBodyString(body, 'category');
    const sort_order = getBodyNumber(body, 'sort_order');
    
    const input: faqService.UpdateFaqInput = {};
    
    if (question !== undefined) input.question = question;
    if (answer !== undefined) input.answer = answer;
    if (category !== undefined) input.category = category;
    if (sort_order !== undefined) input.sort_order = sort_order;
    
    const faq = faqService.updateFaq(id, input);
    
    if (!faq) {
      throw new NotFoundError('FAQ', id);
    }
    
    // Regenerate embedding if content changed
    if (question || answer || category) {
      try {
        const searchText = `${faq.question} ${faq.answer} ${faq.category}`;
        const { embedding } = await generateEmbedding(searchText);
        updateFaqEmbedding(faq.id, embedding);
      } catch (embeddingError) {
        console.error('Failed to generate embedding for FAQ:', faq.id, embeddingError);
      }
    }
    
    res.json({
      data: faq,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/faqs/:id - Delete an FAQ
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    
    if (isNaN(id)) {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a number' },
      ]);
    }
    
    const deleted = faqService.deleteFaq(id);
    
    if (!deleted) {
      throw new NotFoundError('FAQ', id);
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
