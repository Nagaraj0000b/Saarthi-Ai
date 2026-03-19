/**
 * @fileoverview Authentication Controller managing user registration and login workflows.
 * Implements local authentication using Bcrypt for hashing and JWT for session-less authorization.
 * 
 * @module server/controllers/authController
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires ../models/User
 */

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

/**
 * Generates a signed JSON Web Token for the provided user.
 * 
 * @private
 * @function generateToken
 * @param {Object} user - The User document from MongoDB.
 * @returns {string} Signed JWT.
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role }, 
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Registers a new user in the system.
 * Performs JIT password hashing and ensures email uniqueness.
 * 
 * @async
 * @function register
 * @param {Object} req - Express request object.
 * @param {string} req.body.name - Full name of the user.
 * @param {string} req.body.email - Unique email address.
 * @param {string} req.body.password - Plain-text password to be hashed.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    res.status(201).json({
      token: generateToken(user),
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Authenticates an existing user.
 * Validates credentials and returns a fresh JWT if successful.
 * 
 * @async
 * @function login
 * @param {Object} req - Express request object.
 * @param {string} req.body.email - Registered email address.
 * @param {string} req.body.password - Plain-text password.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Handle accounts provisioned via Google OAuth that lack a local password
    if (!user.passwordHash || user.passwordHash === "google_oauth_no_password") {
      return res.status(400).json({ message: "OAuth account detected. Please use Google Login." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user),
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login };
