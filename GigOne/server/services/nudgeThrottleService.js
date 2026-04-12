/**
 * @fileoverview Nudge throttle service — gatekeeper preventing notification spam.
 *
 * Rules enforced:
 * 1. Quiet Hours: No nudges 10 PM – 8 AM IST (except next_day_shift)
 * 2. Global Spacing: Min 15 minutes between any two nudges to the same user
 * 3. Per-Type Cooldown: Each nudge type has its own minimum interval
 * 4. Daily Cap: Max 8 nudges per user per day
 *
 * @module server/services/nudgeThrottleService
 */

const Nudge = require("../models/Nudge");

// Per-type cooldown in milliseconds
const TYPE_COOLDOWNS = {
  environmental: 2 * 60 * 60 * 1000,       // 2 hours
  earnings_optimization: 4 * 60 * 60 * 1000, // 4 hours (1x per shift effectively)
  burnout: 24 * 60 * 60 * 1000,              // 1x per day
  daily_target: 24 * 60 * 60 * 1000,         // 1x per day
  next_day_shift: 24 * 60 * 60 * 1000,       // 1x per day
  surge: 60 * 60 * 1000,                     // 1 per hour
};

const GLOBAL_SPACING_MS = 15 * 60 * 1000; // 15 minutes
const DAILY_CAP = 8;

// IST offset: UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns the current hour in IST (0-23).
 */
const getISTHour = () => {
  const nowUTC = Date.now();
  const istTime = new Date(nowUTC + IST_OFFSET_MS);
  return istTime.getUTCHours();
};

/**
 * Returns start of today in IST as a UTC Date.
 */
const getISTDayStart = () => {
  const nowUTC = Date.now();
  const istTime = new Date(nowUTC + IST_OFFSET_MS);
  istTime.setUTCHours(0, 0, 0, 0);
  return new Date(istTime.getTime() - IST_OFFSET_MS);
};

/**
 * Checks whether a nudge can be sent to a user right now.
 *
 * @param {string} userId - Target user's ObjectId string.
 * @param {string} nudgeType - One of NUDGE_TYPES.
 * @returns {Promise<{ allowed: boolean, reason: string }>}
 */
const canSendNudge = async (userId, nudgeType) => {
  // ── Rule 1: Quiet Hours ────────────────────────────────────────────────
  const currentHourIST = getISTHour();
  const isQuietHours = currentHourIST >= 22 || currentHourIST < 8;

  if (isQuietHours && nudgeType !== "next_day_shift") {
    return {
      allowed: false,
      reason: `Quiet hours (${currentHourIST}:00 IST). Nudges blocked 10PM-8AM.`,
    };
  }

  // ── Rule 2: Global Spacing ─────────────────────────────────────────────
  const spacingCutoff = new Date(Date.now() - GLOBAL_SPACING_MS);
  const recentAnyNudge = await Nudge.findOne({
    userId,
    createdAt: { $gte: spacingCutoff },
  }).lean();

  if (recentAnyNudge) {
    const waitMs = GLOBAL_SPACING_MS - (Date.now() - new Date(recentAnyNudge.createdAt).getTime());
    const waitMin = Math.ceil(waitMs / 60000);
    return {
      allowed: false,
      reason: `Global spacing: another nudge was sent ${waitMin} min ago. Wait ${waitMin} min.`,
    };
  }

  // ── Rule 3: Per-Type Cooldown ──────────────────────────────────────────
  const cooldownMs = TYPE_COOLDOWNS[nudgeType] || GLOBAL_SPACING_MS;
  const cooldownCutoff = new Date(Date.now() - cooldownMs);
  const recentSameType = await Nudge.findOne({
    userId,
    type: nudgeType,
    createdAt: { $gte: cooldownCutoff },
  }).lean();

  if (recentSameType) {
    const cooldownHours = Math.round(cooldownMs / 3600000);
    return {
      allowed: false,
      reason: `Per-type cooldown: '${nudgeType}' was sent recently. Cooldown: ${cooldownHours}h.`,
    };
  }

  // ── Rule 4: Daily Cap ──────────────────────────────────────────────────
  const dayStart = getISTDayStart();
  const todayCount = await Nudge.countDocuments({
    userId,
    createdAt: { $gte: dayStart },
  });

  if (todayCount >= DAILY_CAP) {
    return {
      allowed: false,
      reason: `Daily cap reached: ${todayCount}/${DAILY_CAP} nudges sent today.`,
    };
  }

  return { allowed: true, reason: "All checks passed." };
};

module.exports = {
  canSendNudge,
  // Exported for testing
  TYPE_COOLDOWNS,
  GLOBAL_SPACING_MS,
  DAILY_CAP,
};
