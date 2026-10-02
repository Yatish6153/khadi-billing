/**
 * An error that is safe to show to the client. Anything else that reaches
 * the error handler is treated as an unexpected 500 and its details are hidden.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Bad request', errors?: Record<string, string[]>) {
    return new AppError(400, message, errors);
  }
  static unauthorized(message = 'Please log in to continue') {
    return new AppError(401, message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new AppError(403, message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, message);
  }
  static conflict(message = 'Already exists') {
    return new AppError(409, message);
  }
}
