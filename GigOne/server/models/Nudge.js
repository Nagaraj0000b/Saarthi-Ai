/**
 * @fileoverview Nudge Model for proactive worker notifications.
 * Stores server-generated nudges that the Android client polls for.
 *
 * @module server/models/Nudge
 * @requires mongoose
 */

const mongoose = require("mongoose");

const NUDGE_TYPES = [
  "environmental",
  "earnings_optimization",
  "burnout",
  "daily_target",
  "next_day_shift",
  "surge",
];

const NUDGE_PRIORITIES = ["normal", "high", "urgent"];
const NUDGE_STATUSES = ["pending", "read", "dismissed", "expired"];

/**
 * Nudge Schema
 *
 * @typedef {Object} Nudge
 * @property {mongoose.Schema.Types.ObjectId} userId - Target user.
 * @property {string} type - Category of nudge.
 * @property {string} title - Short headline.
 * @property {string} body - Detailed message text.
 * @property {string} emoji - Visual emoji identifier for the nudge type.
 * @property {Object} data - Deep-link payload (screen, jobId, etc.).
 * @property {string} priority - Delivery urgency level.
 * @property {string} status - Lifecycle state.
 * @property {Date} readAt - When the user read the nudge.
 * @property {Date} expiresAt - Auto-expire timestamp (default: 6 hours).
 * @property {Object} metadata - Trigger-specific context (weather, surgePercent, etc.).
 */
const nudgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NUDGE_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      default: "🔔",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: NUDGE_PRIORITIES,
      default: "normal",
    },
    status: {
      type: String,
      enum: NUDGE_STATUSES,
      default: "pending",
    },
    readAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast poll query: find pending nudges for a user, sorted by newest first
nudgeSchema.index({ userId: 1, status: 1, createdAt: -1 });

// TTL index: automatically delete expired nudges after 24 hours past expiry
nudgeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Nudge", nudgeSchema);
module.exports.NUDGE_TYPES = NUDGE_TYPES;
module.exports.NUDGE_PRIORITIES = NUDGE_PRIORITIES;
