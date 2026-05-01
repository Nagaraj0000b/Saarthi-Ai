/**
 * @fileoverview Earnings Optimization Nudge Evaluator.
 * Triggered after shift log. Compares the worker's current platform
 * against ML recommendations and suggests a switch if significantly better.
 *
 * @module server/services/nudgeEvaluators/earningsNudgeEvaluator
 */

const { recommendJobs } = require("../jobRecommendationService");
const { dispatchNudge } = require("../nudgeDispatchService");
const User = require("../../models/User");

// Threshold: suggest platform switch if alternative earns 20% more
const SWITCH_THRESHOLD = 1.2;

/**
 * Evaluates whether a better-earning platform exists for this user.
 *
 * @param {string} userId
 * @param {string} currentPlatform - Platform the user just logged a shift on.
 * @param {number} currentEarnings - Earnings logged on this shift.
 * @param {number|null} lat
 * @param {number|null} lon
 */
const evaluate = async (userId, currentPlatform, currentEarnings, lat = null, lon = null) => {
  try {
    // Need location for ML predictions
    let useLat = lat;
    let useLon = lon;

    if (!useLat || !useLon) {
      const user = await User.findById(userId).select("lastKnownLocation").lean();
      if (user?.lastKnownLocation?.lat && user?.lastKnownLocation?.lon) {
        useLat = user.lastKnownLocation.lat;
        useLon = user.lastKnownLocation.lon;
      } else {
        console.log(`[EarningsNudge] No location for user ${userId}. Skipping.`);
        return;
      }
    }

    const result = await recommendJobs(userId, useLat, useLon);

    if (!result || !result.rankedJobs || result.rankedJobs.length === 0) {
      return;
    }

    // Find the top-ranked compatible job that ISN'T the current platform
    const alternatives = result.rankedJobs.filter(
      (j) => j.isCompatible && j.job.toLowerCase() !== (currentPlatform || "").toLowerCase()
    );

    if (alternatives.length === 0) {
      console.log(`[EarningsNudge] No alternative platforms for user ${userId}. Skipping.`);
      return;
    }

    const bestAlt = alternatives[0];
    const currentPerHour = currentEarnings && currentEarnings > 0 ? currentEarnings : 0;
    const altPredicted = bestAlt.predictedEarning || bestAlt.finalScore;

    // Only suggest if the alternative is meaningfully better
    // Compare predicted vs current platform's predicted (not actual logged earnings)
    const currentJob = result.rankedJobs.find(
      (j) => j.job.toLowerCase() === (currentPlatform || "").toLowerCase()
    );
    const currentPredicted = currentJob ? (currentJob.predictedEarning || currentJob.finalScore) : currentPerHour;

    if (currentPredicted > 0 && altPredicted > currentPredicted * SWITCH_THRESHOLD) {
      const improvement = Math.round(((altPredicted - currentPredicted) / currentPredicted) * 100);
      const reason = bestAlt.reason || "Better conditions detected for this platform.";

      await dispatchNudge(userId, {
        type: "earnings_optimization",
        title: `${bestAlt.job} Could Earn You ${improvement}% More`,
        body: `💰 Based on current conditions, ${bestAlt.job} is predicted to earn ~₹${Math.round(altPredicted)}/hr vs ₹${Math.round(currentPredicted)}/hr on ${currentPlatform}. ${reason}`,
        data: { suggestedPlatform: bestAlt.job, improvement },
        metadata: {
          currentPlatform,
          suggestedPlatform: bestAlt.job,
          currentPredicted: Math.round(currentPredicted),
          altPredicted: Math.round(altPredicted),
          improvement,
          reason,
        },
      });
    } else {
      console.log(`[EarningsNudge] User ${userId} is already on optimal platform. No nudge.`);
    }
  } catch (error) {
    console.error(`[EarningsNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
