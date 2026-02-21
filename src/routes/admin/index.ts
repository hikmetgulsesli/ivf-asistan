import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import articlesRoutes from '../../server/routes/articles';
import faqsRoutes from '../../server/routes/faqs';
import videosRoutes from '../../server/routes/videos';

const router = Router();

router.use(authMiddleware);

router.get('/status', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    data: {
      authenticated: true,
      adminId: req.admin?.adminId,
      username: req.admin?.username,
    },
  });
});

// Content Management API routes
router.use('/articles', articlesRoutes);
router.use('/faqs', faqsRoutes);
router.use('/videos', videosRoutes);

export default router;
