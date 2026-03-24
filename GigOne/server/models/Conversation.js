/**
 * @fileoverview Conversation Model for managing AI-driven check-in sessions.
 * Implements a state-machine like structure to track the progress of conversational data extraction.
 * 
 * @module server/models/Conversation
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * Message Schema (Embedded)
 * Represents a single exchange in the conversation.
 */
const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ["user", "assistant"], required: true },
  text:      { type: String, required: true },
  /**
   * AI-Generated Sentiment Analysis
   * Captured in-realtime during the conversation turn.
   */
  sentiment: {
    mood:       String,   // e.g., "happy", "stressed", "tired"
    score:      Number,   // Normalized score from -1.0 to 1.0
    summary:    String,   // NLP summary of the user's emotional state
    suggestion: String,   // AI-provided tip based on current mood
  },
}, { timestamps: true });

/**
 * Conversation Schema
 * 
 * @typedef {Object} Conversation
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to the User participant.
 * @property {string} step - Current state in the check-in workflow.
 * @property {Object} extractedData - Structured data harvested from the natural language exchange.
 * @property {Array} messages - Ordered history of the conversation turns.
 */
const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  /**
   * Workflow State Machine
   * Defines the progression of the structured check-in.
   */
  step: {
    type: String,
    enum: ["greeting", "mood", "platform", "earnings", "hours", "summary", "done"],
    default: "greeting",
  },
  /**
   * Extracted Domain Data
   * Accumulates structured values (e.g., amount, hours) as they are identified by the LLM.
   */
  extractedData: {
    platform: String,     // e.g., "uber", "swiggy"
    earnings: Number,     // e.g., 1200
    hours:    Number,     // e.g., 5
  },
  /**
   * Wellbeing Risk Assessment
   * Calculated automatically when the check-in conversation is completed,
   * combining emotional strain, workload intensity, and lack of recovery.
   */
  wellbeingRisk: {
    riskLevel: String,         // "low", "moderate", "high"
    riskScore: Number,         // 0 to 100
    emotionScore: Number,      // 0 to 100
    workloadScore: Number,     // 0 to 100
    recoveryScore: Number,     // 0 to 100
    reasons: [String],         // ["Ongoing negative mood", "High workload"]
    recommendedAction: String, // "suggest rest", etc.
    isReliable: Boolean,       // true if enough historical data was evaluated
  },
  /**
   * LEGACY Burnout Assessment 
   * Maintained temporarily for backward compatibility with frontend clients.
   */
  burnoutStatus: {
    isBurnoutAlert:  Boolean,
    isStressWarning: Boolean,
    averageScore:    Number,
    action:          String,
  },
  /**
   * Verified daily sentiment measurement.
   */
  dailyMood: {
    moodLabel: String,
    moodScore: Number,
    summary: String,
    suggestion: String,
    confidence: Number,
    isValid: Boolean,
    sourceStep: String,
  },
  messages: [messageSchema],
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);
