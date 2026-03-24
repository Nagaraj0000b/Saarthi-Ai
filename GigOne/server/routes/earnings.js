/**
 * @fileoverview Earnings Tracking Routes.
 * Facilitates the management of platform-specific income entries.
 *
 * @module server/routes/earnings
 * @requires express
 * @requires ../middleware/auth
 * @requires ../controllers/earningsController
 */

const router = require("express").Router();
const auth = require("../middleware/auth");
const { getEarnings, addEarning, updateEarning, deleteEarning, getWeeklySummary } = require("../controllers/earningsController");

/**
 * @route GET /api/earnings
 * @desc Retrieve all earnings entries for the authenticated user
 * @access Private
 */
router.get("/", auth, getEarnings);

/**
 * @route GET /api/earnings/weekly
 * @desc Get the current week's earnings summary for the dashboard overview
 * @access Private
 */
router.get("/weekly", auth, getWeeklySummary);

/**
 * @route POST /api/earnings
 * @desc Record a new earnings entry
 * @access Private
 */
router.post("/", auth, addEarning);

/**
 * @route PUT /api/earnings/:id
 * @desc Update an earnings entry
 * @access Private
 */
router.put("/:id", auth, updateEarning);

/**
 * @route DELETE /api/earnings/:id
 * @desc Delete an earnings entry
 * @access Private
 */
router.delete("/:id", auth, deleteEarning);

module.exports = router;
