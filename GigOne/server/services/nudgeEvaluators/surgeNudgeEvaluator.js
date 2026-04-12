/**
 * @fileoverview Surge Nudge Evaluator.
 * Polls every 5 minutes and fires urgent nudges when surge conditions are detected.
 *
 * @module server/services/nudgeEvaluators/surgeNudgeEvaluator
 */

const { getWeatherContext } = require("../weatherService");
const { getTraffic } = require("../trafficService");
const { calculateSurge } = require("../surgeDetectionService");
const { dispatchNudge } = require("../nudgeDispatchService");
const User = require("../../models/User");

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SURGE_THRESHOLD = 25;

/**
 * Evaluates surge conditions for a single user.
 *
 * @param {string} userId
 * @param {number} lat
 * @param {number} lon
 */
const evaluate = async (userId, lat, lon) => {
  try {
    const [weather, traffic] = await Promise.all([
      getWeatherContext(lat, lon).catch(() => null),
      getTraffic(lat, lon).catch(() => null),
    ]);

    if (!weather?.current) {
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const surge = calculateSurge(weather.current, traffic, hour, dayOfWeek);

    if (!surge.isSurge || surge.surgePercent < SURGE_THRESHOLD) {
      return;
    }

    // Build surge notification
    let warningText = "";
    const condition = (weather.current.condition || "").toLowerCase();
    if (["thunderstorm"].includes(condition)) {
      warningText = "\n⚠️ Storm warning — finish rides/deliveries quickly and seek shelter if needed.";
    }

    await dispatchNudge(userId, {
      type: "surge",
      title: `⚡ Surge Alert — ${surge.surgePercent}% Above Normal`,
      body: `Demand is ${surge.surgePercent}% above normal! ${surge.reason}.\n\n🎯 Best for: ${surge.bestPlatformType}\n⏱️ Estimated window: ${surge.estimatedWindow}${warningText}`,
      priority: "urgent",
      expiresInMs: 90 * 60 * 1000, // Expires in 90 minutes (surge is fleeting)
      data: { screen: "dashboard", surgePercent: surge.surgePercent },
      metadata: {
        surgeScore: surge.surgeScore,
        surgePercent: surge.surgePercent,
        bestPlatformType: surge.bestPlatformType,
        estimatedWindow: surge.estimatedWindow,
        reason: surge.reason,
        components: surge.components,
        weather: weather.current.condition,
        congestion: traffic?.congestion_percent,
      },
    });
  } catch (error) {
    console.error(`[SurgeNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

/**
 * Runs one surge evaluation cycle for all users with stored locations.
 */
const runCycle = async () => {
  try {
    const users = await User.find({
      "lastKnownLocation.lat": { $exists: true },
      "lastKnownLocation.lon": { $exists: true },
    })
      .select("_id lastKnownLocation skills")
      .lean();

    if (users.length === 0) {
      return; // Silent — runs every 5 min, no need to log absence
    }

    for (const user of users) {
      await evaluate(
        String(user._id),
        user.lastKnownLocation.lat,
        user.lastKnownLocation.lon
      );
    }
  } catch (error) {
    console.error("[SurgeNudge] Cycle failed:", error.message);
  }
};

/**
 * Starts the surge polling loop. Call once at server boot.
 */
const startPolling = () => {
  console.log(`[SurgeNudge] Polling started (every ${POLL_INTERVAL_MS / 60000} min)`);
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, POLL_INTERVAL_MS);
  }, 15000); // 15s delay after boot
};

module.exports = { evaluate, startPolling };
