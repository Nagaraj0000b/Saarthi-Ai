/**
 * @fileoverview Chat controller coordinates the AI-driven check-in experience.
 */

const fs = require("fs/promises");
const { transcribeAudio } = require("../services/speechService");
const { getWeatherContext } = require("../services/weatherService");
const { getTraffic } = require("../services/trafficService");
const {
  generateGreeting,
  evaluateChatState,
  generateConstrainedReply,
  generateRetryMessage,
} = require("../services/conversationService");
const { analyzeMoodText } = require("../services/sentimentService");
const { extractGigData } = require("../services/geminiService");
const { evaluateWellbeingRisk } = require("../services/wellbeingRiskService");
const Conversation = require("../models/Conversation");
const EarningsEntry = require("../models/EarningsEntry");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const {
  ensureNonEmptyString,
  normalizeJob,
  parseCoordinates,
} = require("../utils/validation");

/**
 * Calculates the Unix timestamp (seconds) for the "Next Shift" target.
 * Logic:
 * - After 16:00 (4 PM) -> Tomorrow 09:00 AM
 * - Before 12:00 (Noon) -> Today 18:00 (6 PM)
 * - Mid-day: +12 hours
 */
const calculateNextShiftTarget = () => {
  const now = new Date();
  const target = new Date(now);
  const hour = now.getHours();

  if (hour < 11) {
    target.setHours(13, 0, 0, 0);
  } else if (hour < 16) {
    target.setHours(19, 0, 0, 0);
  } else {
    target.setDate(now.getDate() + 1);
    target.setHours(8, 0, 0, 0);
  }

  return Math.floor(target.getTime() / 1000);
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

const calculateAndSaveBurnout = async (conversation) => {
  try {
    const riskData = await evaluateWellbeingRisk(conversation.userId, conversation.dailyMood);
    
    conversation.wellbeingRisk = riskData;

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
  const job = extractedData?.platform || extractedData?.job;
  if (!job || extractedData.earnings === undefined || extractedData.earnings === null) {
    return;
  }

  try {
    await EarningsEntry.create({
      userId,
      job: normalizeJob(job),
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

const runChatTurn = async ({ conversation, originalText, translatedText, language, context, userId }) => {
  const currentStep = conversation.step;

  // 1. NLU Extraction (Pass platforms for intelligent STT spelling correction)
  const newlyExtractedData = await extractGigData(translatedText || originalText, context?.platforms || []);

  // Still use existing dedicated sentiment analysis model for mood step
  if (currentStep === "mood" || currentStep === "greeting") {
    conversation.dailyMood = await analyzeMoodText(translatedText || originalText, {
      language: "English", 
      sourceStep: "mood",
    });
  }

  // 2. Evaluate State
  const existingData = conversation.extractedData || {};
  
  // Merge newly extracted data with existing data, keeping existing values if new ones are null
  const mergedData = { ...existingData };
  Object.keys(newlyExtractedData).forEach(key => {
    if (newlyExtractedData[key] !== null && newlyExtractedData[key] !== undefined) {
      mergedData[key] = newlyExtractedData[key];
    }
  });

  let nextState = evaluateChatState(currentStep, newlyExtractedData, existingData);

  // Update conversation state early so we have accurate data for the templates
  conversation.extractedData = mergedData;

  // 3. Generate Reply with rich context
  const replyContext = {
    ...context,
    dailyMood: conversation.dailyMood,
    extractedData: mergedData
  };
  const aiReply = await generateConstrainedReply(nextState, replyContext, language);

  // 4. Finalize state
  conversation.messages.push({ role: "user", text: originalText });
  conversation.messages.push({ role: "assistant", text: aiReply });

  // Map 'complete' from the state machine to 'done' for the DB schema
  const dbStep = nextState === "complete" ? "done" : nextState;
  conversation.step = dbStep;

  if (currentStep !== "done" && dbStep === "done") {
    await calculateAndSaveBurnout(conversation);
    await persistAutoSavedEarnings(userId, conversation.extractedData);
  }

  await conversation.save();

  return { aiReply, nextStep: dbStep };
};

const getContext = asyncHandler(async (req, res) => {
  const coordinates = parseCoordinates(req.query.lat, req.query.lon, { required: true });
  const targetTime = calculateNextShiftTarget();

  const [weather, traffic] = await Promise.all([
    getWeatherContext(coordinates.lat, coordinates.lon, targetTime),
    getTraffic(coordinates.lat, coordinates.lon, targetTime),
  ]);

  res.json({ weather, traffic });
});

const startChat = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId).select("name");
  const lastDone = await Conversation.findOne({ userId, step: "done" }).sort({ createdAt: -1 });
  
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills : [];

  const context = {
    ...(lastDone?.burnoutStatus ? { burnoutStatus: lastDone.burnoutStatus } : {}),
    platforms,
    skills
  };

  const greeting = await generateGreeting(user?.name || "buddy", context, language);

  const conversation = await Conversation.create({
    userId,
    step: "greeting",
    language,
    messages: [{ role: "assistant", text: greeting }],
  });

  res.json({
    conversationId: conversation._id,
    step: "greeting",
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
    
    const platforms = typeof req.body.platforms === "string" ? req.body.platforms.split(",").filter(Boolean) : [];
    const skills = typeof req.body.skills === "string" ? req.body.skills.split(",").filter(Boolean) : [];

    const conversation = await findConversationForUser(conversationId, req.user.userId);
    const targetTime = calculateNextShiftTarget();

    let transcriptionLanguage = typeof req.body.language === "string" ? req.body.language.trim() : null;
    if (!transcriptionLanguage && conversation.language) {
      transcriptionLanguage = conversation.language;
    }

    // Fetch weather/traffic ONLY if we are near the final steps
    const shouldFetchContext = (conversation.step === "ask_hours" || conversation.step === "hours" || conversation.step === "retry_hours") && coordinates;

    const contextPromise = shouldFetchContext
      ? Promise.all([
          getWeatherContext(coordinates.lat, coordinates.lon, targetTime),
          getTraffic(coordinates.lat, coordinates.lon, targetTime),
        ]).catch((error) => {
          console.warn("Context fetch failed during chat reply:", error.message);
          return [null, null];
        })
      : Promise.resolve([null, null]);

    const [transcriptionResult, [weather, traffic]] = await Promise.all([
      transcribeAudio(filePath, transcriptionLanguage),
      contextPromise,
    ]);

    const transcriptionOriginal = transcriptionResult?.originalText || "";
    const transcriptionTranslated = transcriptionResult?.translatedText || "";

    if (transcriptionOriginal.trim().length === 0) {
      let retryState = "retry_platform";
      if (conversation.step === "ask_earnings" || conversation.step === "retry_earnings" || conversation.step === "earnings") {
        retryState = "retry_earnings";
      } else if (conversation.step === "ask_hours" || conversation.step === "retry_hours" || conversation.step === "hours") {
        retryState = "retry_hours";
      }

      const replyContext = {
        platforms,
        skills,
        dailyMood: conversation.dailyMood,
        extractedData: conversation.extractedData
      };

      const retryMessage = await generateConstrainedReply(retryState, replyContext, transcriptionLanguage);

      return res.json({
        conversationId: conversation._id,
        transcription: "(No speech detected)",
        reply: retryMessage,
        step: conversation.step,
        extractedData: conversation.extractedData,
        burnoutStatus: conversation.burnoutStatus,
        wellbeingRisk: conversation.wellbeingRisk,
        isComplete: false,
      });
    }

    const { aiReply, nextStep } = await runChatTurn({
      conversation,
      originalText: transcriptionOriginal.trim(),
      translatedText: transcriptionTranslated.trim(),
      language: transcriptionLanguage,
      context: { 
        ...(weather ? { weather } : {}),
        ...(traffic ? { traffic } : {}),
        platforms,
        skills
      },
      userId: req.user.userId,
    });

    res.json({
      conversationId: conversation._id,
      transcription: transcriptionOriginal.trim(),
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
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills : [];

  const conversation = await findConversationForUser(conversationId, req.user.userId);

  let language = typeof req.body.language === "string" ? req.body.language.trim() : null;
  if (!language && conversation.language) {
    language = conversation.language;
  }

  const { aiReply, nextStep } = await runChatTurn({
    conversation,
    originalText: text,
    translatedText: text,
    language,
    context: { platforms, skills },
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

const getRawGreeting = asyncHandler(async (req, res) => {
  const user = req.user ? await User.findById(req.user.userId).select("name") : null;
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills : [];
  
  const context = { platforms, skills };
  const greeting = await generateGreeting(user?.name || "buddy", context, language);
  res.json({ greeting });
});

const analyzeRawSentiment = asyncHandler(async (req, res) => {
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const text = req.body.text || "";
  const result = await analyzeMoodText(text, { language, sourceStep: "mood" });
  res.json(result);
});

module.exports = {
  getContext,
  startChat,
  reply,
  replyText,
  getBurnoutStatus,
  getChatHistory,
  deleteConversation,
  getRawGreeting,
  analyzeRawSentiment,
};