export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'No autorizado') {
    super(401, msg, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Sin permisos suficientes') {
    super(403, msg, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(404, resource + ' no encontrado', 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super(400, msg, 'VALIDATION_ERROR');
  }
}
