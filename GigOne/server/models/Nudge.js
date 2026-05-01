/**
 * @fileoverview Nudge Model — 3 core nudge types only.
 * environmental, earnings_optimization, burnout
 */

const mongoose = require("mongoose");

const NUDGE_TYPES      = ["environmental", "earnings_optimization", "burnout", "daily_target", "next_day_shift", "surge"];
const NUDGE_PRIORITIES = ["normal", "high", "urgent"];
const NUDGE_STATUSES   = ["pending", "read", "dismissed", "expired"];

const nudgeSchema = new mongoose.Schema(
  {
    userId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : "User",
      required: true,
    },
    type: {
      type    : String,
      enum    : NUDGE_TYPES,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body : { type: String, required: true, trim: true },
    emoji: { type: String, default: "🔔" },
    data : { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: {
      type   : String,
      enum   : NUDGE_PRIORITIES,
      default: "normal",
    },
    status: {
      type   : String,
      enum   : NUDGE_STATUSES,
      default: "pending",
    },
    readAt   : { type: Date },
    expiresAt: {
      type   : Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Fast poll query
nudgeSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Unique index to prevent duplicate nudges of the same type on the same day
nudgeSchema.index({ userId: 1, type: 1, createdAt: 1 }, { unique: true });
// TTL: auto-delete after expiry + 24h
nudgeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Nudge", nudgeSchema);
module.exports.NUDGE_TYPES      = NUDGE_TYPES;
module.exports.NUDGE_PRIORITIES = NUDGE_PRIORITIES;
