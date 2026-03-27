/**
 * Service to apply safety penalties based on wellbeing/burnout risk.
 */

/**
 * Calculates a penalty value (to be subtracted) for a platform.
 * @param {string} platform 
 * @param {Object} riskData { riskLevel: 'low'|'moderate'|'high' }
 * @param {Object} traffic { traffic_level: 'clear'|'moderate'|'heavy' }
 * @returns {number} Penalty amount in currency units (e.g., -50 rupees)
 */
const getWellbeingPenalty = (platform, riskData, traffic) => {
  let penalty = 0;

  if (riskData.riskLevel === "low") {
    return 0; // No penalty for healthy workers
  }

  // Define "High-Stress" scenarios:
  // 1. Two-wheeler platforms (Rapido, Swiggy, Zomato) are physically demanding.
  // 2. Heavy traffic increases cognitive load.
  const isHighStressPlatform = ["Rapido", "Swiggy", "Zomato"].includes(platform);
  const isHeavyTraffic = traffic.traffic_level === "heavy";

  if (riskData.riskLevel === "moderate") {
    penalty = 20; // Base penalty
    if (isHighStressPlatform) penalty += 15;
    if (isHeavyTraffic) penalty += 15;
  }

  if (riskData.riskLevel === "high") {
    penalty = 60; // Significant penalty
    if (isHighStressPlatform) penalty += 40;
    if (isHeavyTraffic) penalty += 40;
  }

  return penalty;
};

module.exports = { getWellbeingPenalty };
