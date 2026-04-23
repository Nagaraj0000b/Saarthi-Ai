/**
 * @fileoverview Nudge controller — handles nudge CRUD and daily target sync.
 *
 * @module server/controllers/nudgeController
 */

const mongoose = require("mongoose");
const Nudge = require("../models/Nudge");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

/**
 * GET /api/nudges
 * Returns pending + unread nudges for the authenticated user.
 * Auto-marks expired nudges. Sorted by priority (urgent first), then newest.
 */
const getActiveNudges = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const now = new Date();

  // Auto-expire old nudges
  await Nudge.updateMany(
    {
      userId,
      status: "pending",
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" } }
  );

  // Native MongoDB aggregation for efficient sorting & limiting
  const nudges = await Nudge.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "pending", // Only fetch pending nudges! Read/Dismissed should never be sent back.
        expiresAt: { $gt: now },
      },
    },
    {
      $addFields: {
        priorityWeight: {
          $switch: {
            branches: [
              { case: { $eq: ["$priority", "urgent"] }, then: 3 },
              { case: { $eq: ["$priority", "high"] }, then: 2 },
              { case: { $eq: ["$priority", "normal"] }, then: 1 },
            ],
            default: 0,
          },
        },
      },
    },
    { $sort: { priorityWeight: -1, createdAt: -1 } },
    { $limit: 20 },
    { $project: { priorityWeight: 0 } },
  ]);

  res.json(nudges);
});

/**
 * PATCH /api/nudges/:id/read
 * Marks a nudge as read.
 */
const markRead = asyncHandler(async (req, res) => {
  const nudge = await Nudge.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { $set: { status: "read", readAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!nudge) {
    // If it's already missing from the server (e.g., deleted), just return success 
    // so the mobile app can clear its local cache without getting stuck.
    return res.json({ message: "Nudge already missing or read", fallback: true });
  }

  res.json(nudge);
});

/**
 * PATCH /api/nudges/:id/dismiss
 * Dismisses a nudge (hides it permanently).
 */
const dismiss = asyncHandler(async (req, res) => {
  const nudge = await Nudge.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { $set: { status: "dismissed" } },
    { returnDocument: "after" }
  );

  if (!nudge) {
    // Return 200 OK even if missing so Android app clears its frozen cache
    return res.json({ message: "Nudge already dismissed or missing", fallback: true });
  }

  res.json({ message: "Nudge dismissed" });
});

/**
 * POST /api/nudges/sync-target
 * Syncs the daily earning target from the Android client to the server.
 * Body: { dailyTarget: number }
 */
const syncDailyTarget = asyncHandler(async (req, res) => {
  const { dailyTarget } = req.body;
  const parsed = Number(dailyTarget);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError("dailyTarget must be a positive number", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  await User.findByIdAndUpdate(req.user.userId, {
    $set: { dailyTarget: parsed },
  });

  console.log(`[Nudge] Daily target synced for user ${req.user.userId}: ₹${parsed}`);
  res.json({ success: true, dailyTarget: parsed });
});

module.exports = {
  getActiveNudges,
  markRead,
  dismiss,
  syncDailyTarget,
};
