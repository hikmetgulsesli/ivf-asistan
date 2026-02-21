import { Router, type Request, type Response } from 'express';
import * as faqs from '../db/queries/faqs.js';
import type { FAQCreateInput, FAQUpdateInput } from '../db/types.js';

const router = Router();

// GET /api/admin/faqs - List FAQs with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const result = await faqs.listFAQs({ page, limit, category });
    res.json(result);
  } catch (error) {
    console.error('Error listing FAQs:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list FAQs' } });
  }
});

// GET /api/admin/faqs/:id - Get single FAQ
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid FAQ ID' } });
    }

    const faq = await faqs.getFAQById(id);
    if (!faq) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `FAQ with id ${id} not found` } });
    }

    res.json({ data: faq });
  } catch (error) {
    console.error('Error getting FAQ:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get FAQ' } });
  }
});

// POST /api/admin/faqs - Create new FAQ
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: FAQCreateInput = req.body as FAQCreateInput;

    // Validate required fields
    if (!input.question || !input.answer || !input.category) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: [
            { field: 'question', message: 'Question is required' },
            { field: 'answer', message: 'Answer is required' },
            { field: 'category', message: 'Category is required' },
          ],
        },
      });
    }

    const faq = await faqs.createFAQ(input);
    res.status(201).json({ data: faq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create FAQ' } });
  }
});

// PUT /api/admin/faqs/:id - Update FAQ
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid FAQ ID' } });
    }

    const input: FAQUpdateInput = req.body as FAQUpdateInput;

    const faq = await faqs.updateFAQ(id, input);
    if (!faq) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `FAQ with id ${id} not found` } });
    }

    res.json({ data: faq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update FAQ' } });
  }
});

// DELETE /api/admin/faqs/:id - Delete FAQ
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid FAQ ID' } });
    }

    const deleted = await faqs.deleteFAQ(id);
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `FAQ with id ${id} not found` } });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete FAQ' } });
  }
});

export default router;
