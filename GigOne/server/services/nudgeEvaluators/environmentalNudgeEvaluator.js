/**
 * @fileoverview Environmental Nudge Evaluator.
 * Fires for extreme conditions only:
 *  - Temperature > 40°C  → extreme heat alert + indoor work suggestions
 *  - Heavy rainfall/thunderstorm → wet weather alert + platform recommendations
 *
 * Runs every 30 minutes. Once sent, throttle prevents repeat for 6 hours.
 */

const { getWeatherContext } = require("../weatherService");
const { dispatchNudge }     = require("../nudgeDispatchService");
const User                  = require("../../models/User");

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Indoor/alternative work suggestions for bad weather
const INDOOR_SUGGESTIONS = [
  "Swiggy Instamart", "Blinkit", "Zepto", "Dunzo", "Amazon Flex"
];

/**
 * Evaluates environmental conditions for a single user.
 */
const evaluate = async (userId, lat, lon) => {
  try {
    // Check current weather AND evening forecast (8 PM tonight)
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(20, 0, 0, 0);
    
    // Check forecast for tonight if it's currently before 5 PM
    const targetUnix = now.getHours() < 17 ? Math.floor(tonight.getTime() / 1000) : undefined;

    const weather = await getWeatherContext(lat, lon, targetUnix).catch(() => null);
    if (!weather) return;

    const currentCondition = (weather.current?.condition || "").toLowerCase();
    const currentTemp      = weather.current?.temp || 25;

    // ── Extreme Heat (>40°C) ─────────────────────────────────────────────
    if (currentTemp > 40) {
      const indoorPlatforms = INDOOR_SUGGESTIONS.slice(0, 3).join(", ");
      await dispatchNudge(userId, {
        type    : "environmental",
        title   : "🔥 Extreme Heat Warning",
        priority: "high",
        body    : `Temperature is ${currentTemp}°C — dangerously hot for outdoor work! ` +
                  `Take frequent breaks and stay hydrated. Consider switching to indoor delivery platforms: ${indoorPlatforms}.`,
        metadata: { trigger: "extreme_heat", temp: currentTemp, condition: currentCondition },
      });
      return;
    }

    // ── Current Heavy Rainfall / Thunderstorm ────────────────────────────
    const isRainyNow = ["rain", "thunderstorm", "drizzle", "storm"].some(w => currentCondition.includes(w));
    if (isRainyNow) {
      const indoorPlatforms = INDOOR_SUGGESTIONS.slice(0, 3).join(", ");
      await dispatchNudge(userId, {
        type    : "environmental",
        title   : "🌧️ Heavy Rain Alert",
        priority: "high",
        body    : `Heavy rain detected in your area! Road conditions are risky for bike/ride work. ` +
                  `Consider switching to safer indoor delivery platforms: ${indoorPlatforms}.`,
        metadata: { trigger: "heavy_rain", condition: currentCondition, temp: currentTemp },
      });
      return;
    }

    // ── Predictive Evening Rain (Forecast) ───────────────────────────────
    if (weather.nextShift) {
      const eveningCondition = (weather.nextShift.condition || "").toLowerCase();
      const pop = weather.nextShift.pop || 0;
      
      const isRainyLater = ["rain", "thunderstorm", "storm"].some(w => eveningCondition.includes(w)) || pop > 0.6;
      
      if (isRainyLater && !isRainyNow) {
        const indoorPlatforms = INDOOR_SUGGESTIONS.slice(0, 3).join(", ");
        await dispatchNudge(userId, {
          type    : "environmental",
          title   : "🌦️ Rain Expected Tonight",
          priority: "normal",
          body    : `Heavy rain is forecast for tonight around 8 PM. If you plan to work the night shift, pack rain gear or switch to indoor platforms like ${indoorPlatforms}.`,
          metadata: { trigger: "predictive_rain", condition: eveningCondition, pop },
        });
        return;
      }
    }

    console.log(`[EnvNudge] User ${userId}: temp=${currentTemp}°C, condition=${currentCondition}. No extreme condition.`);
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
    }).select("_id lastKnownLocation").lean();

    if (users.length === 0) {
      console.log("[EnvNudge] No users with stored locations. Skipping.");
      return;
    }

    console.log(`[EnvNudge] Running evaluation for ${users.length} users...`);
    for (const user of users) {
      await evaluate(String(user._id), user.lastKnownLocation.lat, user.lastKnownLocation.lon);
    }
  } catch (error) {
    console.error("[EnvNudge] Cycle failed:", error.message);
  }
};

/**
 * Starts the polling loop. Called once at server boot.
 */
const startPolling = () => {
  console.log(`[EnvNudge] Polling started (every ${POLL_INTERVAL_MS / 60000} min) — extreme weather only.`);
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, POLL_INTERVAL_MS);
  }, 10000);
};

module.exports = { evaluate, startPolling };
