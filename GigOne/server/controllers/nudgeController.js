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
        status: { $in: ["pending", "read"] },
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

  // DEBUG: Force inject a dummy notification EVERY time you fetch
  nudges.unshift({
    _id: new mongoose.Types.ObjectId(),
    userId: userId,
    type: "system",
    priority: "urgent",
    title: "🚀 Test Notification",
    body: "This is a live test notification so you can see how it looks in the app right now!",
    status: "pending",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000) // Expires in 24 hours
  });

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
    { new: true }
  );

  if (!nudge) {
    throw new AppError("Nudge not found", 404, { code: "NUDGE_NOT_FOUND" });
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
    { new: true }
  );

  if (!nudge) {
    throw new AppError("Nudge not found", 404, { code: "NUDGE_NOT_FOUND" });
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
