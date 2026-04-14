/**
 * @fileoverview Wellbeing risk service.
 */

const { aggregateWorkload, getRecentValidMoodFeatures } = require("./workloadAggregationService");
const { getWeatherContext } = require("./weatherService");
const { getTraffic } = require("./trafficService");
const AppError = require("../utils/appError");
const User = require("../models/User");

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

const validateUserId = (userId) => {
  if (!userId) {
    throw new AppError("User ID is required", 400, {
      code: "MISSING_USER_ID",
    });
  }
};

const mapAction = (riskLevel) => {
  switch (riskLevel.toLowerCase()) {
    case "high": return "Mandatory 30-min break strongly advised.";
    case "medium": return "Consider a short 10-min break soon.";
    default: return "Normal - Ready";
  }
};

/**
 * Main evaluation orchestrator: Evaluates burnout risk via the ML API
 * @param {string} userId
 * @param {Object|null} newMoodData
 * @returns {Promise<Object>} The aggregated risk analysis
 */
const evaluateWellbeingRisk = async (userId, newMoodData = null) => {
  validateUserId(userId);

  let userObj = null;
  try {
    userObj = await User.findById(userId);
  } catch (err) {
    console.error("User profile fetch failed:", err.message);
  }

  const userSkills = userObj?.skills || [];
  const userRegisteredJobs = userObj?.registeredJobs || [];
  
  // Use last known location if available, otherwise default to a central coordinate for context fetch
  const lat = userObj?.lastKnownLocation?.lat || 12.9716; 
  const lon = userObj?.lastKnownLocation?.lon || 77.5946;

  // 1. Gather all required context concurrently
  const [weather, traffic, workload, moodFeatures] = await Promise.all([
    getWeatherContext(lat, lon).catch(err => ({ current: { condition: "Clear", temp: 25, humidity: 50, wind_kph: 10, precip_mm: 0, vis_km: 10 } })),
    getTraffic(lat, lon).catch(err => ({ traffic_level: "clear", congestion_percent: 0 })),
    aggregateWorkload(String(userId), 7).catch(err => ({ hoursToday: 0, hoursLast3Days: 0, consecutiveWorkDays: 0 })),
    getRecentValidMoodFeatures(String(userId), 5).catch(err => ({ averageMood: 0, moodLabel: "neutral" }))
  ]);

  // Use the new voice mood if passed in directly from the chat session, otherwise fallback to historical
  const currentMoodLabel = newMoodData?.moodLabel || moodFeatures.moodLabel || "neutral";
  const currentMoodScore = newMoodData?.moodScore !== undefined ? newMoodData.moodScore : (moodFeatures.averageMood || 0);

  // 2. Build the exact payload schema our ML model expects
  const mlContext = {
    gender: userObj?.gender || "Male", 
    city: "Bangalore", // Could map lat/lon to city later if needed
    temperature_celsius: weather.current.temp || 25.0,
    humidity_percentage: weather.current.humidity || 50,
    congestion_percent: traffic.congestion_percent || 0.0,
    traffic_level: (traffic.traffic_level || "clear").toLowerCase(),
    moodLabel: currentMoodLabel,
    moodScore: currentMoodScore,
    hours_today: workload.hoursToday || 0.0,
    hours_last_3_days: workload.hoursLast3Days || 0.0,
    consecutive_days: workload.consecutiveWorkDays || 0,
    registered_jobs: userRegisteredJobs.map(j => ({ platform: j.platform, job_type: j.jobType, domain: j.domain || "" })),
    skills: userSkills.map(s => ({ name: s.name, experience: s.yearsOfExperience, level: s.skillLevel }))
  };

  try {
    // 3. Call the Python ML Endpoint for Burnout
    const response = await fetch(`${ML_API_URL}/burnout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlContext),
        signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`ML API returned ${response.status}: ${errorDetail}`);
    }

    const mlResult = await response.json();
    const riskLevel = mlResult.burnout_risk_level;

    // Convert string level to the legacy numeric score format so the frontend gauges still work perfectly
    let riskScore = 0;
    if (riskLevel === "High") riskScore = 80;
    else if (riskLevel === "Medium") riskScore = 50;
    else riskScore = 20;

    return {
      riskScore,
      riskLevel: riskLevel.toLowerCase(),
      recommendedAction: mapAction(riskLevel),
      isReliable: true,
      workloadFeatures: {
        hoursToday: workload.hoursToday,
        hoursLast3Days: workload.hoursLast3Days,
        consecutiveWorkDays: workload.consecutiveWorkDays,
        daysAnalyzed: 7
      },
      historicalMood: {
        averageScore: currentMoodScore,
        label: currentMoodLabel
      }
    };
  } catch (error) {
    console.error("ML Burnout API unreachable, falling back to heuristic engine:", error.message);
    return fallbackHeuristicEngine(workload, currentMoodLabel, currentMoodScore);
  }
};

/**
 * Legacy Rule-Based engine if Python ML is down
 */
function fallbackHeuristicEngine(workload, moodLabel, moodScore) {
  let score = 0;

  if (workload.hoursToday > 8) score += Math.min((workload.hoursToday - 8) * 10, 40);
  if (workload.consecutiveWorkDays > 5) score += Math.min((workload.consecutiveWorkDays - 5) * 5, 20);
  if (workload.hoursLast3Days > 30) score += 20;
  if (moodScore < -0.3) score += 20;

  score = Math.min(Math.max(score, 0), 100);

  let riskLevel = "low";
  if (score >= 70) riskLevel = "high";
  else if (score >= 40) riskLevel = "medium";

  return {
    riskScore: score,
    riskLevel,
    recommendedAction: mapAction(riskLevel),
    isReliable: false,
    workloadFeatures: workload,
    historicalMood: { averageScore: moodScore, label: moodLabel }
  };
}

module.exports = { evaluateWellbeingRisk };
