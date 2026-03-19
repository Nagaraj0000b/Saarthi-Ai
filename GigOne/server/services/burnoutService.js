/**
 * @fileoverview Burnout Detection Module
 * Analyzes a worker's 5-day mood history to detect burnout risks and 
 * stress warnings, completely decoupled from the database architecture.
 * 
 * @module server/services/burnoutService
 */

/**
 * Calculates burnout risk based on psychological models (EMA & Effort-Recovery Model).
 * 
 * @param {number[]} moodHistory - Array of the last 5 days' mood scores (-1.0 to 1.0).
 *                                 Index 0 is the oldest, Index 4 is the newest.
 * @returns {Object} Burnout status flags, average, and suggested action.
 */
const checkBurnout = (moodHistory) => {
  if (!moodHistory || moodHistory.length === 0) {
    return { isBurnoutAlert: false, isStressWarning: false, averageScore: 0, action: "Normal" };
  }

  // 1. Calculate 5-Day Moving Average
  const sum = moodHistory.reduce((acc, score) => acc + score, 0);
  const averageScore = Number((sum / moodHistory.length).toFixed(2));

  // 2. Check Stress Warning (Average falls to or below -0.3)
  const isStressWarning = averageScore <= -0.3;

  // 3. Check Burnout Alert (Last 3 consecutive days are strictly negative)
  let isBurnoutAlert = false;
  if (moodHistory.length >= 3) {
    // Slice out the last 3 days
    const lastThree = moodHistory.slice(-3);
    // True only if every single day was below 0
    isBurnoutAlert = lastThree.every((score) => score < 0);
  }

  // 4. Determine Recommended Action for the Chatbot / UI Nudge
  let action = "Normal";
  if (isBurnoutAlert && isStressWarning) {
    action = "Rest Required";
  } else if (isBurnoutAlert) {
    action = "Take a Break";
  } else if (isStressWarning) {
    action = "Monitor Stress";
  }

  return {
    isBurnoutAlert,
    isStressWarning,
    averageScore,
    action
  };
};

module.exports = { checkBurnout };
