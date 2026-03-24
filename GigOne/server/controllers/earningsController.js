/**
 * @fileoverview Earnings controller managing the retrieval and persistence of income data.
 */

const EarningsEntry = require("../models/EarningsEntry");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const {
  ensureNumber,
  normalizePlatform,
  parseOptionalDate,
  parseOptionalNumber,
} = require("../utils/validation");

const buildEarningPayload = (body, options = {}) => {
  const { partial = false } = options;
  const payload = {};

  if (!partial || body.platform !== undefined) {
    payload.platform = normalizePlatform(body.platform, { required: !partial });
  }

  const amount = partial
    ? parseOptionalNumber(body.amount, "amount", { min: 0 })
    : ensureNumber(body.amount, "amount", { min: 0 });
  if (amount !== undefined) {
    payload.amount = amount;
  }

  const hours = partial
    ? parseOptionalNumber(body.hours, "hours", { min: 0 })
    : ensureNumber(body.hours, "hours", { min: 0 });
  if (hours !== undefined) {
    payload.hours = hours;
  }

  if (!partial || body.date !== undefined) {
    const parsedDate = parseOptionalDate(body.date);
    payload.date = parsedDate || new Date();
  }

  if (partial && Object.keys(payload).length === 0) {
    throw new AppError("No valid earnings fields were provided", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return payload;
};

const getEarnings = asyncHandler(async (req, res) => {
  const entries = await EarningsEntry.find({ userId: req.user.userId }).sort({ date: -1 });
  res.json(entries);
});

const addEarning = asyncHandler(async (req, res) => {
  const payload = buildEarningPayload(req.body);
  const entry = await EarningsEntry.create({
    userId: req.user.userId,
    ...payload,
  });

  res.status(201).json(entry);
});

const updateEarning = asyncHandler(async (req, res) => {
  const payload = buildEarningPayload(req.body, { partial: true });
  const entry = await EarningsEntry.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    payload,
    { new: true, runValidators: true }
  );

  if (!entry) {
    throw new AppError("Entry not found", 404, { code: "ENTRY_NOT_FOUND" });
  }

  res.json(entry);
});

const deleteEarning = asyncHandler(async (req, res) => {
  const entry = await EarningsEntry.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!entry) {
    throw new AppError("Entry not found", 404, { code: "ENTRY_NOT_FOUND" });
  }

  res.json({ message: "Deleted successfully" });
});

const getWeeklySummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const entries = await EarningsEntry.find({
    userId: req.user.userId,
    date: { $gte: monday, $lte: sunday },
  }).sort({ date: -1 });

  const totalEarned = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const totalHours = entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
  const avgPerHour = totalHours > 0 ? Math.round(totalEarned / totalHours) : 0;

  const dailyEarnings = [0, 0, 0, 0, 0, 0, 0];
  entries.forEach((entry) => {
    const day = new Date(entry.date).getUTCDay();
    const slot = day === 0 ? 6 : day - 1;
    dailyEarnings[slot] += Number(entry.amount) || 0;
  });

  const recentShifts = entries.slice(0, 5).map((entry) => ({
    _id: entry._id,
    platform: entry.platform,
    amount: entry.amount,
    hours: entry.hours,
    date: entry.date,
  }));

  res.json({ totalEarned, totalHours, avgPerHour, dailyEarnings, recentShifts });
});

module.exports = { getEarnings, addEarning, updateEarning, deleteEarning, getWeeklySummary };
