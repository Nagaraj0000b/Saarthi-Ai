/**
 * Service to adjust job scores based on environmental context (Weather & Traffic).
 * Uses 6 Job Types (Categories) to apply nuanced Indian market logic.
 */

const CATEGORIES = {
  CAB: ["Uber", "Ola", "BluSmart", "Namma Yatri", "InDriver"],
  BIKE_TAXI: ["Rapido"],
  FOOD: ["Swiggy", "Zomato"],
  QUICK_COMM: ["Blinkit", "Zepto", "BigBasket", "JioMart"],
  LOGISTICS: ["Amazon Flex", "Delhivery", "BlueDart"],
  HYPERLOCAL: ["Dunzo"]
};

// Helper: Get type check
const isType = (job, type) => CATEGORIES[type]?.includes(job);

/**
 * Computes a combined multiplier for a job based on context.
 * @param {string} job 
 * @param {Object} weather { condition: string, temp: number }
 * @param {Object} traffic { traffic_level: 'clear'|'moderate'|'heavy' }
 * @returns {number} Multiplier (e.g., 1.2 for +20%)
 */
const getContextModifier = (job, weather, traffic) => {
  let modifier = 1.0;

  const isRain = ["Rain", "Drizzle", "Thunderstorm"].includes(weather.condition);
  const isHeat = weather.temp > 35;
  const isHeavyTraffic = traffic.traffic_level === "heavy";
  const isModerateTraffic = traffic.traffic_level === "moderate";

  // --- WEATHER RULES ---
  if (isRain) {
    if (isType(job, "CAB")) {
      modifier += 0.30; // Massive surge for cabs in rain
    } else if (isType(job, "BIKE_TAXI") || isType(job, "FOOD") || isType(job, "HYPERLOCAL")) {
      modifier -= 0.20; // Dangerous and uncomfortable for bikes
    } else if (isType(job, "QUICK_COMM")) {
      modifier += 0.10; // More people order groceries when stuck inside
    }
  }

  if (isHeat) {
    if (isType(job, "FOOD") || isType(job, "QUICK_COMM")) {
      modifier += 0.15; // Heatwave = high delivery demand
    } else if (isType(job, "BIKE_TAXI")) {
      modifier -= 0.15; // Low passenger demand for long pillion bike rides
    }
  }

  // --- TRAFFIC RULES ---
  if (isHeavyTraffic) {
    if (isType(job, "CAB") || isType(job, "LOGISTICS")) {
      modifier -= 0.25; // Large vehicles get stuck, lower earning potential
    } else if (isType(job, "BIKE_TAXI") || isType(job, "FOOD") || isType(job, "QUICK_COMM")) {
      modifier += 0.15; // Bikes/Cycles lane-split and move faster relatively
    }
  } else if (isModerateTraffic) {
    if (isType(job, "CAB")) {
      modifier -= 0.05;
    }
  }

  // Ensure modifier stays within a sane bound [0.4 to 2.0]
  return Math.max(0.4, Math.min(2.0, modifier));
};

module.exports = { getContextModifier };
