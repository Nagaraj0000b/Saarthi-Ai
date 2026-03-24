/**
 * @fileoverview Wellbeing risk service.
 */

const { aggregateWorkload, getRecentValidMoodFeatures } = require("./workloadAggregationService");
const AppError = require("../utils/appError");

const validateUserId = (userId) => {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new AppError("userId is required", 400, { code: "VALIDATION_ERROR" });
  }

  return userId.trim();
};

const computeEmotionScore = (moodFeatures) => {
  let score = 0;

  if (moodFeatures.averageMood < 0) {
    score += Math.abs(moodFeatures.averageMood) * 40;
  }

  score += Math.min(moodFeatures.negativeMoodStreak * 10, 30);

  if (moodFeatures.moodTrend === "downward") {
    score += 20;
  }

  return Math.min(score, 100);
};

const computeWorkloadScore = (workloadFeatures) => {
  let score = 0;

  if (workloadFeatures.hoursToday > 8) {
    score += Math.min((workloadFeatures.hoursToday - 8) * 10, 40);
  }

  if (workloadFeatures.hoursLast3Days > 24) {
    score += Math.min((workloadFeatures.hoursLast3Days - 24) * 2, 30);
  }

  score += Math.min(workloadFeatures.heavyShiftCountLast7Days * 10, 30);

  return Math.min(score, 100);
};

const computeRecoveryScore = (workloadFeatures) => {
  let score = 0;

  if (workloadFeatures.consecutiveWorkDays > 5) {
    score += Math.min((workloadFeatures.consecutiveWorkDays - 5) * 15, 60);
  }

  if (workloadFeatures.restDaysLast7 === 0) {
    score += 40;
  } else if (workloadFeatures.restDaysLast7 === 1) {
    score += 20;
  }

  return Math.min(score, 100);
};

const mapRiskLevel = (riskScore) => {
  if (riskScore >= 70) {
    return "high";
  }

  if (riskScore >= 40) {
    return "moderate";
  }

  return "low";
};

const buildReasonList = (emotion, workload, recovery, moodFeatures, workloadFeatures) => {
  const reasons = [];

  if (emotion >= 60) {
    reasons.push(`Ongoing negative mood (${moodFeatures.negativeMoodStreak} days)`);
  } else if (emotion >= 40) {
    reasons.push("Recent emotional strain");
  }

  if (workload >= 60) {
    reasons.push(`High workload (${workloadFeatures.hoursLast3Days}h in 3 days)`);
  } else if (workload >= 40) {
    reasons.push("Intense recent shifts");
  }

  if (recovery >= 60) {
    reasons.push(`No rest day in ${workloadFeatures.consecutiveWorkDays} days`);
  } else if (recovery >= 40) {
    reasons.push("Low recovery time");
  }

  return reasons.length > 0 ? reasons : ["Parameters look normal"];
};

const mapAction = (riskLevel) => {
  switch (riskLevel) {
    case "high":
      return "suggest rest";
    case "moderate":
      return "take it easy";
    default:
      return "normal";
  }
};

const evaluateWellbeingRisk = async (userId, todayDailyMood = null) => {
  const normalizedUserId = validateUserId(userId);
  const [workloadFeatures, historicalMood] = await Promise.all([
    aggregateWorkload(normalizedUserId, 7),
    getRecentValidMoodFeatures(normalizedUserId, 5),
  ]);

  if (todayDailyMood && todayDailyMood.isValid) {
    historicalMood.validSignals += 1;
    historicalMood.averageMood =
      (historicalMood.averageMood * (historicalMood.validSignals - 1) +
        todayDailyMood.moodScore) /
      historicalMood.validSignals;

    if (todayDailyMood.moodScore < 0) {
      historicalMood.negativeMoodStreak += 1;
    } else {
      historicalMood.negativeMoodStreak = 0;
    }
  }

  const emotionScore = computeEmotionScore(historicalMood);
  const workloadScore = computeWorkloadScore(workloadFeatures);
  const recoveryScore = computeRecoveryScore(workloadFeatures);
  const riskScore = Math.round(
    emotionScore * 0.4 + workloadScore * 0.4 + recoveryScore * 0.2
  );
  const riskLevel = mapRiskLevel(riskScore);

  return {
    riskLevel,
    riskScore,
    emotionScore,
    workloadScore,
    recoveryScore,
    reasons: buildReasonList(
      emotionScore,
      workloadScore,
      recoveryScore,
      historicalMood,
      workloadFeatures
    ),
    recommendedAction: mapAction(riskLevel),
    isReliable: workloadFeatures.daysAnalyzed >= 3,
  };
};

module.exports = { evaluateWellbeingRisk };
