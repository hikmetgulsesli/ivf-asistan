export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.field = field;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
    this.name = 'NotFoundError';
  }
}
