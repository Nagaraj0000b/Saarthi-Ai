/**
 * @fileoverview Chat controller coordinates the AI-driven check-in experience.
 */

const fs = require("fs/promises");
const { transcribeAudio } = require("../services/speechService");
const { getWeatherContext } = require("../services/weatherService");
const { getTraffic } = require("../services/trafficService");
const {
  generateGreeting,
  processChatTurn,
  getNextStep,
  STEP_CONFIG,
} = require("../services/conversationService");
const { analyzeMoodText } = require("../services/sentimentService");
const { evaluateWellbeingRisk } = require("../services/wellbeingRiskService");
const Conversation = require("../models/Conversation");
const EarningsEntry = require("../models/EarningsEntry");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const {
  ensureNonEmptyString,
  normalizePlatform,
  parseCoordinates,
} = require("../utils/validation");

const TEXT_TO_NUM = {
  half: 0.5,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const STEP_FIELD_MAPPING = {
  platform: "platform",
  earnings: "earnings",
  hours: "hours",
};

const MISSING_VALUE_REPLIES = {
  platform:
    "Main theek se samajh nahi paaya ki aapne aaj kis platform par kaam kiya. Kya aap dobara bata sakte hain? (Uber, Swiggy, Rapido ya Other?)",
  earnings: "Sorry, aapki aaj ki total earnings miss ho gayi. Kya aap amount dobara bata sakte ho?",
  hours: "Sorry, total working hours miss ho gaye. Kya aap hours dobara bata sakte ho?",
};

const cleanupUploadedFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Temporary audio cleanup failed:", error.message);
    }
  }
};

const parseExtractedNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  const digitMatch = normalized.match(/[\d.]+/);
  if (digitMatch) {
    const parsed = Number(digitMatch[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  for (const [word, numericValue] of Object.entries(TEXT_TO_NUM)) {
    if (normalized.includes(word)) {
      return numericValue;
    }
  }

  return null;
};

const normalizeExtractedValue = (currentStep, extractedValue) => {
  if (extractedValue === null || extractedValue === undefined || extractedValue === "") {
    return null;
  }

  if (currentStep === "platform") {
    try {
      return normalizePlatform(String(extractedValue));
    } catch (error) {
      return null;
    }
  }

  if (currentStep === "earnings" || currentStep === "hours") {
    return parseExtractedNumber(extractedValue);
  }

  return extractedValue;
};

const applyExtractedValue = (conversation, currentStep, extractedValue) => {
  const field = STEP_FIELD_MAPPING[currentStep];
  if (!field || extractedValue === null) {
    return;
  }

  conversation.extractedData = conversation.extractedData || {};
  conversation.extractedData[field] = extractedValue;
};

const calculateAndSaveBurnout = async (conversation) => {
  try {
    const riskData = await evaluateWellbeingRisk(conversation.userId, conversation.dailyMood);
    
    // Save to the new Schema Block
    conversation.wellbeingRisk = riskData;

    // Optional: Backwards compatibility bridging for older UI clients
    conversation.burnoutStatus = {
        isBurnoutAlert: riskData.riskLevel === "high",
        isStressWarning: riskData.riskLevel === "moderate",
        averageScore: riskData.riskScore,
        action: riskData.recommendedAction
    };
  } catch (error) {
    console.warn("Wellbeing risk evaluation failed:", error.message);
  }
};

const persistAutoSavedEarnings = async (userId, extractedData) => {
  if (!extractedData?.platform || extractedData.earnings === undefined || extractedData.earnings === null) {
    return;
  }

  try {
    await EarningsEntry.create({
      userId,
      platform: normalizePlatform(extractedData.platform),
      amount: Number(extractedData.earnings) || 0,
      hours: Number(extractedData.hours) || 0,
    });
  } catch (error) {
    console.warn("Auto-save earning failed:", error.message);
  }
};

const findConversationForUser = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });

  if (!conversation) {
    throw new AppError("Conversation not found", 404, {
      code: "CONVERSATION_NOT_FOUND",
    });
  }

  return conversation;
};

const runChatTurn = async ({ conversation, userText, language, context, userId }) => {
  const currentStep = conversation.step;
  const turnResult = await processChatTurn(
    currentStep,
    userText,
    conversation.messages,
    context,
    language || null
  );

  let aiReply = turnResult.reply;
  const normalizedValue = normalizeExtractedValue(currentStep, turnResult.extractedValue);

  if (currentStep === "mood") {
    conversation.dailyMood = await analyzeMoodText(userText, {
      language,
      sourceStep: "mood",
    });
  }

  conversation.messages.push({ role: "user", text: userText });

  if (normalizedValue === null && STEP_CONFIG[currentStep]?.extract) {
    aiReply = MISSING_VALUE_REPLIES[currentStep] || aiReply;
  }

  applyExtractedValue(conversation, currentStep, normalizedValue);
  conversation.messages.push({ role: "assistant", text: aiReply });

  const nextStep = getNextStep(currentStep, normalizedValue);
  conversation.step = nextStep;

  if (currentStep !== "done" && nextStep === "done") {
    await calculateAndSaveBurnout(conversation);
    await persistAutoSavedEarnings(userId, conversation.extractedData);
  }

  await conversation.save();

  return { aiReply, nextStep };
};

const getContext = asyncHandler(async (req, res) => {
  const coordinates = parseCoordinates(req.query.lat, req.query.lon, { required: true });
  const [weather, traffic] = await Promise.all([
    getWeatherContext(coordinates.lat, coordinates.lon),
    getTraffic(coordinates.lat, coordinates.lon),
  ]);

  res.json({ weather, traffic });
});

const startChat = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId).select("name");
  const lastDone = await Conversation.findOne({ userId, step: "done" }).sort({ createdAt: -1 });
  const context = lastDone?.burnoutStatus ? { burnoutStatus: lastDone.burnoutStatus } : null;
  const language = typeof req.body.language === "string" ? req.body.language.trim() : null;
  const greeting = await generateGreeting(user?.name || "buddy", context, language || null);

  const conversation = await Conversation.create({
    userId,
    step: "mood",
    messages: [{ role: "assistant", text: greeting }],
  });

  res.json({
    conversationId: conversation._id,
    step: "mood",
    reply: greeting,
  });
});

const reply = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    throw new AppError("Audio file is required", 400, { code: "AUDIO_REQUIRED" });
  }

  const filePath = req.file.path;

  try {
    const conversationId = ensureNonEmptyString(req.body.conversationId, "conversationId");
    const coordinates = parseCoordinates(req.body.lat, req.body.lon);
    const language = typeof req.body.language === "string" ? req.body.language.trim() : null;
    const conversation = await findConversationForUser(conversationId, req.user.userId);

    const weatherPromise = coordinates
      ? getWeatherContext(coordinates.lat, coordinates.lon).catch((error) => {
          console.warn("Weather context fetch failed during chat:", error.message);
          return null;
        })
      : Promise.resolve(null);

    const [transcription, weather] = await Promise.all([
      transcribeAudio(filePath),
      weatherPromise,
    ]);

    if (typeof transcription !== "string" || transcription.trim().length === 0) {
      throw new AppError("Audio transcription was empty", 502, {
        code: "TRANSCRIPTION_EMPTY",
      });
    }

    const { aiReply, nextStep } = await runChatTurn({
      conversation,
      userText: transcription.trim(),
      language,
      context: weather ? { weather } : null,
      userId: req.user.userId,
    });

    res.json({
      conversationId: conversation._id,
      transcription: transcription.trim(),
      reply: aiReply,
      step: nextStep,
      extractedData: conversation.extractedData,
      burnoutStatus: conversation.burnoutStatus,
      wellbeingRisk: conversation.wellbeingRisk,
      isComplete: nextStep === "done",
    });
  } finally {
    await cleanupUploadedFile(filePath);
  }
});

const replyText = asyncHandler(async (req, res) => {
  const conversationId = ensureNonEmptyString(req.body.conversationId, "conversationId");
  const text = ensureNonEmptyString(req.body.text, "text");
  const language = typeof req.body.language === "string" ? req.body.language.trim() : null;
  const conversation = await findConversationForUser(conversationId, req.user.userId);

  const { aiReply, nextStep } = await runChatTurn({
    conversation,
    userText: text,
    language,
    context: null,
    userId: req.user.userId,
  });

  res.json({
    conversationId: conversation._id,
    transcription: text,
    reply: aiReply,
    step: nextStep,
    extractedData: conversation.extractedData,
    burnoutStatus: conversation.burnoutStatus,
    wellbeingRisk: conversation.wellbeingRisk,
    isComplete: nextStep === "done",
  });
});

const getBurnoutStatus = asyncHandler(async (req, res) => {
  const lastDone = await Conversation.findOne({
    userId: req.user.userId,
    step: "done",
  }).sort({ createdAt: -1 });

  const status = lastDone?.burnoutStatus || {
    isBurnoutAlert: false,
    isStressWarning: false,
    averageScore: 0,
    action: "Normal - Ready",
  };

  if (lastDone && lastDone.wellbeingRisk) {
    status.wellbeingRisk = lastDone.wellbeingRisk;
  }

  res.json(status);
});

const getChatHistory = asyncHandler(async (req, res) => {
  const history = await Conversation.find({
    userId: req.user.userId,
    step: "done",
  }).sort({ createdAt: -1 });

  res.json(history);
});

const deleteConversation = asyncHandler(async (req, res) => {
  const deleted = await Conversation.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!deleted) {
    throw new AppError("Conversation not found", 404, {
      code: "CONVERSATION_NOT_FOUND",
    });
  }

  res.json({ message: "Conversation deleted successfully" });
});

module.exports = {
  getContext,
  startChat,
  reply,
  replyText,
  getBurnoutStatus,
  getChatHistory,
  deleteConversation,
};
