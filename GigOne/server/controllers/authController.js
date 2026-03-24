/**
 * @fileoverview Authentication controller managing user registration and login workflows.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");
const {
  ensureEmail,
  ensureMinLengthString,
  ensureNonEmptyString,
} = require("../utils/validation");

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    requireEnv("JWT_SECRET"),
    { expiresIn: "7d" }
  );
};

const register = asyncHandler(async (req, res) => {
  const name = ensureNonEmptyString(req.body.name, "name");
  const email = ensureEmail(req.body.email);
  const password = ensureMinLengthString(req.body.password, "password", 6);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already registered", 409, { code: "EMAIL_EXISTS" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({
    token: generateToken(user),
    user: { id: user._id, name: user.name, role: user.role },
  });
});

const login = asyncHandler(async (req, res) => {
  const email = ensureEmail(req.body.email);
  const password = ensureNonEmptyString(req.body.password, "password");

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email or password", 401, { code: "AUTH_INVALID" });
  }

  if (!user.passwordHash || user.passwordHash === "google_oauth_no_password") {
    throw new AppError("This account uses Google login. Please continue with Google.", 400, {
      code: "OAUTH_ACCOUNT",
    });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError("Invalid email or password", 401, { code: "AUTH_INVALID" });
  }

  res.json({
    token: generateToken(user),
    user: { id: user._id, name: user.name, role: user.role },
  });
});

module.exports = { register, login };
