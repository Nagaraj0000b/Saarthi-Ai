const express = require("express");
const { getNextShiftRecommendations } = require("../controllers/jobController");
const protect = require("../middleware/auth");

const router = express.Router();

// Apply protection to all job recommendation routes
router.use(protect);

/**
 * @route GET /api/jobs/next-shift
 * @desc Get a ranked list of job recommendations for the next shift
 * @access Private
 */
router.get("/next-shift", getNextShiftRecommendations);

module.exports = router;
