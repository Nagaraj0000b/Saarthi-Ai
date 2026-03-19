/**
 * @fileoverview Earnings Tracking Routes.
 * Facilitates the management of platform-specific income entries.
 * 
 * @module server/routes/earnings
 * @requires express
 * @requires ../middleware/auth
 * @requires ../controllers/earningsController
 */

const router  = require("express").Router();
const auth    = require("../middleware/auth");
const { getEarnings, addEarning } = require("../controllers/earningsController");

/**
 * @route GET /api/earnings
 * @desc Retrieve all earnings entries for the authenticated user
 * @access Private
 */
router.get("/", auth, getEarnings);

/**
 * @route POST /api/earnings
 * @desc Record a new earnings entry
 * @access Private
 */
router.post("/", auth, addEarning);

module.exports = router;
