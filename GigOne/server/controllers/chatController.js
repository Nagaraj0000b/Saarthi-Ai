/**
 * @fileoverview Chat Controller orchestrating the AI-driven check-in experience.
 * Manages voice-to-text transcription, context gathering (weather/traffic), 
 * sentiment analysis, and structured data extraction through a unified AI turn.
 * 
 * @module server/controllers/chatController
 * @requires ../services/groqService
 * @requires ../services/geminiService
 * @requires ../services/weatherService
 * @requires ../services/trafficService
 * @requires ../services/conversationService
 * @requires ../models/Conversation
 */

const { transcribeAudio } = require("../services/groqService");
const { analyzeSentiment } = require("../services/geminiService");
const { getWeatherContext } = require("../services/weatherService");
const { getTraffic } = require("../services/trafficService");
const { generateGreeting, processChatTurn, getNextStep } = require("../services/conversationService");
const { checkBurnout } = require("../services/burnoutService");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const fs = require("fs");

/**
 * Helper to calculate burnout metrics at the end of a check-in.
 */
const calculateAndSaveBurnout = async (conversation) => {
  const todaySentiments = conversation.messages
    .filter(m => m.sentiment && m.sentiment.score !== undefined)
    .map(m => m.sentiment.score);
  const todayScore = todaySentiments.length > 0 
    ? Number((todaySentiments.reduce((a,b)=>a+b, 0) / todaySentiments.length).toFixed(2))
    : 0;

  // Fetch last 4 'done' conversations chronologically backward
  const pastConvos = await Conversation.find({
    userId: conversation.userId,
    step: "done",
    _id: { $ne: conversation._id }
  }).sort({ createdAt: -1 }).limit(4);

  // Reverse them so they are in [Oldest -> Newest (yesterday)] order
  const pastScores = pastConvos.reverse().map(c => {
    const scores = c.messages.filter(m => m.sentiment && m.sentiment.score !== undefined).map(m => m.sentiment.score);
    return scores.length > 0 ? Number((scores.reduce((a,b)=>a+b, 0)/scores.length).toFixed(2)) : 0;
  });

  // History array is [Day-4, Day-3, Day-2, Day-1, Today]
  const historyArray = [...pastScores, todayScore];
  conversation.burnoutStatus = checkBurnout(historyArray);
};

/**
 * Aggregates real-time external context (weather & traffic) for a given location.
 * 
 * @async
 * @function getContext
 * @param {Object} req - Express request object.
 * @param {string} req.query.lat - Latitude.
 * @param {string} req.query.lon - Longitude.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const getContext = async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ message: "lat and lon are required" });
  }
  try {
    const [weather, traffic] = await Promise.all([
      getWeatherContext(lat, lon),
      getTraffic(lat, lon),
    ]);
    res.json({ weather, traffic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Initializes a new conversation check-in session.
 * Provision a Conversation document and generates a personalized greeting.
 * 
 * @async
 * @function startChat
 * @param {Object} req - Express request object (authenticated).
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const startChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    const userName = user?.name || "buddy";

    // Inject last known burnout status to enable protective JITAI greetings
    const lastDone = await Conversation.findOne({ userId, step: "done" }).sort({ createdAt: -1 });
    const context = lastDone && lastDone.burnoutStatus ? { burnoutStatus: lastDone.burnoutStatus } : null;

    const greeting = await generateGreeting(userName, context);

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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Handles a multimodal (voice) turn in the conversation.
 * Transcribes audio, fetches context, and executes a unified AI processing step
 * to determine the next conversational turn and extract domain data.
 * 
 * @async
 * @function reply
 * @param {Object} req - Express request object with Multer file attachment.
 * @param {string} req.body.conversationId - Active conversation ID.
 * @param {number} [req.body.lat] - User's current latitude.
 * @param {number} [req.body.lon] - User's current longitude.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>}
 */
const reply = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No audio file received" });
  }

  const filePath = req.file.path;
  const { conversationId, lat, lon } = req.body;

  if (!conversationId) {
    return res.status(400).json({ message: "conversationId is required" });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Parallelize compute-intensive transcription and external API calls
    const [transcription, weather] = await Promise.all([
      transcribeAudio(filePath),
      (lat && lon) ? getWeatherContext(lat, lon).catch(err => {
        console.warn("Weather context fetch failed during chat:", err.message);
        return null;
      }) : Promise.resolve(null)
    ]);

    const context = weather ? { weather } : null;
    const currentStep = conversation.step;

    // Unified AI Turn: Combines Sentiment, Response Generation, and Data Extraction
    const { sentiment, reply: aiReply, extractedValue } = await processChatTurn(
      currentStep,
      transcription,
      conversation.messages,
      context
    );

    // Persist user interaction
    conversation.messages.push({
      role: "user",
      text: transcription,
      sentiment,
    });

    // Update structured data based on current step requirements
    if (extractedValue !== null) {
      const fieldMapping = { platform: "platform", earnings: "earnings", hours: "hours" };
      const field = fieldMapping[currentStep];
      if (field) {
        conversation.extractedData = conversation.extractedData || {};
        conversation.extractedData[field] = extractedValue;
      }
    }

    // Persist assistant response
    conversation.messages.push({ role: "assistant", text: aiReply });

    // Transition State
    const nextStep = getNextStep(currentStep);
    conversation.step = nextStep;

    if (nextStep === "done") {
      await calculateAndSaveBurnout(conversation);
    }
    await conversation.save();

    res.json({
      conversationId: conversation._id,
      transcription,
      sentiment,
      reply: aiReply,
      step: nextStep,
      extractedData: conversation.extractedData,
      burnoutStatus: conversation.burnoutStatus,
      isComplete: nextStep === "done",
    });
  } catch (err) {
    console.error("Critical error in chat reply handler:", err);
    res.status(500).json({ message: "Internal processing error", error: err.message });
  } finally {
    // Aggressive cleanup of temporary audio assets
    fs.unlink(filePath, (err) => { if (err) console.error("Temp file cleanup failed:", err); });
  }
};

/**
 * Text-based fallback for the conversational interface.
 * Useful for debugging or low-bandwidth scenarios where audio processing is bypassed.
 * 
 * @async
 * @function replyText
 */
const replyText = async (req, res) => {
  const { conversationId, text } = req.body;
  if (!conversationId || !text) return res.status(400).json({ message: "Missing required fields" });

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    // In text-only mode, we still utilize the unified process turn for consistency
    const { sentiment, reply: aiReply, extractedValue } = await processChatTurn(
      conversation.step,
      text,
      conversation.messages,
      null // context injection omitted for basic text replies
    );

    conversation.messages.push({ role: "user", text, sentiment });
    
    if (extractedValue !== null) {
      const fieldMapping = { platform: "platform", earnings: "earnings", hours: "hours" };
      const field = fieldMapping[conversation.step];
      if (field) {
        conversation.extractedData = conversation.extractedData || {};
        conversation.extractedData[field] = extractedValue;
      }
    }

    conversation.messages.push({ role: "assistant", text: aiReply });
    const nextStep = getNextStep(conversation.step);
    conversation.step = nextStep;

    if (nextStep === "done") {
      await calculateAndSaveBurnout(conversation);
    }
    await conversation.save();

    res.json({
      conversationId: conversation._id,
      transcription: text,
      sentiment,
      reply: aiReply,
      step: nextStep,
      extractedData: conversation.extractedData,
      burnoutStatus: conversation.burnoutStatus,
      isComplete: nextStep === "done",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Quick fetch for the dashboard burnout widget on load.
 */
const getBurnoutStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const lastDone = await Conversation.findOne({ userId, step: "done" }).sort({ createdAt: -1 });
    const status = lastDone?.burnoutStatus || {
      isBurnoutAlert: false,
      isStressWarning: false,
      averageScore: 0.0,
      action: "Normal - Ready"
    };
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getContext, startChat, reply, replyText, getBurnoutStatus };
