/**
 * @fileoverview User Model representing a registered worker or administrator.
 * Defines the core identity and authentication attributes for users in the system.
 * 
 * @module server/models/User
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * User Schema
 * 
 * @typedef {Object} User
 * @property {string} name - Full name of the user.
 * @property {string} email - Unique email address used for identification and login.
 * @property {string} [passwordHash] - Bcrypt hashed password for local authentication.
 * @property {string} [googleId] - Unique identifier for users authenticated via Google OAuth.
 * @property {('user'|'admin')} role - Access control level (default: 'user').
 * @property {Date} createdAt - Automatically generated timestamp of user creation.
 * @property {Date} updatedAt - Automatically generated timestamp of last profile update.
 */
const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String }, // Optional to support OAuth-only accounts
  googleId:     { type: String }, // NEW: Correlation ID for Google OAuth users
  role:         { type: String, enum: ["user", "admin"], default: "user" },
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash; // Ensure sensitive data is never leaked in JSON responses
      return ret;
    }
  }
});

module.exports = mongoose.model("User", userSchema);
