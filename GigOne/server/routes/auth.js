/**
 * @fileoverview Authentication Routes for local and Google OAuth 2.0.
 * Defines endpoints for user registration, login, and social authentication callbacks.
 * 
 * @module server/routes/auth
 * @requires express
 * @requires passport
 * @requires jsonwebtoken
 * @requires ../controllers/authController
 */

const router = require("express").Router();
const { register, login } = require("../controllers/authController");
const passport = require("passport");
const jwt = require("jsonwebtoken");

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT
 * @access Public
 */
router.post("/login", login);

// ==========================================
// GOOGLE OAUTH ROUTES
// ==========================================

/**
 * @route GET /api/auth/google
 * @desc Initiate Google OAuth 2.0 authentication flow
 * @access Public
 */
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

/**
 * @route GET /api/auth/google/callback
 * @desc Google OAuth 2.0 callback endpoint
 * @access Private (via Passport)
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const user = req.user;

    // Generate internal JWT for the Google-authenticated user
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Deep link redirect back to the frontend with auth credentials in query params
    const redirectUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${redirectUrl}/user/dashboard?token=${token}&user=${encodeURIComponent(JSON.stringify({ id: user._id, name: user.name, role: user.role }))}`);
  }
);

module.exports = router;
