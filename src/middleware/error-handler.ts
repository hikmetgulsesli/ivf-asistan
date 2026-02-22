import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';

export function errorHandler(
  error: Error | AppError | ValidationError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
