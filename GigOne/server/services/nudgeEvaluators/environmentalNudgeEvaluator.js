/**
 * @fileoverview Environmental Nudge Evaluator.
 * Polls weather and traffic APIs for all active users with stored locations
 * and dispatches nudges when dangerous/opportunistic conditions are detected.
 *
 * @module server/services/nudgeEvaluators/environmentalNudgeEvaluator
 */

const { getWeatherContext } = require("../weatherService");
const { getTraffic } = require("../trafficService");
const { dispatchNudge } = require("../nudgeDispatchService");
const User = require("../../models/User");

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Evaluates environmental conditions for a single user and dispatches nudges.
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

    // ── Weather Nudges ─────────────────────────────────────────────────
    if (weather?.current) {
      const condition = (weather.current.condition || "").toLowerCase();
      const temp = weather.current.temp || 25;

      if (["rain", "thunderstorm"].includes(condition)) {
        await dispatchNudge(userId, {
          type: "environmental",
          title: "Rain Alert in Your Area",
          body: `🌧️ ${weather.current.description || "Rain detected"}. Delivery demand is spiking — indoor riders have the advantage. Stay safe on wet roads!`,
          priority: condition === "thunderstorm" ? "high" : "normal",
          metadata: { trigger: "weather", condition, temp },
        });
        return; // One environmental nudge per evaluation cycle
      }

      if (condition === "drizzle") {
        await dispatchNudge(userId, {
          type: "environmental",
          title: "Light Rain Detected",
          body: `🌦️ Drizzle in your area. Food delivery demand usually rises — good time for Swiggy/Zomato runs.`,
          metadata: { trigger: "weather", condition, temp },
        });
        return;
      }

      if (temp > 42) {
        await dispatchNudge(userId, {
          type: "environmental",
          title: "Extreme Heat Warning",
          body: `🔥 Temperature is ${temp}°C! Take frequent water breaks. Consider AC cab rides (BluSmart/Uber) over bike deliveries.`,
          priority: "high",
          metadata: { trigger: "weather", condition: "extreme_heat", temp },
        });
        return;
      }

      if (temp > 38) {
        await dispatchNudge(userId, {
          type: "environmental",
          title: "High Temperature Advisory",
          body: `☀️ ${temp}°C outside. Stay hydrated and avoid long bike rides during peak afternoon hours.`,
          metadata: { trigger: "weather", condition: "heat", temp },
        });
        return;
      }
    }

    // ── Traffic Nudges ─────────────────────────────────────────────────
    if (traffic) {
      const congestion = traffic.congestion_percent || 0;
      const level = (traffic.traffic_level || "clear").toLowerCase();

      if (congestion > 50 || level === "heavy") {
        await dispatchNudge(userId, {
          type: "environmental",
          title: "Heavy Traffic Detected",
          body: `🚗 ${congestion}% congestion in your zone. Ride-hailing trips will be slow — delivery routes may bypass the worst areas.`,
          metadata: { trigger: "traffic", congestion, level },
        });
      }
    }
  } catch (error) {
    console.error(`[EnvNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

/**
 * Runs one evaluation cycle for all users with stored locations.
 */
const runCycle = async () => {
  try {
    const users = await User.find({
      "lastKnownLocation.lat": { $exists: true },
      "lastKnownLocation.lon": { $exists: true },
    })
      .select("_id lastKnownLocation")
      .lean();

    if (users.length === 0) {
      console.log("[EnvNudge] No users with stored locations. Skipping cycle.");
      return;
    }

    console.log(`[EnvNudge] Running evaluation for ${users.length} users...`);

    for (const user of users) {
      await evaluate(
        String(user._id),
        user.lastKnownLocation.lat,
        user.lastKnownLocation.lon
      );
    }
  } catch (error) {
    console.error("[EnvNudge] Cycle failed:", error.message);
  }
};

/**
 * Starts the polling loop. Call once at server boot.
 */
const startPolling = () => {
  console.log(`[EnvNudge] Polling started (every ${POLL_INTERVAL_MS / 60000} min)`);
  // Run first cycle after a short delay to let the server fully boot
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, POLL_INTERVAL_MS);
  }, 10000);
};

module.exports = { evaluate, startPolling };
