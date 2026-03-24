/**
 * @fileoverview Authentication middleware for JWT validation and request authorization.
 */

const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError("Authentication token is required", 401, { code: "AUTH_REQUIRED" }));
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, requireEnv("JWT_SECRET"));

    if (!decoded?.userId) {
      throw new AppError("Invalid authentication token", 401, { code: "AUTH_INVALID" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Invalid or expired token", 401, { code: "AUTH_INVALID" })
    );
  }
};
