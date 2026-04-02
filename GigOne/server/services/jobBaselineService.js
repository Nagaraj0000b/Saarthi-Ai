const EarningsEntry = require("../models/EarningsEntry");

/**
 * Service to calculate baseline earnings for each platform based on user history.
 */

/**
 * Calculates historical hourly rates per platform.
 * @param {string} userId
 * @returns {Promise<Object>} Map of platform to average hourly rate
 */
const getJobBaselines = async (userId) => {
  // Get all earnings for this user
  const entries = await EarningsEntry.find({ userId }).sort({ date: -1 }).limit(50);

  const stats = {};

  // Default seed values based on standard market rates (Rupees/hr)
  const defaults = {
    Uber: 220,
    Ola: 210,
    Swiggy: 160,
    Zomato: 165,
    Blinkit: 170,
    Zepto: 175,
    Rapido: 130,
    "Amazon Flex": 180,
    BigBasket: 155,
    Delhivery: 145,
    BluSmart: 240,
    Dunzo: 150,
    "Namma Yatri": 195,
    BlueDart: 160,
    JioMart: 150,
    InDriver: 200,
    Other: 100
  };

  if (!entries || entries.length === 0) {
    return defaults;
  }

  // Group by job
  entries.forEach(entry => {
    if (!stats[entry.job]) {
      stats[entry.job] = { totalAmount: 0, totalHours: 0, count: 0 };
    }
    stats[entry.job].totalAmount += entry.amount;
    stats[entry.job].totalHours += entry.hours;
    stats[entry.job].count += 1;
  });

  const baselines = {};
  const jobs = [
    "Uber", "Ola", "Swiggy", "Zomato", "Blinkit", "Zepto", "Rapido", 
    "Amazon Flex", "BigBasket", "Delhivery", "BluSmart", "Dunzo", 
    "Namma Yatri", "BlueDart", "JioMart", "InDriver", "Other"
  ];

  jobs.forEach(p => {
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

module.exports = { getJobBaselines };
