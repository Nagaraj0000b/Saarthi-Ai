/**
 * @fileoverview Workload aggregation service for the wellbeing risk module.
 */

const Conversation = require("../models/Conversation");
const EarningsEntry = require("../models/EarningsEntry");
const AppError = require("../utils/appError");

const validateUserId = (userId) => {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new AppError("userId is required", 400, { code: "VALIDATION_ERROR" });
  }

  return userId.trim();
};

const validateLookbackDays = (lookbackDays) => {
  const parsed = Number(lookbackDays);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError("lookbackDays must be a positive integer", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return parsed;
};

const getDayKey = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
};

const aggregateWorkload = async (userId, lookbackDays = 7) => {
  const normalizedUserId = validateUserId(userId);
  const days = validateLookbackDays(lookbackDays);
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - days);

  const [conversations, earnings] = await Promise.all([
    Conversation.find({
      userId: normalizedUserId,
      step: "done",
      createdAt: { $gte: cutoffDate },
    }),
    EarningsEntry.find({
      userId: normalizedUserId,
      date: { $gte: cutoffDate },
    }),
  ]);

  const dailyHours = new Map();

  conversations.forEach((conversation) => {
    const dayKey = getDayKey(conversation.createdAt);
    const hours = Number(conversation.extractedData?.hours) || 0;
    const existing = dailyHours.get(dayKey) || 0;
    dailyHours.set(dayKey, existing + hours);
  });

  earnings.forEach((entry) => {
    const dayKey = getDayKey(entry.date || entry.createdAt);
    const hours = Number(entry.hours) || 0;

    if (!dailyHours.has(dayKey)) {
      dailyHours.set(dayKey, hours);
      return;
    }

    const existing = dailyHours.get(dayKey);
    if (hours > existing) {
      dailyHours.set(dayKey, hours);
    }
  });

  let hoursToday = 0;
  let hoursLast3Days = 0;
  let heavyShiftCountLast7Days = 0;
  let consecutiveWorkDays = 0;
  let restDaysLast7 = 0;

  for (let index = 0; index < days; index += 1) {
    const checkDate = new Date();
    checkDate.setDate(now.getDate() - index);
    const hours = dailyHours.get(getDayKey(checkDate)) || 0;

    if (index === 0) {
      hoursToday = hours;
    }

    if (index < 3) {
      hoursLast3Days += hours;
    }

    if (hours > 8) {
      heavyShiftCountLast7Days += 1;
    }

    if (hours === 0) {
      restDaysLast7 += 1;
    }
  }

  for (let index = 0; index < days; index += 1) {
    const checkDate = new Date();
    checkDate.setDate(now.getDate() - index);
    const checkHours = dailyHours.get(getDayKey(checkDate)) || 0;

    if (checkHours > 0) {
      consecutiveWorkDays += 1;
    } else if (index > 0) {
      break;
    }
  }

  return {
    hoursToday,
    hoursLast3Days,
    heavyShiftCountLast7Days,
    consecutiveWorkDays,
    restDaysLast7,
    daysAnalyzed: days,
    isReliable: true,
  };
};

const getRecentValidMoodFeatures = async (userId, lookbackDays = 5) => {
  const normalizedUserId = validateUserId(userId);
  const days = validateLookbackDays(lookbackDays);
  const cutoffDate = new Date();
  cutoffDate.setDate(new Date().getDate() - days);

  const pastConversations = await Conversation.find({
    userId: normalizedUserId,
    step: "done",
    createdAt: { $gte: cutoffDate },
    "dailyMood.isValid": true,
  }).sort({ createdAt: 1 });

  let negativeMoodStreak = 0;
  const validSignals = pastConversations.length;
  let scoreSum = 0;

  for (let index = pastConversations.length - 1; index >= 0; index -= 1) {
    const score = pastConversations[index].dailyMood.moodScore;
    scoreSum += score;

    if (score < 0) {
      negativeMoodStreak += 1;
    } else {
      break;
    }
  }

  const averageMood = validSignals > 0 ? scoreSum / validSignals : 0;

  let moodTrend = "stable";
  if (validSignals >= 3) {
    const half = Math.floor(validSignals / 2);
    const firstHalf =
      pastConversations
        .slice(0, half)
        .reduce((sum, conversation) => sum + conversation.dailyMood.moodScore, 0) / half;
    const secondHalf =
      pastConversations
        .slice(half)
        .reduce((sum, conversation) => sum + conversation.dailyMood.moodScore, 0) /
      (validSignals - half);

    if (secondHalf < firstHalf - 0.2) {
      moodTrend = "downward";
    } else if (secondHalf > firstHalf + 0.2) {
      moodTrend = "upward";
    }
  }

  return {
    averageMood,
    negativeMoodStreak,
    moodTrend,
    validSignals,
  };
};

module.exports = { aggregateWorkload, getRecentValidMoodFeatures };
