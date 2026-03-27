const EarningsEntry = require("../models/EarningsEntry");

/**
 * Service to calculate baseline earnings for each platform based on user history.
 */

/**
 * Calculates historical hourly rates per platform.
 * @param {string} userId
 * @returns {Promise<Object>} Map of platform to average hourly rate
 */
const getPlatformBaselines = async (userId) => {
  // Get all earnings for this user
  const entries = await EarningsEntry.find({ userId }).sort({ date: -1 }).limit(50);

  const stats = {};

  // Default seed values based on standard market rates (Rupees/hr)
  const defaults = {
    Uber: 200,
    Ola: 190,
    Swiggy: 160,
    Zomato: 165,
    Rapido: 130,
    Other: 100
  };

  if (!entries || entries.length === 0) {
    return defaults;
  }

  // Group by platform
  entries.forEach(entry => {
    if (!stats[entry.platform]) {
      stats[entry.platform] = { totalAmount: 0, totalHours: 0, count: 0 };
    }
    stats[entry.platform].totalAmount += entry.amount;
    stats[entry.platform].totalHours += entry.hours;
    stats[entry.platform].count += 1;
  });

  const baselines = {};
  const platforms = ["Uber", "Ola", "Swiggy", "Zomato", "Rapido", "Other"];

  platforms.forEach(p => {
    if (stats[p] && stats[p].totalHours > 0) {
      // Calculate user average
      const userAvg = stats[p].totalAmount / stats[p].totalHours;
      
      // BLENDING LOGIC (Cold Start Solution):
      // As count increases, we trust user data more and defaults less.
      const weight = Math.min(stats[p].count / 5, 1); // Full weight after 5 entries
      baselines[p] = (userAvg * weight) + (defaults[p] * (1 - weight));
    } else {
      baselines[p] = defaults[p];
    }
  });

  return baselines;
};

module.exports = { getPlatformBaselines };
