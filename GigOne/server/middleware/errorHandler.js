const multer = require("multer");
const AppError = require("../utils/appError");

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new AppError("Uploaded audio file is too large", 413, {
        code: "FILE_TOO_LARGE",
      });
    }

    return new AppError(error.message || "Invalid file upload", 400, {
      code: "UPLOAD_ERROR",
    });
  }

  if (error?.name === "ValidationError") {
    const message =
      Object.values(error.errors || {})
        .map((item) => item.message)
        .filter(Boolean)
        .join(", ") || "Validation failed";

    return new AppError(message, 400, {
      code: "VALIDATION_ERROR",
      details: Object.keys(error.errors || {}),
    });
  }

  if (error?.name === "CastError") {
    return new AppError(`Invalid ${error.path}`, 400, { code: "INVALID_REFERENCE" });
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return new AppError("Invalid or expired token", 401, { code: "AUTH_INVALID" });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return new AppError("Malformed JSON request body", 400, {
      code: "INVALID_JSON",
    });
  }

  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";
    return new AppError(`${duplicateField} already exists`, 409, {
      code: "DUPLICATE_RESOURCE",
    });
  }

  return new AppError("Internal server error", 500, {
    code: "INTERNAL_ERROR",
    expose: false,
    isOperational: false,
    cause: error,
  });
};

const logError = (error, req) => {
  const context = `[${req.method} ${req.originalUrl}]`;

  if (error.statusCode >= 500 || !error.isOperational) {
    console.error(context, error.cause || error);
    return;
  }

  console.warn(context, error.message);
};

const notFoundHandler = (req, res, next) => {
  next(new AppError("Route not found", 404, { code: "ROUTE_NOT_FOUND" }));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const normalized = normalizeError(err);
  logError(normalized, req);

  const response = {
    message: normalized.expose ? normalized.message : "Something went wrong",
    code: normalized.code || "UNKNOWN_ERROR",
  };

  if (normalized.expose && normalized.details) {
    response.details = normalized.details;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = normalized.stack;
  }

  res.status(normalized.statusCode || 500).json(response);
};

module.exports = { errorHandler, notFoundHandler };
