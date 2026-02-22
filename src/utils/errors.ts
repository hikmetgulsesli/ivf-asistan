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

export interface ValidationFieldError {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly errors?: ValidationFieldError[];

  constructor(field: string | ValidationFieldError[], message?: string | ValidationFieldError[]) {
    // Handle the case where message is actually the errors array (legacy calls)
    if (Array.isArray(message)) {
      super('VALIDATION_ERROR', field as string, 400);
      this.errors = message;
      return;
    }
    
    if (Array.isArray(field)) {
      super('VALIDATION_ERROR', 'Validation failed', 400);
      this.errors = field;
    } else {
      super('VALIDATION_ERROR', message || 'Validation failed', 400);
      this.field = field;
    }
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
