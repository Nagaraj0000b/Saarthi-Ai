/**
 * @fileoverview Nightly Nudge Scheduler.
 * Runs at 8:30 PM IST daily to send next-day shift plan nudges
 * to all workers who logged a shift today.
 *
 * @module server/jobs/nightlyNudgeScheduler
 */

const cron = require("node-cron");
const EarningsEntry = require("../models/EarningsEntry");
const User = require("../models/User");
const nextDayShiftNudgeEvaluator = require("../services/nudgeEvaluators/nextDayShiftNudgeEvaluator");

/**
 * Returns start and end of today (UTC).
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
 * Main nightly job — evaluates next-day nudge for all active workers.
 */
const runNightly = async () => {
  console.log("[NightlyScheduler] 🌙 Running nightly nudge job...");

  try {
    const { start, end } = getTodayRange();

    // Find users who logged earnings today
    const todayEarnings = await EarningsEntry.distinct("userId", {
      date: { $gte: start, $lte: end },
    });

    if (todayEarnings.length === 0) {
      console.log("[NightlyScheduler] No active workers today. Skipping.");
      return;
    }

    console.log(`[NightlyScheduler] Found ${todayEarnings.length} active workers today.`);

    // Get location data for these users
    const users = await User.find({
      _id: { $in: todayEarnings },
      "lastKnownLocation.lat": { $exists: true },
      "lastKnownLocation.lon": { $exists: true },
    })
      .select("_id lastKnownLocation")
      .lean();

    console.log(`[NightlyScheduler] ${users.length} users have stored locations.`);

    for (const user of users) {
      try {
        await nextDayShiftNudgeEvaluator.evaluate(
          String(user._id),
          user.lastKnownLocation.lat,
          user.lastKnownLocation.lon
        );
      } catch (err) {
        console.error(`[NightlyScheduler] Failed for user ${user._id}:`, err.message);
      }
    }

    // Handle users without location — send a generic nudge
    const usersWithoutLoc = todayEarnings.filter(
      (id) => !users.some((u) => String(u._id) === String(id))
    );

    if (usersWithoutLoc.length > 0) {
      console.log(
        `[NightlyScheduler] ${usersWithoutLoc.length} active users have no stored location. Skipping their next-day nudge.`
      );
    }

    console.log("[NightlyScheduler] ✅ Nightly job complete.");
  } catch (error) {
    console.error("[NightlyScheduler] ❌ Job failed:", error.message);
  }
};

/**
 * Starts the nightly cron job.
 * Schedule: 8:30 PM IST daily = 15:00 UTC (IST is UTC+5:30)
 *
 * In node-cron: '0 15 * * *' runs at 15:00 UTC = 20:30 IST
 * Note: This is approximate. For exact IST, we use timezone option.
 */
const start = () => {
  // Run at 20:30 every day (Asia/Kolkata timezone)
  const task = cron.schedule(
    "30 20 * * *",
    () => {
      runNightly();
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("[NightlyScheduler] ⏰ Scheduled for 8:30 PM IST daily.");
  return task;
};

module.exports = { start, runNightly };
