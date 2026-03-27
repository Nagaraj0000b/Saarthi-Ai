/**
 * Service to adjust platform scores based on environmental context (Weather & Traffic).
 */

/**
 * Computes a combined multiplier for a platform based on context.
 * @param {string} platform 
 * @param {Object} weather { condition: string, temp: number }
 * @param {Object} traffic { traffic_level: 'clear'|'moderate'|'heavy' }
 * @returns {number} Multiplier (e.g., 1.2 for +20%)
 */
const getContextModifier = (platform, weather, traffic) => {
  let modifier = 1.0;

  const isRain = ["Rain", "Drizzle", "Thunderstorm"].includes(weather.condition);
  const isHeat = weather.temp > 35;
  const isHeavyTraffic = traffic.traffic_level === "heavy";
  const isModerateTraffic = traffic.traffic_level === "moderate";

  // WEATHER RULES
  if (isRain) {
    if (["Uber", "Ola"].includes(platform)) {
      modifier += 0.25; // High demand for cabs in rain
    } else if (["Rapido", "Swiggy", "Zomato"].includes(platform)) {
      modifier -= 0.15; // Harder/Dangerous for bikes
    }
  }

  if (isHeat) {
    if (["Swiggy", "Zomato"].includes(platform)) {
      modifier += 0.15; // More people ordering in
    } else if (["Rapido"].includes(platform)) {
      modifier -= 0.10; // Uncomfortable for long bike rides
    }
  }

  // TRAFFIC RULES
  if (isHeavyTraffic) {
    if (["Uber", "Ola"].includes(platform)) {
      modifier -= 0.20; // Cabs get stuck, fewer trips/hr
    } else if (["Rapido", "Swiggy", "Zomato"].includes(platform)) {
      modifier += 0.10; // Bikes lane-split, relatively faster than cars
    }
  } else if (isModerateTraffic) {
    if (["Uber", "Ola"].includes(platform)) {
      modifier -= 0.05;
    }
  }

  // Ensure modifier stays within a sane academic bound [0.5 to 2.0]
  return Math.max(0.5, Math.min(2.0, modifier));
};

module.exports = { getContextModifier };
