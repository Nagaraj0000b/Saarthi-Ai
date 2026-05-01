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

// Completely decoupled background trigger (runs AFTER any earning is saved to DB)
earningsSchema.post("save", function (doc) {
  // Fire and forget in the background so it never blocks the request or the chatbot
  setTimeout(() => {
    const { evaluate: evaluateEarningsOpt } = require("../services/nudgeEvaluators/earningsNudgeEvaluator");
    const { evaluate: evaluateBurnout } = require("../services/nudgeEvaluators/burnoutNudgeEvaluator");
    const { evaluate: evaluateDailyTarget } = require("../services/nudgeEvaluators/dailyTargetNudgeEvaluator");

    evaluateEarningsOpt(doc.userId, doc.job, doc.amount).catch((err) =>
      console.warn("[NudgeHook] Earnings optimization check failed:", err.message)
    );
    evaluateBurnout(doc.userId).catch((err) =>
      console.warn("[NudgeHook] Burnout risk check failed:", err.message)
    );
    evaluateDailyTarget(doc.userId).catch((err) =>
      console.warn("[NudgeHook] Daily Target check failed:", err.message)
    );
  }, 1000); // 1s delay to let DB settle

  // Instant Spark Nudge: Fires 12s after save
  setTimeout(async () => {
    try {
      const User = require("./User");
      const { dispatchNudge } = require("../services/nudgeDispatchService");

      const user = await User.findById(doc.userId);
      if (!user) return;

      const target = user.dailyTarget || 1000;

      // Calculate total earnings for today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const totalEarnings = await mongoose.model("EarningsEntry").aggregate([
        { $match: { userId: doc.userId, date: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const currentTotal = totalEarnings[0]?.total || 0;
      let body = "";

      if (currentTotal >= target) {
        body = `Boom! 💥 Your latest log just pushed you over the limit! You've earned ₹${currentTotal} today. Keep crushing it! 🚀`;
      } else {
        const gap = target - currentTotal;
        body = `Just saw that update! You're now only ₹${gap} away from your ₹${target} goal! You're on fire! 🔥`;
      }

      await dispatchNudge(doc.userId, {
        type: "daily_target",
        title: "✨ Instant Spark!",
        body,
        priority: "high",
      });
    } catch (err) {
      console.error("[NudgeHook-InstantSpark] Failed to dispatch instant spark:", err.message);
    }
  }, 12000);
});

module.exports = mongoose.model("EarningsEntry", earningsSchema);
