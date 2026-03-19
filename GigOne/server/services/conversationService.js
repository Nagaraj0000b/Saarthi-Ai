/**
 * @fileoverview Step-aware Conversational AI Engine.
 * Implements a structured check-in workflow for gig workers, guiding them through 
 * mood assessment, platform identification, earnings reporting, and time tracking.
 * 
 * @module server/services/conversationService
 * @requires @google/generative-ai
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

/**
 * Workflow Configuration
 * Defines the progression and goals of each conversational step.
 */
const STEP_CONFIG = {
  greeting: {
    goal: "Greet the worker warmly. Ask how their day was. Be casual and friendly.",
    nextStep: "mood",
    extract: null,
  },
  mood: {
    goal: "Acknowledge their feelings based on sentiment. Ask which platform they worked on (Uber, Swiggy, Rapido, etc).",
    nextStep: "platform",
    extract: null,
  },
  platform: {
    goal: "Acknowledge the platform. Ask for today's total earnings.",
    nextStep: "earnings",
    extract: "platform", 
  },
  earnings: {
    goal: "React to earnings. Ask for the total hours worked.",
    nextStep: "hours",
    extract: "earnings", 
  },
  hours: {
    goal: "Wrap up. Provide a summary and a smart suggestion based on weather/traffic.",
    nextStep: "summary",
    extract: "hours", 
  },
  summary: {
    goal: "Motivational closing. Check-in complete.",
    nextStep: "done",
    extract: null,
  },
};

/**
 * Generates an initial greeting message for a check-in session.
 * 
 * @async
 * @function generateGreeting
 * @param {string} [userName="buddy"] - The user's name for personalization.
 * @param {Object} [context=null] - Optional real-time environmental context.
 * @returns {Promise<string>} Personalized greeting text.
 */
const generateGreeting = async (userName = "buddy", context = null) => {
  let contextBlock = "";
  if (context?.weather?.current) {
    const w = context.weather.current;
    contextBlock += `\nCurrent weather: ${w.condition}, ${w.temp}°C.`;
  }
  
  if (context?.burnoutStatus) {
    if (context.burnoutStatus.isBurnoutAlert) {
      contextBlock += `\nURGENT HEALTH ALERT: The worker has worked 3 consecutive stressful days and is facing severe burnout. You MUST politely but firmly suggest they take a rest day today before you ask about their day.`;
    } else if (context.burnoutStatus.isStressWarning) {
      contextBlock += `\nHEALTH NOTE: The worker is experiencing high stress this week. Warmly remind them to take it easy today and not overwork.`;
    }
  }

  const prompt = `
You are an AI companion for Indian gig economy workers.
Personality: warm, supportive, casual Hinglish (Hindi + English mix).
${contextBlock}

The worker's name is "${userName}".
Generate a SHORT greeting (1-2 sentences) to start a daily check-in.
Use their name naturally. Ask how their day was. Be warm and natural.

CRITICAL RULES:
- ALWAYS use secular, universally inclusive greetings (e.g., "Hello", "Hi", "Hey", "Namaste", "Adab").
- NEVER use religion-specific greetings.
- Do NOT use any emojis.
- Return ONLY the greeting text.
  `.trim();

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

/**
 * Executes a unified conversational turn using Gemini.
 * Performs sentiment analysis, response generation, and data extraction in a single LLM pass
 * to minimize latency and ensure state consistency.
 * 
 * @async
 * @function processChatTurn
 * @param {string} currentStep - The current state in the check-in workflow.
 * @param {string} userText - The transcribed text from the worker.
 * @param {Array<Object>} [recentMessages=[]] - Conversation history for context.
 * @param {Object} [context=null] - Environmental context (weather/traffic).
 * @returns {Promise<Object>} Unified response object containing sentiment, reply, and extracted value.
 */
const processChatTurn = async (currentStep, userText, recentMessages = [], context = null) => {
  const stepConfig = STEP_CONFIG[currentStep];
  if (!stepConfig) throw new Error(`Unknown conversation step: ${currentStep}`);

  const historyBlock = recentMessages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Worker" : "Assistant"}: ${m.text}`)
    .join("\n");

  let contextBlock = "";
  if (context) {
    if (context.weather?.current) {
      const w = context.weather.current;
      contextBlock += `\nWeather: ${w.condition}, ${w.temp}°C.`;
    }
    if (context.traffic) {
      const t = context.traffic;
      contextBlock += `\nTraffic: ${t.traffic_level} (${t.congestion_percent}% congestion).`;
    }
  }

  const prompt = `
You are an AI companion for Indian gig economy workers.
Personality: Warm, supportive, casual Hinglish. Short sentences (1-2 max). No emojis.

Context:
${contextBlock}

Conversation so far:
${historyBlock}

Worker just said: "${userText}"

YOUR GOAL FOR THIS REPLY: ${stepConfig.goal}
${stepConfig.extract ? `\nYou also need to extract: "${stepConfig.extract}" from the worker's text.` : ''}

Return ONLY a JSON object:
{
  "sentiment": {
    "mood": "happy|neutral|stressed|frustrated|tired|excited",
    "score": <number -1.0 to 1.0>,
    "summary": "1 sentence emotion summary",
    "suggestion": "1 short tip"
  },
  "reply": "Hinglish response",
  "extractedValue": <extracted ${stepConfig.extract || 'null'} or null>
}
  `.trim();

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();

  // Robust JSON parsing with markdown stripping
  raw = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gemini JSON parse failure:", err, raw);
    return {
      sentiment: { mood: "neutral", score: 0, summary: "Processing...", suggestion: "Keep going!" },
      reply: "Got it, tell me more.",
      extractedValue: null
    };
  }
};

/**
 * Determines the logical next step in the workflow state machine.
 * 
 * @function getNextStep
 * @param {string} currentStep - Current workflow state.
 * @returns {string} Next workflow state.
 */
const getNextStep = (currentStep) => {
  return STEP_CONFIG[currentStep]?.nextStep || "done";
};

module.exports = { generateGreeting, processChatTurn, getNextStep, STEP_CONFIG };
