/**
 * @fileoverview Nudge API routes.
 *
 * @module server/routes/nudges
 */

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getActiveNudges,
  markRead,
  dismiss,
  syncDailyTarget,
} = require("../controllers/nudgeController");

// GET  /api/nudges           → Fetch pending nudges for polling
router.get("/", auth, getActiveNudges);

// PATCH /api/nudges/:id/read  → Mark a nudge as read
router.patch("/:id/read", auth, markRead);

// PATCH /api/nudges/:id/dismiss → Dismiss a nudge
router.patch("/:id/dismiss", auth, dismiss);

// POST /api/nudges/sync-target → Sync daily target from Android
router.post("/sync-target", auth, syncDailyTarget);

module.exports = router;
