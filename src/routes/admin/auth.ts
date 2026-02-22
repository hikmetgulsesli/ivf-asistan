import { Router, Request, Response, NextFunction } from 'express';
import { login } from '../../services/auth-service';
import { AppError, UnauthorizedError } from '../../utils/errors';

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('VALIDATION_ERROR', 'Username and password are required', 400);
    }

    const result = await login({ username, password });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(new AppError('AUTH_ERROR', 'Invalid username or password', 401));
    } else {
      next(error);
    }
  }
});

export default router;
