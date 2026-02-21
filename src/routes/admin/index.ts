import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';

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

export default router;
