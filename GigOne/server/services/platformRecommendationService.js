const { getPlatformBaselines } = require("./platformBaselineService");
const { getContextModifier } = require("./contextAdjustmentService");
const { getWellbeingPenalty } = require("./wellbeingAdjustmentService");
const { getWeatherContext } = require("./weatherService");
const { getTraffic } = require("./trafficService");
const { evaluateWellbeingRisk } = require("./wellbeingRiskService");

/**
 * Orchestrates the multi-platform recommendation logic.
 * @param {string} userId 
 * @param {number} lat 
 * @param {number} lon 
 */
const recommendPlatforms = async (userId, lat, lon) => {
  // 1. Fetch all required inputs in parallel with fallbacks to ensure robustness
  const [baselines, weather, traffic, wellbeing] = await Promise.all([
    getPlatformBaselines(userId).catch(err => {
      console.error("Baseline service failed:", err.message);
      return { Uber: 150, Ola: 140, Swiggy: 120, Zomato: 120, Rapido: 100 };
    }),
    getWeatherContext(lat, lon).catch(err => {
      console.error("Weather service failed:", err.message);
      return { current: { condition: "Clear", temp: 25 }, nextShift: null };
    }),
    getTraffic(lat, lon).catch(err => {
      console.error("Traffic service failed:", err.message);
      return { traffic_level: "clear", congestion_percent: 0 };
    }),
    evaluateWellbeingRisk(userId).catch(err => {
      console.error("Wellbeing service failed:", err.message);
      return { riskLevel: "low", riskScore: 0 };
    })
  ]);

  const platforms = ["Uber", "Ola", "Swiggy", "Zomato", "Rapido"];
  const results = [];

  // 2. Compute scores for each candidate platform
  for (const p of platforms) {
    const baseEarning = baselines[p] || 100;
    const contextMod = getContextModifier(p, weather.current, traffic);
    const wellbeingPenalty = getWellbeingPenalty(p, wellbeing, traffic);

    // FORMULA: (Baseline * Context) - Wellbeing Penalty
    const finalScore = Math.max(0, (baseEarning * contextMod) - wellbeingPenalty);

    results.push({
      platform: p,
      finalScore: Math.round(finalScore * 10) / 10,
      baseEarningScore: Math.round(baseEarning),
      contextModifier: contextMod,
      wellbeingPenalty: wellbeingPenalty,
      reason: generateReason(p, contextMod, wellbeingPenalty, wellbeing.riskLevel, weather.current, traffic.traffic_level)
    });
  }

  // 3. Rank descending by final score
  results.sort((a, b) => b.finalScore - a.finalScore);

  return {
    recommendedPlatform: results[0].platform,
    rankedPlatforms: results,
    context: {
      weather: weather.current,
      traffic: traffic.traffic_level,
      wellbeingRisk: wellbeing.riskLevel
    }
  };
};

/**
 * Generates a human-readable explanation for the recommendation.
 */
function generateReason(platform, contextMod, penalty, riskLevel, weather, traffic) {
  let reason = "Strong historical performance.";

  if (contextMod > 1.1) {
    if (["Uber", "Ola"].includes(platform) && weather.condition === "Rain") {
      reason = "High passenger demand due to rain.";
    } else if (traffic === "heavy") {
      reason = "Better efficiency in heavy traffic than cars.";
    } else {
      reason = "Favorable environmental conditions.";
    }
  } else if (contextMod < 0.9) {
    if (traffic === "heavy" && ["Uber", "Ola"].includes(platform)) {
      reason = "High traffic congestion reduces car efficiency.";
    } else {
      reason = "Unfavorable weather or traffic for this platform.";
    }
  }

  if (penalty > 30) {
    reason += ` Reduced priority due to your ${riskLevel} fatigue/burnout level.`;
  }

  return reason;
}

module.exports = { recommendPlatforms };
