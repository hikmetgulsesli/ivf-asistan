import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { reindexAllContent } from '../../services/search-service';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/admin/reindex - Reindex all content (regenerate all embeddings)
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await reindexAllContent();
    
    res.json({
      data: result,
      message: `Reindexed ${result.articles} articles, ${result.faqs} FAQs, ${result.videos} videos`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reindex - Also supports GET for compatibility
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await reindexAllContent();
    
    res.json({
      data: result,
      message: `Reindexed ${result.articles} articles, ${result.faqs} FAQs, ${result.videos} videos`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
