const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { generateGreeting, generateConstrainedReply } = require("../services/conversationServiceV2");
const { analyzeMoodText } = require("../services/sentimentService");
const { extractGigData } = require("../services/geminiService");

const getRawGreeting = asyncHandler(async (req, res) => {
  const user = req.user ? await User.findById(req.user.userId).select("name") : null;
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills : [];
  
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
  
  const context = {
    platforms: Array.isArray(req.body.platforms) ? req.body.platforms : [],
    skills: Array.isArray(req.body.skills) ? req.body.skills : [],
    dailyMood: req.body.dailyMood || null,
    extractedData: req.body.extractedData || {},
    weather: req.body.weather || null,
    traffic: req.body.traffic || null
  };
  
  const reply = await generateConstrainedReply(nextState, context, language);
  res.json({ summary: reply });
});

const extractRawData = asyncHandler(async (req, res) => {
  const text = req.body.text || "";
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  
  const result = await extractGigData(text, platforms);
  res.json(result);
});

module.exports = {
  getRawGreeting,
  analyzeRawSentiment,
  getRawReply,
  extractRawData,
};
