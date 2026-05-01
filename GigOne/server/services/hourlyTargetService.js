const User = require("../models/User");
const EarningsEntry = require("../models/EarningsEntry");
const { dispatchNudge } = require("./nudgeDispatchService");

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const processHourlyTargets = async () => {
  console.log("[HourlyTargetService] Running hourly progress check...");
  const users = await User.find({ dailyTarget: { $exists: true } }).lean();
  const { start, end } = getTodayRange();

  for (const user of users) {
    const todayEntries = await EarningsEntry.find({
      userId: user._id,
      date: { $gte: start, $lte: end },
    }).lean();

    const todayTotal = todayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const target = user.dailyTarget || 1000;

    let title = "🎯 Progress Update!";
    let body = "";

    if (todayTotal < target) {
      const gap = Math.round(target - todayTotal);
      body = `You're doing great! You are only ₹${gap} away from your ₹${target} goal! You've got this! 💪`;
    } else {
      const surplus = Math.round(todayTotal - target);
      body = `Amazing! You've already earned ₹${surplus} MORE than your target! Keep crushing it! 🚀`;
    }

    await dispatchNudge(user._id, {
      type: "daily_target",
      title,
      body,
      priority: "normal",
      metadata: { todayTotal, target },
    });
  }
};

module.exports = { processHourlyTargets };
