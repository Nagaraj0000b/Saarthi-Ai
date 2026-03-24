class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code || null;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
    this.isOperational = options.isOperational ?? true;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
