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
  gender:       { type: String, enum: ["Male", "Female", "Other"] }, // NEW: Added for ML Engine
  
  // Specific gig platforms they work on
  registeredJobs: [{
    platform: { type: String, required: true }, // e.g., "Zomato", "Upwork"
    jobType: { type: String, required: true },  // e.g., "Food Delivery", "Software Development"
    domain: { type: String }                    // e.g., "Location_Transport_Delivery"
  }],
  
  // Specific skills and years of experience
  skills: [{
    name: { type: String, required: true },     // e.g., "Navigation", "Data Science"
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    skillLevel: { type: String, enum: ["Low", "Medium", "High"], default: "Low" }
  }],
  
  dailyTarget:  { type: Number, default: 1000 }, // ₹ daily earning goal, synced from Android
  lastKnownLocation: {
    lat: { type: Number },
    lon: { type: Number },
    updatedAt: { type: Date },
  },
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
