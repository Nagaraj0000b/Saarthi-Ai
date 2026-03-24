/**
 * @fileoverview Step-aware conversational AI engine.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

let model;

const getModel = () => {
  if (!model) {
    const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));
    model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  }

  return model;
};

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
    goal: "Wrap up. React to hours. Provide a short summary, a smart suggestion based on weather/traffic, and a motivational closing. Check-in is now complete.",
    nextStep: "done",
    extract: "hours",
  },
};

const generateGreeting = async (userName = "buddy", context = null, language = null) => {
  let contextBlock = "";
  if (context?.weather?.current) {
    const weather = context.weather.current;
    contextBlock += `\nCurrent weather: ${weather.condition}, ${weather.temp}C.`;
  }

  if (context?.burnoutStatus) {
    if (context.burnoutStatus.isBurnoutAlert) {
      contextBlock +=
        "\nURGENT HEALTH ALERT: The worker has worked 3 consecutive stressful days and is facing severe burnout. You MUST politely but firmly suggest they take a rest day today before you ask about their day.";
    } else if (context.burnoutStatus.isStressWarning) {
      contextBlock +=
        "\nHEALTH NOTE: The worker is experiencing high stress this week. Warmly remind them to take it easy today and not overwork.";
    }
  }

  const languageRule =
    language && language !== "English"
      ? `LANGUAGE RULE: You MUST reply ONLY in ${language}. Do NOT use English or Hinglish. Respond entirely in ${language}.`
      : "Personality: warm, supportive, casual Hinglish (Hindi + English mix).";

  const prompt = `
You are an AI companion for Indian gig economy workers.
${languageRule}
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

  try {
    const result = await getModel().generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    throw new AppError("Unable to start chat right now", 502, {
      code: "AI_SERVICE_ERROR",
      expose: false,
      cause: error,
    });
  }
};

const processChatTurn = async (
  currentStep,
  userText,
  recentMessages = [],
  context = null,
  language = null
) => {
  const stepConfig = STEP_CONFIG[currentStep];
  if (!stepConfig) {
    return {
      reply: "Aaj ka check-in ho chuka hai! Naya check-in shuru karne ke liye mic button dabao.",
      extractedValue: null,
    };
  }

  const historyBlock = recentMessages
    .slice(-6)
    .map((message) => `${message.role === "user" ? "Worker" : "Assistant"}: ${message.text}`)
    .join("\n");

  let contextBlock = "";
  if (context?.weather?.current) {
    const weather = context.weather.current;
    contextBlock += `\nWeather: ${weather.condition}, ${weather.temp}C.`;
  }

  if (context?.traffic) {
    const traffic = context.traffic;
    contextBlock += `\nTraffic: ${traffic.traffic_level} (${traffic.congestion_percent}% congestion).`;
  }

  const languageRule =
    language && language !== "English"
      ? `LANGUAGE RULE: You MUST reply ONLY in ${language}. Do NOT use English or Hinglish. All text in the "reply" field MUST be in ${language}. Short sentences. No emojis.`
      : "Personality: Warm, supportive, casual Hinglish. Short sentences (1-2 max). No emojis.";

  const prompt = `
You are an AI companion for Indian gig economy workers.
${languageRule}

Context:
${contextBlock}

Conversation so far:
${historyBlock}

Worker just said: "${userText}"

YOUR GOAL FOR THIS REPLY: ${stepConfig.goal}
${stepConfig.extract ? `
CRITICAL EXTRACTION RULE for "${stepConfig.extract}":
- ONLY extract "${stepConfig.extract}" if the worker EXPLICITLY mentioned it in their latest message.
- NEVER guess, assume, or infer "${stepConfig.extract}" from your own previous questions or conversation history.
- If the worker did NOT clearly provide "${stepConfig.extract}", you MUST set "extractedValue" to null.
- When "extractedValue" is null, your reply MUST be a friendly apology like "Sorry, woh thoda miss ho gaya. Kya aap bata sakte ho [the question]?" and re-ask for the missing info naturally.
- Do NOT move forward to the next topic until the worker answers.
- ALWAYS extract numbers as pure digits (e.g., return 2 instead of "two" or "Two hours"). DO NOT include units like "hours" or "rupees".
` : ""}

Return ONLY a JSON object:
{
  "reply": "Hinglish response",
  "extractedValue": <extracted ${stepConfig.extract || "null"} or null>
}
  `.trim();

  let raw;
  try {
    const result = await getModel().generateContent(prompt);
    raw = result.response.text().trim();
  } catch (error) {
    throw new AppError("AI conversation service is temporarily unavailable", 502, {
      code: "AI_SERVICE_ERROR",
      expose: false,
      cause: error,
    });
  }

  raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(raw);

    if (currentStep === "platform" && parsed.extractedValue) {
      const normalized =
        String(parsed.extractedValue).charAt(0).toUpperCase() +
        String(parsed.extractedValue).slice(1).toLowerCase();
      const validPlatforms = ["Uber", "Swiggy", "Rapido", "Other"];

      if (!validPlatforms.includes(normalized)) {
        parsed.extractedValue = null;
        parsed.reply =
          "Main theek se samajh nahi paaya ki aapne aaj kis platform par kaam kiya. Kya aap dobara bata sakte hain? (Uber, Swiggy, Rapido ya Other?)";
      } else {
        parsed.extractedValue = normalized;
      }
    }

    return parsed;
  } catch (error) {
    console.warn("AI chat turn returned invalid JSON. Falling back to retry prompt.");
    return {
      reply: "Sorry, woh thoda miss ho gaya. Kya aap ek baar dobara bata sakte ho?",
      extractedValue: null,
    };
  }
};

const getNextStep = (currentStep, extractedValue = null) => {
  const stepConfig = STEP_CONFIG[currentStep];
  if (stepConfig?.extract && (extractedValue === null || extractedValue === undefined)) {
    return currentStep;
  }

  return stepConfig?.nextStep || "done";
};

module.exports = { generateGreeting, processChatTurn, getNextStep, STEP_CONFIG };
