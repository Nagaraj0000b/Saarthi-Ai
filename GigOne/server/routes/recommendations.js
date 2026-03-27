const express = require("express");
const { getNextShiftRecommendations } = require("../controllers/recommendationController");
const protect = require("../middleware/auth");

const router = express.Router();

// Apply protection to all recommendation routes
router.use(protect);

/**
 * @route GET /api/recommendations/next-shift
 * @desc Get a ranked list of platform recommendations for the next shift
 * @access Private
 */
router.get("/next-shift", getNextShiftRecommendations);

module.exports = router;
