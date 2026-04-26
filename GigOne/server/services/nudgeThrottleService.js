/**
 * @fileoverview Nudge throttle service — prevents repeated notifications.
 *
 * Rules:
 * 1. Quiet Hours: No nudges 10 PM – 8 AM IST
 * 2. Per-Type Cooldown: Once per 24h per type (once sent, don't send again same day)
 * 3. Global Spacing: Min 5 minutes between any two nudges to same user
 * 4. Daily Cap: Max 3 nudges/day (one per type)
 */

const Nudge = require("../models/Nudge");

// Once per 24 hours per type — "don't send it again" rule
const TYPE_COOLDOWNS = {
  environmental        : 6  * 60 * 60 * 1000, 
  earnings_optimization: 24 * 60 * 60 * 1000, 
  burnout              : 24 * 60 * 60 * 1000, 
  daily_target         : 5 * 60 * 1000, // Allow multiple celebrations per day (5 min cooldown)
};

const GLOBAL_SPACING_MS = 5 * 60 * 1000; // 5 minutes between any nudges
const DAILY_CAP = 24; // Max 24 nudges/day to accommodate hourly updates + instant sparks

// IST offset: UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getISTHour = () => {
  const istTime = new Date(Date.now() + IST_OFFSET_MS);
  return istTime.getUTCHours();
};

const getISTDayStart = () => {
  const istTime = new Date(Date.now() + IST_OFFSET_MS);
  istTime.setUTCHours(0, 0, 0, 0);
  return new Date(istTime.getTime() - IST_OFFSET_MS);
};

/**
 * Checks whether a nudge can be sent to a user right now.
 */
const canSendNudge = async (userId, nudgeType) => {
  // ── Rule 1: Quiet Hours (10 PM – 8 AM IST) ────────────────────────────
  const currentHourIST = getISTHour();
  const isQuietHours = currentHourIST >= 22 || currentHourIST < 8;
  
  // Environmental/Safety alerts bypass quiet hours
  if (isQuietHours && nudgeType !== "environmental") {
    return { allowed: false, reason: `Quiet hours (${currentHourIST}:00 IST). Normal nudges blocked 10 PM–8 AM.` };
  }

  // ── Rule 2: Per-Type Cooldown ──────────────────────────────────────────
  const cooldownMs     = TYPE_COOLDOWNS[nudgeType] || 24 * 60 * 60 * 1000;
  const cooldownCutoff = new Date(Date.now() - cooldownMs);

  // Check for any recent nudge of this type
  const recentSameType = await Nudge.findOne({
    userId,
    type     : nudgeType,
    createdAt: { $gte: cooldownCutoff },
  }).lean();

  // SPECIAL RULE: If it's a daily_target nudge and the user dismissed it today,
  // stop sending it entirely until tomorrow to avoid annoying the user.
  if (nudgeType === "daily_target") {
    const dayStart = getISTDayStart();
    const dismissedToday = await Nudge.findOne({
      userId,
      type: "daily_target",
      status: "dismissed",
      createdAt: { $gte: dayStart },
    }).lean();

    if (dismissedToday) {
      return { allowed: false, reason: `User dismissed daily_target nudge today. Blocking until tomorrow.` };
    }
  }

  if (recentSameType) {
    const sentMinsAgo   = Math.round((Date.now() - new Date(recentSameType.createdAt).getTime()) / 60000);
    const cooldownHours = Math.round(cooldownMs / 3600000);
    return {
      allowed: false,
      reason : `'${nudgeType}' already sent ${sentMinsAgo} min ago. Cooldown: ${cooldownHours}h.`,
    };
  }

  // ── Rule 3: Global Spacing ─────────────────────────────────────────────
  const spacingCutoff  = new Date(Date.now() - GLOBAL_SPACING_MS);
  const recentAnyNudge = await Nudge.findOne({
    userId,
    createdAt: { $gte: spacingCutoff },
  }).lean();

  if (recentAnyNudge) {
    const waitMs  = GLOBAL_SPACING_MS - (Date.now() - new Date(recentAnyNudge.createdAt).getTime());
    const waitMin = Math.ceil(waitMs / 60000);
    return { allowed: false, reason: `Global spacing: wait ${waitMin} more min between nudges.` };
  }

  // ── Rule 4: Daily Cap ──────────────────────────────────────────────────
  const dayStart    = getISTDayStart();
  const todayCount  = await Nudge.countDocuments({ userId, createdAt: { $gte: dayStart } });
  if (todayCount >= DAILY_CAP) {
    return { allowed: false, reason: `Daily cap reached: ${todayCount}/${DAILY_CAP} nudges today.` };
  }

  return { allowed: true, reason: "All checks passed." };
};

module.exports = { canSendNudge, TYPE_COOLDOWNS, GLOBAL_SPACING_MS, DAILY_CAP };
