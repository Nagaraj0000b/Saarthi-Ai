const { recommendPlatforms } = require("../services/platformRecommendationService");
const asyncHandler = require("../utils/asyncHandler");
const { parseCoordinates } = require("../utils/validation");

/**
 * Controller to handle recommendation requests.
 */
const getNextShiftRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { lat, lon } = parseCoordinates(req.query.lat, req.query.lon, { required: true });

  const recommendations = await recommendPlatforms(userId, lat, lon);

  res.status(200).json({
    status: "success",
    data: recommendations
  });
});

module.exports = { getNextShiftRecommendations };
