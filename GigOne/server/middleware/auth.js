/**
 * @fileoverview Authentication Middleware for JWT validation and request authorization.
 * Acts as a guard for protected API endpoints.
 * 
 * @module server/middleware/auth
 * @requires jsonwebtoken
 */

const jwt = require("jsonwebtoken");

/**
 * Authentication middleware that validates the 'Authorization' header.
 * Expects a Bearer token format. Decodes the JWT and injects the payload 
 * into the request object for downstream controllers.
 * 
 * @function authMiddleware
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {void|Response} Returns a 401 response if authentication fails.
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verify the presence and format of the Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the JWT integrity and signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    /**
     * Injected User Context
     * @property {string} req.user.userId - The unique MongoDB ObjectId of the user.
     * @property {string} req.user.role - The authorization level of the user (e.g., 'user', 'admin').
     */
    req.user = decoded; 
    
    next();
  } catch (err) {
    // Handle specific JWT errors (e.g., Expired, Invalid)
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
