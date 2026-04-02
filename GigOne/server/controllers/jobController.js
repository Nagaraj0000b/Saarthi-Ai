const { recommendJobs } = require("../services/jobRecommendationService");
const asyncHandler = require("../utils/asyncHandler");
const { parseCoordinates, parseOptionalString } = require("../utils/validation");

/**
 * Controller to handle ML-powered recommendation requests.
 * Accepts optional `skills` query param (comma-separated) for accurate compatibility matching.
 * 
 * GET /api/jobs/recommend?lat=12.97&lon=77.59&skills=Bike %26 Scooter Driving,Car %26 Cab Driving
 */
const getNextShiftRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { lat, lon } = parseCoordinates(req.query.lat, req.query.lon, { required: true });
  const skills = req.query.skills ? req.query.skills.split(",") : [];
  const preferredJobs = req.query.jobs ? req.query.jobs.split(",") : [];

  const recommendations = await recommendJobs(userId, lat, lon, skills, preferredJobs);

  res.status(200).json({
    status: "success",
    data: recommendations
  });
});

module.exports = { getNextShiftRecommendations };
