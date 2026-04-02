/**
 * @fileoverview EarningsEntry Model for tracking financial performance.
 * Captures granular earnings data per job to facilitate income analysis and insights.
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
 * @property {string} job - The job where income was generated.
 * @property {number} amount - The total amount earned in the specified currency.
 * @property {number} hours - The duration of work associated with these earnings.
 * @property {Date} date - The date the income was recorded (default: now).
 */
const earningsSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  job:      { type: String, enum: ["Uber", "Ola", "Swiggy", "Zomato", "Blinkit", "Zepto", "Rapido", "Amazon Flex", "BigBasket", "Delhivery", "BluSmart", "Dunzo", "Namma Yatri", "BlueDart", "JioMart", "InDriver", "Other"], required: true },
  amount:   { type: Number, required: true, min: 0 },
  hours:    { type: Number, required: true, min: 0 },
  date:     { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("EarningsEntry", earningsSchema);
