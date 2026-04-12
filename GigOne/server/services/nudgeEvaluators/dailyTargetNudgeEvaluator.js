/**
 * @fileoverview Daily Target Completion Nudge Evaluator.
 * Triggered immediately after shift earnings are saved.
 * Fires a celebratory nudge when the worker hits their daily ₹ goal.
 *
 * @module server/services/nudgeEvaluators/dailyTargetNudgeEvaluator
 */

const EarningsEntry = require("../../models/EarningsEntry");
const User = require("../../models/User");
const { dispatchNudge } = require("../nudgeDispatchService");

/**
 * Returns the start and end of today in UTC.
 */
const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Counts consecutive past days where daily earnings met/exceeded the target.
 *
 * @param {string} userId
 * @param {number} target
 * @returns {Promise<number>} streak count (excluding today)
 */
const calculateStreak = async (userId, target) => {
  let streak = 0;
  const now = new Date();

  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - daysAgo);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const entries = await EarningsEntry.find({
      userId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    if (entries.length === 0) {
      break; // No activity = streak broken
    }

    const dayTotal = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    if (dayTotal >= target) {
      streak++;
    } else {
      break; // Below target = streak broken
    }
  }

  return streak;
};

/**
 * Evaluates whether the user has hit their daily target and dispatches nudge.
 *
 * @param {string} userId
 */
const evaluate = async (userId) => {
  try {
    const user = await User.findById(userId).select("dailyTarget").lean();
    const target = user?.dailyTarget || 1000; // Default ₹1000

    // Sum today's earnings
    const { start, end } = getTodayRange();
    const todayEntries = await EarningsEntry.find({
      userId,
      date: { $gte: start, $lte: end },
    }).lean();

    const todayTotal = todayEntries.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    if (todayTotal < target) {
      const remaining = target - todayTotal;
      console.log(
        `[TargetNudge] User ${userId}: ₹${todayTotal}/₹${target} (₹${remaining} to go). No nudge.`
      );
      return;
    }

    // Target hit! Calculate streak and surplus
    const surplus = Math.round(todayTotal - target);
    const streak = await calculateStreak(userId, target);
    const totalStreakDays = streak + 1; // Including today

    // Build celebratory message
    let title = "🎉 Daily Target Hit!";
    let body = `You earned ₹${Math.round(todayTotal)} today — ₹${surplus} above your ₹${target} goal. Rest well, you've earned it!`;

    if (totalStreakDays >= 7) {
      title = "🏆 Weekly Streak Champion!";
      body = `₹${Math.round(todayTotal)} today — ${totalStreakDays} days in a row hitting your target! You're unstoppable. Take some time to celebrate!`;
    } else if (totalStreakDays >= 3) {
      title = "🔥 Target Hit — Streak Going!";
      body = `₹${Math.round(todayTotal)} today — that's ${totalStreakDays} days in a row above ₹${target}! Keep the momentum going 💪`;
    }

    await dispatchNudge(userId, {
      type: "daily_target",
      title,
      body,
      priority: "high",
      data: { screen: "earnings", todayTotal, target, streak: totalStreakDays },
      metadata: {
        todayTotal: Math.round(todayTotal),
        target,
        surplus,
        streak: totalStreakDays,
        entriesCount: todayEntries.length,
      },
    });
  } catch (error) {
    console.error(`[TargetNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
