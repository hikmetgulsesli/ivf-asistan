export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  details: { field: string; message: string }[];

  constructor(message: string, details: { field: string; message: string }[] = []) {
    super('VALIDATION_ERROR', message, 400);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: number) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}
