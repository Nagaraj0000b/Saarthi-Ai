/**
 * @fileoverview WorkLog Model for tracking time spent on specific gig platforms.
 * Enables historical analysis of effort distribution across the gig economy ecosystem.
 * 
 * @module server/models/WorkLog
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * WorkLog Schema
 * 
 * @typedef {Object} WorkLog
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to the associated User.
 * @property {('Uber'|'Swiggy'|'Rapido'|'Other')} platform - The platform where work was performed.
 * @property {number} hours - Number of hours logged in this session.
 * @property {Date} date - The date the work was performed (default: now).
 * @property {string} [notes] - Additional context or remarks about the shift.
 */
const workLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  platform: { type: String, enum: ["Uber", "Swiggy", "Rapido", "Other"], required: true },
  hours:    { type: Number, required: true, min: 0 },
  date:     { type: Date, default: Date.now },
  notes:    { type: String, default: "", trim: true },
}, { timestamps: true });

module.exports = mongoose.model("WorkLog", workLogSchema);
