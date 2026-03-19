/**
 * @fileoverview Earnings Controller managing the retrieval and persistence of income data.
 * Facilitates financial tracking for workers across multiple gig platforms.
 * 
 * @module server/controllers/earningsController
 * @requires ../models/EarningsEntry
 */

const EarningsEntry = require("../models/EarningsEntry");

/**
 * Retrieves the historical earnings entries for the authenticated user.
 * Results are sorted in reverse chronological order.
 * 
 * @async
 * @function getEarnings
 * @param {Object} req - Express request object (authenticated).
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const getEarnings = async (req, res) => {
  try {
    const entries = await EarningsEntry.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Records a new earnings entry for the worker.
 * Implicitly associates the entry with the authenticated user's ID.
 * 
 * @async
 * @function addEarning
 * @param {Object} req - Express request object.
 * @param {string} req.body.platform - The gig platform (e.g., 'Uber', 'Swiggy').
 * @param {number} req.body.amount - Total income earned.
 * @param {number} req.body.hours - Hours worked during this period.
 * @param {Date} [req.body.date] - Transaction date.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const addEarning = async (req, res) => {
  const { platform, amount, hours, date } = req.body;
  try {
    const entry = await EarningsEntry.create({
      userId: req.user.userId,
      platform,
      amount,
      hours,
      date: date || Date.now(),
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEarnings, addEarning };
