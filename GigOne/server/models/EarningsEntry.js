/**
 * @fileoverview EarningsEntry Model for tracking financial performance.
 * Captures granular earnings data per platform to facilitate income analysis and insights.
 * 
 * @module server/models/EarningsEntry
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * EarningsEntry Schema
 * 
 * @typedef {Object} EarningsEntry
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to the associated User.
 * @property {('Uber'|'Swiggy'|'Rapido'|'Other')} platform - The platform where income was generated.
 * @property {number} amount - The total amount earned in the specified currency.
 * @property {number} hours - The duration of work associated with these earnings.
 * @property {Date} date - The date the income was recorded (default: now).
 */
const earningsSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  platform: { type: String, enum: ["Uber", "Swiggy", "Rapido", "Other"], required: true },
  amount:   { type: Number, required: true, min: 0 },
  hours:    { type: Number, required: true, min: 0 },
  date:     { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("EarningsEntry", earningsSchema);
