/**
 * @fileoverview Daily Target Completion Nudge Evaluator.
 * Triggered automatically by the EarningsEntry database hook.
 * Fires a celebratory nudge when the worker hits or exceeds their daily ₹ goal.
 *
 * @module server/services/nudgeEvaluators/dailyTargetNudgeEvaluator
 */

const EarningsEntry = require("../../models/EarningsEntry");
const User          = require("../../models/User");
const { dispatchNudge } = require("../nudgeDispatchService");

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const evaluate = async (userId) => {
  try {
    const user = await User.findById(userId).select("dailyTarget optionals").lean();
    const target = user?.dailyTarget || 1000; // Default ₹1000 if not set

    // Sum today's earnings
    const { start, end } = getTodayRange();
    const todayEntries = await EarningsEntry.find({
      userId,
      date: { $gte: start, $lte: end },
    }).lean();

    const todayTotal = todayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // If they haven't hit the target yet, do nothing (wait until they log more)
    if (todayTotal < target) {
      return; 
    }

    // Target Hit! 
    const surplus = Math.round(todayTotal - target);
    
    let title = "🎉 Daily Target Hit!";
    let body = `You earned ₹${Math.round(todayTotal)} today — ₹${surplus} above your ₹${target} goal. Rest well, you've earned it!`;

    if (surplus === 0) {
      body = `You earned exactly ₹${Math.round(todayTotal)} today, perfectly hitting your ₹${target} goal. Great job!`;
    }

    await dispatchNudge(userId, {
      type    : "daily_target",
      title,
      body,
      priority: "high", 
      emoji   : "🎯",
      data    : { screen: "earnings", todayTotal, target },
      metadata: { todayTotal: Math.round(todayTotal), target, surplus },
    });

  } catch (error) {
    console.error(`[TargetNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
