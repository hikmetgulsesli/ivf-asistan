import { Router } from 'express';
import articlesRouter from './articles.js';
import faqsRouter from './faqs.js';
import videosRouter from './videos.js';

const router = Router();

router.use('/articles', articlesRouter);
router.use('/faqs', faqsRouter);
router.use('/videos', videosRouter);

export default router;
