/**
 * @fileoverview Work Log Management Routes.
 * Provides endpoints for logging shifts and shift-related data.
 * 
 * @module server/routes/worklogs
 * @requires express
 * @requires ../middleware/auth
 * @requires ../controllers/worklogsController
 */

const router  = require("express").Router();
const auth    = require("../middleware/auth");
const { getWorkLogs, addWorkLog } = require("../controllers/worklogsController");

/**
 * @route GET /api/worklogs
 * @desc Retrieve all work logs for the authenticated user
 * @access Private
 */
router.get("/", auth, getWorkLogs);

/**
 * @route POST /api/worklogs
 * @desc Create a new work log entry
 * @access Private
 */
router.post("/", auth, addWorkLog);

module.exports = router;
