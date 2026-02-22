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

  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  try {
    const payload = verifyToken(token);
    req.admin = payload;
    next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}
