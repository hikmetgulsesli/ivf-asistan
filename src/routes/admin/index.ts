import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import articlesRouter from './articles';
import faqsRouter from './faqs';
import videosRouter from './videos';
import reindexRouter from './reindex';

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

// Mount sub-routes
router.use('/articles', articlesRouter);
router.use('/faqs', faqsRouter);
router.use('/videos', videosRouter);
router.use('/reindex', reindexRouter);

export default router;
