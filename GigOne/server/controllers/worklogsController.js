/**
 * @fileoverview WorkLogs controller managing the operational history of worker shifts.
 */

const WorkLog = require("../models/WorkLog");
const asyncHandler = require("../utils/asyncHandler");
const { ensureNumber, normalizePlatform, parseOptionalDate, parseOptionalString } = require("../utils/validation");

const getWorkLogs = asyncHandler(async (req, res) => {
  const logs = await WorkLog.find({ userId: req.user.userId }).sort({ date: -1 });
  res.json(logs);
});

const addWorkLog = asyncHandler(async (req, res) => {
  const platform = normalizePlatform(req.body.platform);
  const hours = ensureNumber(req.body.hours, "hours", { min: 0 });
  const date = parseOptionalDate(req.body.date) || new Date();
  const notes = parseOptionalString(req.body.notes, "notes") || "";

  const log = await WorkLog.create({
    userId: req.user.userId,
    platform,
    hours,
    date,
    notes,
  });

  res.status(201).json(log);
});

module.exports = { getWorkLogs, addWorkLog };
