/**
 * @fileoverview Next Day Shift Nudge Evaluator.
 * Generates a personalized plan for tomorrow including weather forecast,
 * ML-powered platform recommendation, and rest advice.
 *
 * @module server/services/nudgeEvaluators/nextDayShiftNudgeEvaluator
 */

const { getWeatherContext } = require("../weatherService");
const { recommendJobs } = require("../jobRecommendationService");
const { evaluateWellbeingRisk } = require("../wellbeingRiskService");
const { dispatchNudge } = require("../nudgeDispatchService");

/**
 * Returns Unix timestamp for tomorrow at a target hour (IST).
 * @param {number} hour - Target hour in IST (0-23).
 */
const getTomorrowTimestamp = (hour = 10) => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  // Set to target hour IST (UTC+5:30)
  tomorrow.setHours(hour - 5, 30, 0, 0); // approximate IST→UTC
  return Math.floor(tomorrow.getTime() / 1000);
};

/**
 * Generates a weather summary string for a forecast object.
 */
const formatWeatherSummary = (forecast) => {
  if (!forecast) return null;
  const temp = Math.round(forecast.temp || 0);
  const condition = forecast.condition || "Unknown";
  const desc = forecast.description || condition;
  const emoji = {
    Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
    Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Haze: "🌫️",
    Fog: "🌫️",
  }[condition] || "🌤️";

  return `${emoji} ${desc}, ${temp}°C`;
};

/**
 * Evaluates and generates a next-day shift plan nudge.
 *
 * @param {string} userId
 * @param {number} lat
 * @param {number} lon
 */
const evaluate = async (userId, lat, lon) => {
  try {
    const tomorrowTimestamp = getTomorrowTimestamp(10); // Predict for 10 AM start

    // Gather all data in parallel
    const [weather, recommendations, risk] = await Promise.all([
      getWeatherContext(lat, lon, tomorrowTimestamp).catch(() => null),
      recommendJobs(userId, lat, lon).catch(() => null),
      evaluateWellbeingRisk(userId).catch(() => null),
    ]);

    // ── Build the nudge body ─────────────────────────────────────────
    const parts = [];
    parts.push("📅 Tomorrow's Plan\n");

    // Weather
    const weatherStr = formatWeatherSummary(weather?.nextShift || weather?.current);
    if (weatherStr) {
      parts.push(weatherStr);
    }

    // Best platform
    if (recommendations?.rankedJobs?.length > 0) {
      const topJob = recommendations.rankedJobs.find((j) => j.isCompatible) || recommendations.rankedJobs[0];
      const predicted = Math.round(topJob.predictedEarning || topJob.finalScore || 0);
      parts.push(`🏆 Best platform: ${topJob.job} (predicted ~₹${predicted}/hr)`);
    }

    // Rest advice
    if (risk?.riskLevel === "high") {
      parts.push("⚠️ Your burnout risk is high — strongly consider a rest day tomorrow");
    } else if (risk?.riskLevel === "moderate") {
      parts.push("💆 Consider starting late or taking a shorter shift tomorrow");
    } else {
      parts.push("✅ You're in good shape — full day ahead if you want it!");
    }

    // Weather warning for tomorrow
    if (weather?.nextShift?.condition) {
      const condition = weather.nextShift.condition.toLowerCase();
      if (["rain", "thunderstorm", "drizzle"].includes(condition)) {
        parts.push(`🌧️ Rain expected tomorrow — carry rain gear!`);
      }
    }

    parts.push("\nRest well tonight! 🌙");

    const bodyText = parts.join("\n");

    await dispatchNudge(userId, {
      type: "next_day_shift",
      title: "Your Tomorrow Shift Plan is Ready",
      body: bodyText,
      priority: "normal",
      expiresInMs: 14 * 60 * 60 * 1000, // Expires in 14 hours (by next morning)
      data: { screen: "dashboard" },
      metadata: {
        weather: weatherStr,
        topPlatform: recommendations?.recommendedJob,
        riskLevel: risk?.riskLevel,
      },
    });
  } catch (error) {
    console.error(`[NextDayNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
