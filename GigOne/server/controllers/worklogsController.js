/**
 * @fileoverview WorkLogs Controller managing the operational history of worker shifts.
 * Tracks time utilization and shift notes for platform-specific activities.
 * 
 * @module server/controllers/worklogsController
 * @requires ../models/WorkLog
 */

const WorkLog = require("../models/WorkLog");

/**
 * Fetches all work logs associated with the authenticated user.
 * Optimized for dashboard displays with reverse chronological sorting.
 * 
 * @async
 * @function getWorkLogs
 * @param {Object} req - Express request object (authenticated).
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const getWorkLogs = async (req, res) => {
  try {
    const logs = await WorkLog.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submits a new work log entry.
 * Captures duration, platform, and optional qualitative shift notes.
 * 
 * @async
 * @function addWorkLog
 * @param {Object} req - Express request object.
 * @param {string} req.body.platform - Target gig platform.
 * @param {number} req.body.hours - Duration of the shift.
 * @param {Date} [req.body.date] - Date of the work session.
 * @param {string} [req.body.notes] - Shift observations or remarks.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const addWorkLog = async (req, res) => {
  const { platform, hours, date, notes } = req.body;
  try {
    const log = await WorkLog.create({
      userId: req.user.userId,
      platform,
      hours,
      date: date || Date.now(),
      notes,
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getWorkLogs, addWorkLog };
