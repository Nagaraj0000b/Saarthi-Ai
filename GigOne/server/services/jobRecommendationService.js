const { getWeatherContext } = require("./weatherService");
const { getTraffic } = require("./trafficService");
const { evaluateWellbeingRisk } = require("./wellbeingRiskService");
const { aggregateWorkload, getRecentValidMoodFeatures } = require("./workloadAggregationService");
const User = require("../models/User");
const jobMapping = require("../config/jobMapping");

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

/**
 * Orchestrates job recommendations using the XGBoost ML engine.
 * Gathers all context from Node.js services, sends it to the Python
 * FastAPI microservice, and returns the ranked results.
 * 
 * Falls back to a simple rule-based system if the ML API is unreachable.
 * 
 * @param {string} userId 
 * @param {number} lat 
 * @param {number} lon 
 * @param {string[]} [skills=[]] - User's selected skills list
 */
const recommendJobs = async (userId, lat, lon, skills = [], preferredJobs = []) => {
  // 1. Fetch User profile if missing context
  let userSkills = skills;
  let userPreferredJobs = preferredJobs;

  if (!userSkills.length || !userPreferredJobs.length) {
    try {
      const user = await User.findById(userId);
      if (user) {
        if (!userSkills.length) userSkills = user.skills || [];
        if (!userPreferredJobs.length) userPreferredJobs = user.registeredJobs || [];
      }
    } catch (err) {
      console.error("User profile fetch failed:", err.message);
    }
  }

  // 2. Gather all context in parallel
  const [weather, traffic, wellbeing, workload, moodFeatures] = await Promise.all([
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
    }),
    aggregateWorkload(String(userId), 7).catch(err => {
      console.error("Workload aggregation failed:", err.message);
      return { hoursToday: 0, hoursLast3Days: 0, consecutiveWorkDays: 0 };
    }),
    getRecentValidMoodFeatures(String(userId), 5).catch(err => {
      console.error("Mood features failed:", err.message);
      return { averageMood: 0 };
    })
  ]);

  const now = new Date();

  // 3. Build ML context payload
  // Map skill strings to bool flags for ML
  const skillMap = {
    "Bike & Scooter Driving": "skill_bike",
    "Car & Cab Driving": "skill_car",
    "Heavy Lifting & Moving": "skill_heavy",
    "Cleaning & House Chores": "skill_clean",
    "Skilled Trades & Repairs": "skill_trade",
    "Care & Assistance": "skill_care",
    "Computer & Admin Work": "skill_digital",
    "Customer Support & Calls": "skill_support"
  };

  const skillsPayload = {
    skill_bike: 0, skill_car: 0, skill_heavy: 0,
    skill_clean: 0, skill_trade: 0, skill_care: 0,
    skill_digital: 0, skill_support: 0
  };

  if (Array.isArray(userSkills)) {
    userSkills.forEach(s => {
      if (skillMap[s]) skillsPayload[skillMap[s]] = 1;
    });
  }

  const mlContext = {
    hour: now.getHours(),
    day: now.getDay() === 0 ? 6 : now.getDay() - 1, // Convert JS day (0=Sun) to our format (0=Mon)
    weather: weather.current.condition || "Clear",
    temp: weather.current.temp || 25,
    traffic: (traffic.traffic_level || "clear").toLowerCase(),
    congestion_percent: traffic.congestion_percent || 0,
    ...skillsPayload,
    registered_jobs: userPreferredJobs, // Passing list of platforms user is registered with
    hours_today: workload.hoursToday || 0,
    hours_last_3_days: workload.hoursLast3Days || 0,
    consecutive_days: workload.consecutiveWorkDays || 0,
    mood_score: moodFeatures.averageMood || 0,
    burnout_risk: (wellbeing.riskLevel || "low").toLowerCase()
  };

  // 4. Call ML API
  try {
    console.log("Calling ML API with context:", JSON.stringify(mlContext, null, 2));
    const response = await fetch(`${ML_API_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlContext),
        signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`ML API returned ${response.status}: ${errorDetail}`);
    }
    const mlResults = await response.json();

    let bestResults = mlResults;
    bestResults.sort((a, b) => b.predicted_earning - a.predicted_earning);

    // 5. Transform ML output to match our API contract
    const rankedJobs = bestResults.map((r, index) => ({
      job: r.job,
      jobType: r.job_type,
      finalScore: Math.round(r.predicted_earning * 10) / 10,
      predictedEarning: Math.round(r.predicted_earning * 10) / 10,
      isCompatible: r.is_compatible,
      rank: index + 1,
      reason: generateMLReason(r, mlContext)
    }));

    // Filter to only compatible jobs for the primary recommendation
    let compatibleJobs = rankedJobs.filter(j => j.isCompatible);
    
    // Apply user job preference filter if provided
    if (userPreferredJobs && userPreferredJobs.length > 0) {
      const lowerPrefs = userPreferredJobs.map(j => j.toLowerCase());
      compatibleJobs = compatibleJobs.filter(j => lowerPrefs.includes(j.job.toLowerCase()));
      // Also filter the overall rankedJobs list that gets returned
      rankedJobs.splice(0, rankedJobs.length, ...rankedJobs.filter(j => lowerPrefs.includes(j.job.toLowerCase())));
      
      // Safety fallback if no jobs match their selection (e.g. they selected non-compatible ones)
      if (compatibleJobs.length === 0 && rankedJobs.length > 0) {
          compatibleJobs = rankedJobs;
      }
    }
    const topJob = compatibleJobs.length > 0 ? compatibleJobs[0] : rankedJobs[0];

    return {
      recommendedJob: topJob.job,
      rankedJobs: rankedJobs,
      context: {
        weather: weather.current,
        traffic: traffic.traffic_level,
        wellbeingRisk: wellbeing.riskLevel,
        skills: userSkills
      },
      engine: "ml_xgboost_v1"
    };

  } catch (err) {
    console.error("ML API unreachable, falling back to rule engine:", err.message);
    return fallbackRuleEngine(weather, traffic, wellbeing, userSkills, userPreferredJobs);
  }
};

/**
 * Generates a human-readable explanation for ML-ranked jobs.
 */
function generateMLReason(result, context) {
  if (!result.is_compatible) {
    return "Not currently matched with your primary skill set.";
  }

  const earning = result.predicted_earning;
  const parts = [];

  const [rideHailing, instantDelivery, generalDelivery, homeServices, remoteServices] = jobMapping.categories;

  // Weather-based reasoning
  if (["Rain", "Thunderstorm", "Drizzle"].includes(context.weather)) {
    if (result.job_type === rideHailing) {
      parts.push("High demand for rides in rain");
    } else if (result.job_type === instantDelivery) {
      parts.push("High delivery demand in bad weather");
    } else if (result.job_type === homeServices) {
      parts.push("Higher demand for indoor home services");
    }
  }

  // Time-based reasoning
  const isLunch = context.hour >= 11 && context.hour <= 14;
  const isDinner = context.hour >= 18 && context.hour <= 21;
  const isLateNight = context.hour >= 22 || context.hour <= 2;

  if (isLunch || isDinner) {
    if (result.job_type === instantDelivery) {
      parts.push("Peak meal/grocery ordering hours");
    }
  }
  
  if (isLateNight && result.job_type === rideHailing) {
      parts.push("Late night travel demand");
  }

  // Burnout reasoning
  if (context.burnout_risk === "high") {
    if (result.job_type === remoteServices) {
        parts.push("Recommended low-impact work for recovery");
    } else {
        parts.push("Adjusted for your fatigue level");
    }
  }

  // Traffic reasoning
  if (context.traffic === "heavy" || context.traffic === "jam") {
    if (result.job_type === rideHailing) {
      parts.push("Heavy traffic restricts trip speed");
    } else if (result.job_type === instantDelivery || result.job_type === generalDelivery) {
      parts.push("Optimized for shorter delivery routes");
    }
  }

  if (parts.length === 0) {
    if (earning > 250) return "Top-tier earning potential right now.";
    if (earning > 180) return "Strong predicted performance.";
    return "Steady earning opportunity.";
  }

  return parts.join(". ") + ".";
}

/**
 * Fallback rule-based engine when ML API is unavailable.
 * Uses a simplified version of the old logic with the expanded 17-job set.
 */
function fallbackRuleEngine(weather, traffic, wellbeing, skills, preferredJobs = []) {
  const { getJobBaselines } = require("./jobBaselineService");
  const { getContextModifier } = require("./contextAdjustmentService");

  // Simplified mapping for fallback: Skills -> Category Keys
  const [rideHailing, instantDelivery, generalDelivery, homeServices, remoteServices] = jobMapping.categories;
  
  const skillToCategories = {
    "Bike & Scooter Driving": [rideHailing, instantDelivery, generalDelivery],
    "Car & Cab Driving": [rideHailing, generalDelivery],
    "Heavy Lifting & Moving": [generalDelivery],
    "Cleaning & House Chores": [homeServices],
    "Skilled Trades & Repairs": [homeServices],
    "Care & Assistance": [homeServices],
    "Computer & Admin Work": [remoteServices],
    "Customer Support & Calls": [remoteServices]
  };

  const userSkills = Array.isArray(skills) ? skills : [];
  let compatibleJobsSet = new Set();
  
  userSkills.forEach(s => {
    const categories = skillToCategories[s] || [];
    categories.forEach(cat => {
        const jobs = jobMapping.platforms[cat] || [];
        jobs.forEach(j => compatibleJobsSet.add(j));
    });
  });
  
  if (compatibleJobsSet.size === 0) {
      // Default to common gig jobs if no skills selected
      ["Uber", "Swiggy", "Zomato", "Rapido"].forEach(j => compatibleJobsSet.add(j));
  }
  let compatibleJobs = Array.from(compatibleJobsSet);
  
  if (preferredJobs && preferredJobs.length > 0) {
      const lowerPrefs = preferredJobs.map(j => j.toLowerCase());
      compatibleJobs = compatibleJobs.filter(j => lowerPrefs.includes(j.toLowerCase()));
      if (compatibleJobs.length === 0) compatibleJobs = ["Uber", "Swiggy"]; // Failsafe
  }

  const defaults = {
    Uber: 220, Ola: 210, BluSmart: 240, "Namma Yatri": 195, InDriver: 200,
    Rapido: 130, Swiggy: 165, Zomato: 170,
    Blinkit: 175, Zepto: 180, BigBasket: 160, JioMart: 155,
    "Amazon Flex": 185, Delhivery: 150, BlueDart: 165, Dunzo: 155,
    "Urban Company": 350, "Local Plumber": 300, "Local Electrician": 320, "Home Cleaning Co": 280,
    "Elderly Care": 250, "Pet Walker": 220,
    "DataEntry Inc": 120, "SupportHero": 150, "Virtual Assistant Hub": 180, "Translation Pro": 250,
    Other: 100
  };

  const results = compatibleJobs.map(job => {
    const base = defaults[job] || 100;
    const mod = getContextModifier(job, weather.current, traffic);
    const score = Math.max(0, base * mod);

    return {
      job,
      finalScore: Math.round(score * 10) / 10,
      predictedEarning: Math.round(score * 10) / 10,
      isCompatible: true,
      reason: "Fallback estimate (ML engine unavailable)."
    };
  });

  results.sort((a, b) => b.finalScore - a.finalScore);

  return {
    recommendedJob: results[0]?.job || "Other",
    rankedJobs: results,
    context: {
      weather: weather.current,
      traffic: traffic.traffic_level,
      wellbeingRisk: wellbeing.riskLevel,
      skills: skills
    },
    engine: "rule_fallback"
  };
}

module.exports = { recommendJobs };
