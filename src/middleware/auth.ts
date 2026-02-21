import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth-service';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  admin?: JwtPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.admin = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
