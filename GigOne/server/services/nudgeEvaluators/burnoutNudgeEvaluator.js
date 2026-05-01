/**
 * @fileoverview Burnout / Wellbeing Nudge Evaluator.
 * Fires ONLY when burnout risk score >= 80%.
 * Includes estimated recovery time and low-earning activity suggestions.
 * Throttled to once per 24 hours.
 */

const { evaluateWellbeingRisk } = require("../wellbeingRiskService");
const { aggregateWorkload }     = require("../workloadAggregationService");
const { dispatchNudge }         = require("../nudgeDispatchService");

const BURNOUT_THRESHOLD = 80; // Only fire at 80%+ risk score

// Low-intensity earning activities to suggest during recovery
const LOW_EARNING_SUGGESTIONS = [
  "Short Swiggy/Zomato deliveries near home (1-2 hrs max)",
  "Grocery delivery (Blinkit/Zepto) — indoor-friendly, low stress",
  "Amazon Flex short blocks (2 hr shifts)",
  "Online task platforms (freelance data entry, surveys)",
];

/**
 * Calculates estimated recovery time based on risk score and workload.
 *
 * @param {number} riskScore - 0-100
 * @param {number} consecutiveWorkDays
 * @returns {string} Human-readable recovery estimate
 */
const getRecoveryEstimate = (riskScore, consecutiveWorkDays) => {
  if (riskScore >= 95) return "2–3 rest days recommended";
  if (riskScore >= 90) return "1–2 rest days recommended";
  if (riskScore >= 80) return "1 rest day or significantly lighter shift tomorrow";
  return "A lighter shift tomorrow should help";
};

/**
 * Evaluates burnout risk and dispatches nudge if risk >= 80%.
 *
 * @param {string} userId
 * @param {Object} [dailyMood=null]
 */
const evaluate = async (userId, dailyMood = null) => {
  try {
    const [risk, workload] = await Promise.all([
      evaluateWellbeingRisk(userId, dailyMood),
      aggregateWorkload(String(userId), 7),
    ]);

    const riskScore = risk.riskScore || 0;

    if (riskScore < BURNOUT_THRESHOLD) {
      console.log(`[BurnoutNudge] User ${userId}: score=${riskScore} — below ${BURNOUT_THRESHOLD}%. No nudge.`);
      return;
    }

    // ── Build burnout nudge with recovery + suggestions ──────────────────
    const recovery       = getRecoveryEstimate(riskScore, workload.consecutiveWorkDays || 0);
    const reasons        = risk.reasons || [];
    const reasonText     = reasons.length > 0 ? reasons[0] : "High cumulative fatigue detected";
    const lowEarningSuggestion = LOW_EARNING_SUGGESTIONS[
      Math.min(Math.floor((riskScore - 80) / 5), LOW_EARNING_SUGGESTIONS.length - 1)
    ];

    const body = [
      `⚠️ Your wellbeing risk score is ${riskScore}/100. ${reasonText}.`,
      `Recovery: ${recovery}.`,
      `If you must work: ${lowEarningSuggestion}.`,
    ].join(" ");

    await dispatchNudge(userId, {
      type    : "burnout",
      title   : "🛑 Rest Needed — High Burnout Risk",
      body,
      priority: riskScore >= 90 ? "urgent" : "high",
      metadata: {
        riskScore,
        riskLevel           : risk.riskLevel,
        consecutiveWorkDays : workload.consecutiveWorkDays,
        recovery,
        reasons,
      },
    });
  } catch (error) {
    console.error(`[BurnoutNudge] Evaluation failed for user ${userId}:`, error.message);
  }
};

module.exports = { evaluate };
