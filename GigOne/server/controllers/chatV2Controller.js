const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const User = require("../models/User");
const { generateGreeting, generateConstrainedReply } = require("../services/conversationServiceV2");
const { analyzeMoodText } = require("../services/sentimentService");
const { extractGigData } = require("../services/geminiService");
const axios = require("axios");
const { transcribeAudio } = require("../services/speechService");
const Conversation = require("../models/Conversation");
const fs = require("fs/promises");
const EarningsEntry = require("../models/EarningsEntry");
const { evaluateWellbeingRisk } = require("../services/wellbeingRiskService");
const { normalizeJob } = require("../utils/validation");
const dailyTargetNudgeEvaluator = null; // nudges removed from chatbot flow
const earningsNudgeEvaluator    = null; // nudges removed from chatbot flow

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const firstDefined = (...values) => values.find(hasValue);

const parseNumericValue = (value) => {
  if (!hasValue(value)) return undefined;
  const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
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
  let rawEarnings = extractedData?.earnings || extractedData?.amount;
  let rawHours = extractedData?.hours;

  console.log("\n---- DEBUG AUTO-SAVE ----");
  console.log("Input Job:", job);
  console.log("Input Earnings:", rawEarnings);
  console.log("Input Hours:", rawHours);

  if (!job || rawEarnings === undefined || rawEarnings === null) {
    console.log("Auto-save skipped: Missing job or earnings data.");
    return;
  }

  try {
    // Strip non-numeric characters (like ₹, Rs, etc.) except decimal point
    const cleanEarnings = typeof rawEarnings === "string" 
      ? rawEarnings.replace(/[^\d.-]/g, "") 
      : rawEarnings;
    const cleanHours = typeof rawHours === "string" 
      ? rawHours.replace(/[^\d.-]/g, "") 
      : rawHours;

    const amount = Number(cleanEarnings);
    const hours = Number(cleanHours) || 0;

    console.log("Cleaned Amount:", amount);
    console.log("Cleaned Hours:", hours);

    if (isNaN(amount)) {
        console.log("Auto-save failed: Cleaned amount is not a valid number.");
        return;
    }

    const entry = await EarningsEntry.create({
      userId,
      job: normalizeJob(job),
      amount: amount,
      hours: hours,
    });
    console.log("✅ Auto-save SUCCESS! Earning ID:", entry._id);
    console.log("-------------------------\n");
  } catch (error) {
    console.warn("❌ Auto-save earning FAILED:", error.message);
    console.log("-------------------------\n");
  }
};

const getRawGreeting = asyncHandler(async (req, res) => {
  const user = req.user ? await User.findById(req.user.userId) : null;
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = user?.registeredJobs || [];
  const skills = user?.skills || [];
  
  const context = { platforms, skills };
  const greeting = await generateGreeting(user?.name || "buddy", context, language);
  // LangGraph expects a 'summary' key
  res.json({ summary: greeting });
});

const analyzeRawSentiment = asyncHandler(async (req, res) => {
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const text = req.body.text || "";
  const result = await analyzeMoodText(text, { language, sourceStep: "mood" });
  
  // LangGraph expects 'summary' and 'score' keys, not the full object.
  res.json({
    summary: result.isValid ? (result.moodLabel || "Neutral") : "Invalid",
    score: result.isValid ? (result.moodScore || 0.0) : 0.0,
    isValid: result.isValid
  });
});

const getRawReply = asyncHandler(async (req, res) => {
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const nextState = req.body.state || "default";
  
  // Fetch user profile for personalized professional response and skills
  const user = req.user ? await User.findById(req.user.userId) : null;

  const context = {
    userName: user?.name || null,
    platforms: req.body.platforms || user?.registeredJobs || [],
    skills: req.body.skills || user?.skills || [],
    dailyMood: req.body.dailyMood || null,
    extractedData: req.body.extractedData || {},
    weather: req.body.weather || null,
    traffic: req.body.traffic || null
  };
  
  const reply = await generateConstrainedReply(nextState, context, language);
  res.json({ summary: reply });
});

const extractRawData = asyncHandler(async (req, res) => {
  const user = req.user ? await User.findById(req.user.userId) : null;
  const text = req.body.text || "";
  const platforms = req.body.platforms || user?.registeredJobs || [];
  
  const result = await extractGigData(text, platforms);
  res.json(result);
});

const startChatV2 = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId);
  
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = user.registeredJobs || [];
  const skills = user.skills || [];

  const conversation = await Conversation.create({
    userId,
    step: "greeting",
    language,
    messages: [],
  });

  const payload = {
    user_token: (req.headers.authorization || "").replace(/^Bearer\s+/i, ""),
    language,
    jobs_list: platforms.map(j => j.platform || j).filter(Boolean),
    skills_list: skills.map(s => s.name || s).filter(Boolean),
    current_step: "start"
  };

  // Add a 15-second timeout so the Android app doesn't spin forever if Python is down
  const response = await axios.post("http://127.0.0.1:8000/chat/turn", payload, {
    timeout: 15000 
  });
  const result = response.data;

  conversation.step = result.current_step || "greeting";
  // The state returns final_summary
  const replyText = result.final_summary || "Hello!";
  conversation.messages.push({ role: "assistant", text: replyText });
  await conversation.save();

  res.json({
    conversationId: conversation._id,
    step: conversation.step,
    reply: replyText
  });
});

const cleanupUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Temporary audio cleanup failed:", error.message);
  }
};

const replyChatV2 = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    return res.status(400).json({ message: "Audio file is required" });
  }

  const filePath = req.file.path;
  try {
    const conversationId = req.body.conversationId;
    const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user.userId });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    const user = await User.findById(req.user.userId);
    const platforms = user.registeredJobs || [];
    const skills = user.skills || [];

    let transcriptionLanguage = typeof req.body.language === "string" ? req.body.language.trim() : conversation.language || "English";
    
    const transcriptionResult = await transcribeAudio(filePath, transcriptionLanguage);
    const userText = transcriptionResult?.originalText || transcriptionResult?.translatedText || "";

    const payload = {
      user_token: (req.headers.authorization || "").replace(/^Bearer\s+/i, ""),
      language: transcriptionLanguage,
      jobs_list: platforms.map(j => j.platform || j).filter(Boolean),
      skills_list: skills.map(s => s.name || s).filter(Boolean),
      current_step: conversation.step,
      user_input: userText,
      extracted_data: conversation.extractedData || {},
      selected_platform: conversation.extractedData?.platform || conversation.extractedData?.job,
      expected_earnings: hasValue(conversation.extractedData?.earnings) ? String(conversation.extractedData.earnings) : undefined,
      hours_worked: hasValue(conversation.extractedData?.hours) ? String(conversation.extractedData.hours) : undefined,
      mood: conversation.dailyMood?.moodLabel,
      sentiment_score: conversation.dailyMood?.moodScore
    };

  // Add a 15-second timeout
  const response = await axios.post("http://127.0.0.1:8000/chat/turn", payload, {
    timeout: 15000 
  });
    const result = response.data;

    console.log("\n---- DEBUG CHAT V2 ----");
    console.log("Transcription Language:", transcriptionLanguage);
    console.log("User Input (Transcribed):", userText);
    console.log("LangGraph Input Step:", conversation.step);
    console.log("LangGraph Output Step:", result.current_step);
    console.log("AI Reply:", result.final_summary);
    console.log("-----------------------\n");

    const previousStep = conversation.step;
    conversation.step = result.current_step || conversation.step;
    
    // Merge V2 data into legacy schema keys for persistence
    const v2Data = result.extracted_data || result.extractedData || {};
    const existingData = conversation.extractedData || {};
    const nextPlatform = firstDefined(
      result.selected_platform,
      v2Data.selected_platform,
      v2Data.platform,
      v2Data.job,
      existingData.platform,
      existingData.job
    );
    const nextEarnings = firstDefined(
      parseNumericValue(result.expected_earnings),
      parseNumericValue(v2Data.expected_earnings),
      parseNumericValue(v2Data.earnings),
      parseNumericValue(v2Data.amount),
      existingData.earnings
    );
    const nextHours = firstDefined(
      parseNumericValue(result.hours_worked),
      parseNumericValue(v2Data.hours_worked),
      parseNumericValue(v2Data.hours),
      existingData.hours
    );
    
    const mergedData = {
      platform: nextPlatform,
      earnings: nextEarnings,
      hours: nextHours,
      job: nextPlatform
    };
    
    conversation.extractedData = mergedData;

    const nextMoodLabel = firstDefined(result.mood, conversation.dailyMood?.moodLabel);
    const nextMoodScore = firstDefined(result.sentiment_score, conversation.dailyMood?.moodScore);
    if (hasValue(nextMoodLabel) || hasValue(nextMoodScore)) {
      conversation.dailyMood = {
        ...(conversation.dailyMood?.toObject?.() || conversation.dailyMood || {}),
        moodLabel: nextMoodLabel || "neutral",
        moodScore: nextMoodScore ?? 0,
        isValid: true,
        sourceStep: "mood"
      };
    }
    
    if (userText) conversation.messages.push({ role: "user", text: userText });
    if (result.final_summary) conversation.messages.push({ role: "assistant", text: result.final_summary });

    const isComplete = conversation.step === "completed" || conversation.step === "done" || conversation.step === "summary";

    if (previousStep !== "completed" && isComplete) {
      if (!conversation.dailyMood) {
        conversation.dailyMood = {
          moodLabel: "neutral",
          moodScore: 0,
          isValid: true,
          sourceStep: "mood"
        };
      }
      await calculateAndSaveBurnout(conversation);
      await persistAutoSavedEarnings(req.user.userId, conversation.extractedData);

      // Nudge evaluation removed — nudges are now triggered by background jobs only
    }

    await conversation.save();

    res.json({
      conversationId: conversation._id,
      transcription: userText,
      reply: result.final_summary || "I didn't understand that.",
      step: conversation.step,
      extractedData: conversation.extractedData,
      burnoutStatus: conversation.burnoutStatus,
      wellbeingRisk: conversation.wellbeingRisk,
      isComplete: conversation.step === "completed" || conversation.step === "done" || conversation.step === "summary"
    });
  } finally {
    await cleanupUploadedFile(filePath);
  }
});

const getBurnoutStatus = asyncHandler(async (req, res) => {
  const lastDone = await Conversation.findOne({
    userId: req.user.userId,
    step: { $in: ["done", "completed", "summary"] },
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
    step: { $in: ["done", "completed", "summary"] },
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
  getRawGreeting,
  analyzeRawSentiment,
  getRawReply,
  extractRawData,
  startChatV2,
  replyChatV2,
  getBurnoutStatus,
  getChatHistory,
  deleteConversation
};
