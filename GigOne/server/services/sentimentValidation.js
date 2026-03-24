/**
 * @fileoverview Validation layer for the Sentiment Module.
 * Ensures LLM outputs strictly conform to the expected schema before they are
 * allowed to influence the downstream wellbeing calculations.
 */

const ALLOWED_LABELS = ["happy", "neutral", "tired", "stressed", "frustrated", "excited"];

/**
 * Validates and normalizes raw parsed JSON from the LLM.
 * 
 * @param {Object} rawOutput - The parsed JSON object from the AI.
 * @param {string} sourceStep - The step this text came from (default 'mood').
 * @returns {Object} Validated dailyMood object.
 */
const validateSentiment = (rawOutput, sourceStep = "mood") => {
    const fallback = {
        moodLabel: null,
        moodScore: null,
        summary: null,
        suggestion: null,
        confidence: 0,
        isValid: false,
        sourceStep
    };

    if (!rawOutput || typeof rawOutput !== "object") {
        return fallback;
    }

    let { moodLabel, moodScore, summary, suggestion, confidence } = rawOutput;

    // 1. Label Validation
    if (typeof moodLabel === "string") {
        moodLabel = moodLabel.toLowerCase();
    }
    if (!ALLOWED_LABELS.includes(moodLabel)) {
        return fallback;
    }

    // 2. Score Validation & Clamping
    moodScore = Number(moodScore);
    if (isNaN(moodScore) || !isFinite(moodScore)) {
        return fallback;
    }
    // Clamp between -1 and 1
    moodScore = Math.max(-1, Math.min(1, moodScore));

    // 3. Confidence Validation
    confidence = Number(confidence);
    if (isNaN(confidence) || !isFinite(confidence)) {
        confidence = 0;
    }
    confidence = Math.max(0, Math.min(1, confidence));

    // 4. Summary Validation
    if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
        return fallback;
    }

    // Passed all checks!
    return {
        moodLabel,
        moodScore,
        summary: summary.trim(),
        suggestion: typeof suggestion === "string" ? suggestion.trim() : "",
        confidence,
        isValid: true,
        sourceStep
    };
};

module.exports = { validateSentiment, ALLOWED_LABELS };
