/**
 * @fileoverview Authentication routes for local and Google OAuth 2.0.
 */

const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { register, login } = require("../controllers/authController");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");
const { googleOAuthEnabled } = require("../config/passport");

const ensureGoogleOAuthEnabled = (req, res, next) => {
  if (!googleOAuthEnabled) {
    next(new AppError("Google login is not configured", 503, { code: "OAUTH_UNAVAILABLE" }));
    return;
  }

  next();
};

router.post("/register", register);
router.post("/login", login);

router.get(
  "/google",
  ensureGoogleOAuthEnabled,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  ensureGoogleOAuthEnabled,
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`,
  }),
  (req, res, next) => {
    try {
      const user = req.user;

      if (!user?._id) {
        throw new AppError("Google authentication failed", 401, { code: "AUTH_INVALID" });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        requireEnv("JWT_SECRET"),
        { expiresIn: "7d" }
      );

      const redirectUrl = process.env.CLIENT_URL || "http://localhost:5173";
      res.redirect(
        `${redirectUrl}/user/dashboard?token=${token}&user=${encodeURIComponent(
          JSON.stringify({ id: user._id, name: user.name, role: user.role })
        )}`
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
