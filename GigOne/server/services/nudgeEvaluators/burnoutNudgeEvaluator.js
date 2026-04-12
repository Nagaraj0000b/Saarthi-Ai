/**
 * @fileoverview Burnout / Wellbeing Nudge Evaluator.
 * Triggered after shift log completion. Checks wellbeing risk and
 * dispatches rest/recovery nudges for at-risk workers.
 *
 * @module server/services/nudgeEvaluators/burnoutNudgeEvaluator
 */

const { evaluateWellbeingRisk } = require("../wellbeingRiskService");
const { aggregateWorkload } = require("../workloadAggregationService");
const { dispatchNudge } = require("../nudgeDispatchService");

/**
 * Evaluates burnout/wellbeing risk for a user and dispatches nudge if needed.
 *
 * @param {string} userId - User's ObjectId string.
 * @param {Object} [dailyMood=null] - Today's mood data from the conversation.
 */
const evaluate = async (userId, dailyMood = null) => {
  try {
    const [risk, workload] = await Promise.all([
      evaluateWellbeingRisk(userId, dailyMood),
      aggregateWorkload(String(userId), 7),
    ]);

    // ── High Risk: Strong burnout warning ────────────────────────────
    if (risk.riskLevel === "high") {
      const reasons = risk.reasons || [];
      const reasonText = reasons.length > 0 ? reasons[0] : "High fatigue detected";

      await dispatchNudge(userId, {
        type: "burnout",
        title: "Take a Break — You Deserve It",
        body: `😓 ${reasonText}. Your burnout risk score is ${risk.riskScore}/100. Consider taking tomorrow off — your body and mind need recovery.`,
        priority: "high",
        metadata: {
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          emotionScore: risk.emotionScore,
          workloadScore: risk.workloadScore,
          recoveryScore: risk.recoveryScore,
          reasons,
        },
      });
      return;
    }

    // ── Moderate Risk + Extended Work Streak ──────────────────────────
    if (risk.riskLevel === "moderate" && workload.consecutiveWorkDays > 4) {
      await dispatchNudge(userId, {
        type: "burnout",
        title: "Consider a Lighter Shift",
        body: `💆 You've worked ${workload.consecutiveWorkDays} days in a row. Consider a shorter shift tomorrow or take a rest day. Your health is your best asset!`,
        metadata: {
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          consecutiveWorkDays: workload.consecutiveWorkDays,
        },
      });
      return;
    }

    // ── Heavy Single Day ─────────────────────────────────────────────
    if (workload.hoursToday > 10) {
      await dispatchNudge(userId, {
        type: "burnout",
        title: "Long Day — Rest Well Tonight",
        body: `🫂 You've logged ${workload.hoursToday} hours today. That's a marathon shift! Make sure to get a good night's sleep and eat well.`,
        metadata: {
          riskLevel: risk.riskLevel,
          hoursToday: workload.hoursToday,
        },
      });
      return;
    }

    // ── No Burnout Risk: Skip ────────────────────────────────────────
    console.log(`[BurnoutNudge] User ${userId}: risk=${risk.riskLevel}, score=${risk.riskScore}. No nudge needed.`);
  } catch (error) {
    console.error(`[BurnoutNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
