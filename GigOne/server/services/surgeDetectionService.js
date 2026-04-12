/**
 * @fileoverview Surge Detection Service.
 * Calculates a synthetic surge score using weather, traffic, time-of-day,
 * and day-of-week heuristics. No external surge API needed.
 *
 * @module server/services/surgeDetectionService
 */

/**
 * Determines the best platform type based on conditions.
 *
 * @param {string} weatherCondition
 * @param {number} hour
 * @returns {string} Platform category recommendation.
 */
const determineBestType = (weatherCondition, hour) => {
  const condition = (weatherCondition || "").toLowerCase();
  const isRain = ["rain", "thunderstorm", "drizzle"].includes(condition);
  const isMealTime = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);
  const isLateNight = hour >= 22 || hour <= 2;

  if (isMealTime && isRain) return "Instant Delivery (Swiggy, Zomato, Blinkit)";
  if (isMealTime) return "Instant Delivery (Swiggy, Zomato)";
  if (isRain) return "Ride Hailing (Uber, Ola, Rapido)";
  if (isLateNight) return "Ride Hailing (Uber, Ola)";
  return "Delivery (multi-platform)";
};

/**
 * Builds a human-readable reason string for why surge is happening.
 *
 * @param {Object} components
 * @returns {string}
 */
const buildSurgeReason = (components) => {
  const reasons = [];
  if (components.weatherScore > 0) reasons.push(components.weatherDetail);
  if (components.timeScore > 0) reasons.push(components.timeDetail);
  if (components.trafficScore > 0) reasons.push(components.trafficDetail);
  if (components.dayScore > 0) reasons.push(components.dayDetail);
  return reasons.join(" + ") || "Multiple factors";
};

/**
 * Calculates surge score from environmental and temporal signals.
 *
 * @param {Object} weather - { condition, temp, description }
 * @param {Object} traffic - { traffic_level, congestion_percent }
 * @param {number} hour - Current hour (0-23).
 * @param {number} dayOfWeek - Day of week (0=Sun, 6=Sat).
 * @returns {Object} Surge analysis result.
 */
const calculateSurge = (weather, traffic, hour, dayOfWeek) => {
  let surgeScore = 0;
  const components = {};

  // ── Weather Factor ─────────────────────────────────────────────────
  const condition = (weather?.condition || "").toLowerCase();
  const temp = weather?.temp || 25;

  if (["rain", "thunderstorm"].includes(condition)) {
    surgeScore += 30;
    components.weatherScore = 30;
    components.weatherDetail = "Rain/Storm demand spike";
  } else if (condition === "drizzle") {
    surgeScore += 15;
    components.weatherScore = 15;
    components.weatherDetail = "Drizzle boosting delivery demand";
  } else {
    components.weatherScore = 0;
  }

  if (temp > 42) {
    surgeScore += 10;
    components.weatherScore = (components.weatherScore || 0) + 10;
    components.weatherDetail = (components.weatherDetail || "") + " + Extreme heat";
  }

  // ── Time Demand Curve ──────────────────────────────────────────────
  const isLunchRush = hour >= 11 && hour <= 14;
  const isDinnerRush = hour >= 18 && hour <= 21;
  const isLateNight = hour >= 22 || hour <= 2;

  if (isLunchRush || isDinnerRush) {
    surgeScore += 20;
    components.timeScore = 20;
    components.timeDetail = isLunchRush ? "Lunch rush hours" : "Dinner rush hours";
  } else if (isLateNight) {
    surgeScore += 10;
    components.timeScore = 10;
    components.timeDetail = "Late night ride demand";
  } else {
    components.timeScore = 0;
  }

  // ── Day Factor ─────────────────────────────────────────────────────
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  if (isWeekend && (isDinnerRush || isLateNight)) {
    surgeScore += 15;
    components.dayScore = 15;
    components.dayDetail = "Weekend evening demand";
  } else if (isFriday && isDinnerRush) {
    surgeScore += 10;
    components.dayScore = 10;
    components.dayDetail = "Friday evening surge";
  } else {
    components.dayScore = 0;
  }

  // ── Traffic Factor (ride-hailing specific) ─────────────────────────
  const congestion = traffic?.congestion_percent || 0;

  if (congestion > 40) {
    surgeScore += 15;
    components.trafficScore = 15;
    components.trafficDetail = `${congestion}% road congestion`;
  } else {
    components.trafficScore = 0;
  }

  // ── Result ─────────────────────────────────────────────────────────
  const isSurge = surgeScore >= 25;

  return {
    surgeScore,
    surgePercent: surgeScore,
    isSurge,
    bestPlatformType: determineBestType(weather?.condition, hour),
    estimatedWindow: surgeScore >= 50 ? "60-90 min" : "30-60 min",
    reason: buildSurgeReason(components),
    components,
  };
};

module.exports = { calculateSurge };
