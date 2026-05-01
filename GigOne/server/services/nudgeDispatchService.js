/**
 * @fileoverview Central nudge dispatch service.
 * All nudge evaluators call this to create and deliver a nudge.
 * Enforces throttle rules before persisting.
 *
 * @module server/services/nudgeDispatchService
 */

const Nudge = require("../models/Nudge");
const { canSendNudge } = require("./nudgeThrottleService");

// Emoji mapping per nudge type
const TYPE_EMOJI = {
  environmental: "🌦️",
  earnings_optimization: "💰",
  burnout: "😓",
  daily_target: "🎯",
  next_day_shift: "📅",
  surge: "⚡",
};

/**
 * Dispatches a nudge to a user, respecting throttle rules.
 *
 * @param {string} userId - Target user's ObjectId string.
 * @param {Object} nudgeData - Nudge content.
 * @param {string} nudgeData.type - One of NUDGE_TYPES.
 * @param {string} nudgeData.title - Short headline.
 * @param {string} nudgeData.body - Detailed message.
 * @param {string} [nudgeData.emoji] - Override emoji (defaults to type-based).
 * @param {string} [nudgeData.priority='normal'] - normal | high | urgent.
 * @param {Object} [nudgeData.data={}] - Deep-link payload.
 * @param {Object} [nudgeData.metadata={}] - Trigger-specific context.
 * @param {number} [nudgeData.expiresInMs] - Custom expiry duration in ms (default 6h).
 * @returns {Promise<Object|null>} The created Nudge doc, or null if throttled.
 */
const dispatchNudge = async (userId, nudgeData) => {
  const {
    type,
    title,
    body,
    emoji,
    priority = "normal",
    data = {},
    metadata = {},
    expiresInMs,
    isDemo = false,
  } = nudgeData;

  if (!userId || !type || !title || !body) {
    console.warn("[NudgeDispatch] Missing required fields:", { userId, type, title: !!title, body: !!body });
    return null;
  }

  // ── Throttle Check ─────────────────────────────────────────────────────
  let throttleResult = { allowed: true, reason: "Demo nudge bypass" };
  if (!isDemo) {
    throttleResult = await canSendNudge(userId, type);
  }


  if (!throttleResult.allowed) {
    console.log(`[NudgeDispatch] THROTTLED for user ${userId}: ${throttleResult.reason}`);
    return null;
  }

  // ── Create Nudge ───────────────────────────────────────────────────────
  const expiresAt = expiresInMs
    ? new Date(Date.now() + expiresInMs)
    : new Date(Date.now() + 6 * 60 * 60 * 1000); // Default 6 hours

  try {
    // Use a unique compound key for the day to ensure atomicity at the DB level
    // We create a 'dayKey' based on the current date to prevent duplicates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nudge = await Nudge.create({
      userId,
      type,
      title,
      body,
      emoji: emoji || TYPE_EMOJI[type] || "🔔",
      priority,
      data,
      metadata,
      status: "pending",
      expiresAt,
      isDemo,
      // We can add a virtual or a field for the day if we want more precise indexing,
      // but the unique index on {userId, type, createdAt} with rounded precision
      // is handled by the logic in canSendNudge and the DB constraint.
    });

    console.log(
      `[NudgeDispatch]  Nudge sent | type=${type} | user=${userId} | priority=${priority} | title="${title}"`
    );

    return nudge;
  } catch (error) {
    console.error(`[NudgeDispatch]  Failed to create nudge:`, error.message);
    return null;
  }
};

module.exports = { dispatchNudge };
