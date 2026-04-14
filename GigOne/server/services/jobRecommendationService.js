const { getWeatherContext } = require("./weatherService");
const { getTraffic } = require("./trafficService");
const { evaluateWellbeingRisk } = require("./wellbeingRiskService");
const { aggregateWorkload, getRecentValidMoodFeatures } = require("./workloadAggregationService");
const User = require("../models/User");
const jobMapping = require("../config/jobMapping");

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

const recommendJobs = async (userId, lat, lon, skills = [], preferredJobs = []) => {
  let userObj = null;
  try {
    userObj = await User.findById(userId);
  } catch (err) {
    console.error("User profile fetch failed:", err.message);
  }

  const userSkills = userObj?.skills || [];
  const userRegisteredJobs = userObj?.registeredJobs || [];

  const [weather, traffic, wellbeing, workload, moodFeatures] = await Promise.all([
    getWeatherContext(lat, lon).catch(err => ({ current: { condition: "Clear", temp: 25, humidity: 50, wind_kph: 10, precip_mm: 0, vis_km: 10 }, nextShift: null })),
    getTraffic(lat, lon).catch(err => ({ traffic_level: "clear", congestion_percent: 0 })),
    evaluateWellbeingRisk(userId).catch(err => ({ riskLevel: "low", riskScore: 0 })),
    aggregateWorkload(String(userId), 7).catch(err => ({ hoursToday: 0, hoursLast3Days: 0, consecutiveWorkDays: 0 })),
    getRecentValidMoodFeatures(String(userId), 5).catch(err => ({ averageMood: 0, moodLabel: "neutral" }))
  ]);

  const mlContext = {
    gender: "Male", // Defaulting to mode of the dataset since User model lacks gender
    city: "Bangalore", // Defaulting to mode
    temperature_celsius: weather.current.temp || 25.0,
    humidity_percentage: weather.current.humidity || 50,
    congestion_percent: traffic.congestion_percent || 0.0,
    traffic_level: (traffic.traffic_level || "clear").toLowerCase(),
    moodLabel: moodFeatures.moodLabel || "neutral",
    moodScore: moodFeatures.averageMood || 0.0,
    hours_today: workload.hoursToday || 0.0,
    hours_last_3_days: workload.hoursLast3Days || 0.0,
    consecutive_days: workload.consecutiveWorkDays || 0,
    registered_jobs: userRegisteredJobs.map(j => ({ platform: j.platform, job_type: j.jobType, domain: j.domain || "" })),
    skills: userSkills.map(s => ({ name: s.name, experience: s.yearsOfExperience, level: s.skillLevel }))
  };

  try {
    console.log("Calling ML API with new context schema...");
    const response = await fetch(`${ML_API_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlContext),
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`ML API returned ${response.status}: ${errorDetail}`);
    }
    const mlResults = await response.json();

    let bestResults = mlResults;
    bestResults.sort((a, b) => b.predicted_earning - a.predicted_earning);

    const rankedJobs = bestResults.map((r, index) => ({
      job: r.job,
      jobType: r.job_type,
      finalScore: Math.round(r.predicted_earning * 10) / 10,
      predictedEarning: Math.round(r.predicted_earning * 10) / 10,
      isCompatible: r.is_compatible,
      rank: index + 1,
      reason: r.is_compatible ? "Matched with your skills and context." : "Not matched with your skills."
    }));

    let compatibleJobs = rankedJobs.filter(j => j.isCompatible);
    
    // Filter by Android requested platforms if provided
    if (preferredJobs && preferredJobs.length > 0) {
      const lowerPrefs = preferredJobs.map(j => j.toLowerCase());
      compatibleJobs = compatibleJobs.filter(j => lowerPrefs.includes(j.job.toLowerCase()));
      rankedJobs.splice(0, rankedJobs.length, ...rankedJobs.filter(j => lowerPrefs.includes(j.job.toLowerCase())));
      
      if (compatibleJobs.length === 0 && rankedJobs.length > 0) {
          compatibleJobs = rankedJobs; // Show incompatible if that's all they asked for
      }
    }

    if (rankedJobs.length === 0) {
        throw new Error("No jobs returned after filtering.");
    }

    const topJob = compatibleJobs.length > 0 ? compatibleJobs[0] : rankedJobs[0];

    return {
      recommendedJob: topJob.job,
      rankedJobs: rankedJobs,
      context: {
        weather: weather.current,
        traffic: traffic.traffic_level,
        wellbeingRisk: wellbeing.riskLevel,
        skills: userSkills.map(s => s.name)
      },
      engine: "ml_xgboost_v2"
    };

  } catch (err) {
    console.error("ML API failed, falling back:", err.message);
    return fallbackRuleEngine(weather, traffic, wellbeing, userSkills.map(s=>s.name), preferredJobs);
  }
};

function fallbackRuleEngine(weather, traffic, wellbeing, skills, preferredJobs = []) {
  // Safe fallback if ML crashes
  let jobsList = preferredJobs.length > 0 ? preferredJobs : ["Uber", "Zomato", "Swiggy"];
  if (jobsList.length === 0) jobsList = ["Uber", "Zomato"];
  
  const results = jobsList.map(job => {
    return {
      job,
      finalScore: 150,
      predictedEarning: 150,
      isCompatible: true,
      reason: "Fallback estimate (ML engine unavailable)."
    };
  });

  return {
    recommendedJob: results[0].job,
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
