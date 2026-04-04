const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { generateGreeting, generateConstrainedReply } = require("../services/conversationServiceV2");
const { analyzeMoodText } = require("../services/sentimentService");
const { extractGigData } = require("../services/geminiService");
const axios = require("axios");
const { transcribeAudio } = require("../services/speechService");
const Conversation = require("../models/Conversation");
const fs = require("fs/promises");

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

const startChatV2 = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await User.findById(userId).select("name");
  
  const language = typeof req.body.language === "string" ? req.body.language.trim() : "English";
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills : [];

  const conversation = await Conversation.create({
    userId,
    step: "start",
    language,
    messages: [],
  });

  const payload = {
    user_token: req.headers.authorization || "",
    language,
    jobs_list: platforms,
    skills_list: skills,
    current_step: "start"
  };

  const response = await axios.post("http://127.0.0.1:8000/chat/turn", payload);
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

    let transcriptionLanguage = typeof req.body.language === "string" ? req.body.language.trim() : conversation.language || "English";
    
    const transcriptionResult = await transcribeAudio(filePath, transcriptionLanguage);
    const userText = transcriptionResult?.originalText || transcriptionResult?.translatedText || "";

    const platforms = typeof req.body.platforms === "string" ? req.body.platforms.split(",").filter(Boolean) : (Array.isArray(req.body.platforms) ? req.body.platforms : []);
    const skills = typeof req.body.skills === "string" ? req.body.skills.split(",").filter(Boolean) : (Array.isArray(req.body.skills) ? req.body.skills : []);

    const payload = {
      user_token: req.headers.authorization || "",
      language: transcriptionLanguage,
      jobs_list: platforms,
      skills_list: skills,
      current_step: conversation.step,
      user_input: userText,
      extracted_data: conversation.extractedData || {}
    };

    const response = await axios.post("http://127.0.0.1:8000/chat/turn", payload);
    const result = response.data;

    conversation.step = result.current_step || conversation.step;
    conversation.extractedData = result.extracted_data || result.extractedData || conversation.extractedData;
    
    if (userText) conversation.messages.push({ role: "user", text: userText });
    if (result.final_summary) conversation.messages.push({ role: "assistant", text: result.final_summary });

    await conversation.save();

    res.json({
      conversationId: conversation._id,
      transcription: userText,
      reply: result.final_summary || "I didn't understand that.",
      step: conversation.step,
      extractedData: conversation.extractedData,
      isComplete: conversation.step === "completed" || conversation.step === "done" || conversation.step === "summary"
    });
  } finally {
    await cleanupUploadedFile(filePath);
  }
});

module.exports = {
  getRawGreeting,
  analyzeRawSentiment,
  getRawReply,
  extractRawData,
  startChatV2,
  replyChatV2
};
