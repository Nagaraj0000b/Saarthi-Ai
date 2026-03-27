/**
 * @fileoverview Step-aware conversational AI engine using GCP Vertex AI.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

let model;

const getModel = () => {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        return model;
      } catch (error) {
        console.warn("Failed to initialize Google Generative AI with API Key, falling back to Vertex AI:", error.message);
      }
    }

    const keyFilename = path.join(__dirname, "..", "credential.json");
    if (!fs.existsSync(keyFilename)) {
      throw new AppError("Google Cloud credential.json or GEMINI_API_KEY not found.", 500, {
        code: "CONFIG_ERROR",
      });
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(keyFilename, "utf8"));
      const projectId = credentials.project_id;
      const location = "us-central1";

      const vertexAI = new VertexAI({
        project: projectId,
        location: location,
        keyFilename: keyFilename,
      });

      model = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
    } catch (error) {
      throw new AppError("Failed to initialize Gemini model (Vertex AI or Gen AI)", 500, {
        code: "AI_INIT_ERROR",
        cause: error,
      });
    }
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
    goal: "Wrap up. React to hours. Provide a short summary, and a specific prediction/warning for their NEXT SHIFT based on the weather and traffic context provided (e.g., predict rain or heavy traffic for tomorrow morning). End with a motivational closing.",
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

  if (context?.weather?.nextShift) {
    const next = context.weather.nextShift;
    contextBlock += `\nNext Shift Weather (${next.time}): ${next.condition}, ${next.temp}C with ${Math.round(next.pop * 100)}% rain chance.`;
  }

  if (context?.traffic) {
    const traffic = context.traffic;
    contextBlock += `\nNext Shift Traffic: ${traffic.traffic_level} congestion predicted.`;
  }

  if (context?.platforms && context.platforms.length > 0) {
    contextBlock += `\nWorker's platforms: ${context.platforms.join(", ")}.`;
  }
  
  if (context?.vehicles && context.vehicles.length > 0) {
    contextBlock += `\nWorker's vehicles: ${context.vehicles.join(", ")}.`;
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
      : "LANGUAGE RULE: You MUST reply ONLY in English. Do NOT use Hinglish or Hindi. Keep it natural and conversational.";

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
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text.trim();
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
    const isEnglish = !language || language === "English";
    return {
      reply: isEnglish 
        ? "Today's check-in is complete! Hold the mic to start a new one." 
        : "Aaj ka check-in ho chuka hai! Naya check-in shuru karne ke liye mic button dabao.",
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

  if (context?.weather?.nextShift) {
    const next = context.weather.nextShift;
    contextBlock += `\nNext Shift Weather (${next.time}): ${next.condition}, ${next.temp}C with ${Math.round(next.pop * 100)}% rain chance.`;
  }

  if (context?.traffic) {
    const traffic = context.traffic;
    contextBlock += `\nNext Shift Traffic: ${traffic.traffic_level} congestion predicted.`;
  }

  if (context?.platforms && context.platforms.length > 0) {
    contextBlock += `\nWorker's platforms: ${context.platforms.join(", ")}.`;
  }
  
  if (context?.vehicles && context.vehicles.length > 0) {
    contextBlock += `\nWorker's vehicles: ${context.vehicles.join(", ")}.`;
  }

  if (context?.traffic) {
    const traffic = context.traffic;
    contextBlock += `\nTraffic: ${traffic.traffic_level} (${traffic.congestion_percent}% congestion).`;
  }

  const languageRule =
    language && language !== "English"
      ? `LANGUAGE RULE: You MUST reply ONLY in ${language}. Do NOT use English or Hinglish. All text in the "reply" field MUST be in ${language}. Short sentences. No emojis.`
      : `LANGUAGE RULE: You MUST reply ONLY in English. Do NOT use Hinglish or Hindi. Keep it natural, conversational, and use short sentences. No emojis.`;

  const personalizedGoal = currentStep === "mood" && context?.platforms?.length > 0
    ? `${stepConfig.goal} (Specifically check if they worked on: ${context.platforms.join(", ")} or something else).`
    : stepConfig.goal;

  const prompt = `
You are an AI companion for Indian gig economy workers.
${languageRule}

Context:
${contextBlock}

Conversation so far:
${historyBlock}

Worker just said: "${userText}"

YOUR GOAL FOR THIS REPLY: ${personalizedGoal}
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
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    raw = response.candidates[0].content.parts[0].text.trim();
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
      
      const userPlatforms = context?.platforms || [];
      const validPlatforms = userPlatforms.length > 0 ? [...userPlatforms, "Other"] : ["Uber", "Swiggy", "Rapido", "Other"];

      if (!validPlatforms.some(p => p.toLowerCase() === normalized.toLowerCase())) {
        parsed.extractedValue = null;
        const platformList = validPlatforms.join(", ");
        const isEnglish = !language || language === "English";
        parsed.reply = isEnglish
          ? `I didn't quite catch which platform you worked on. Could you say it again? (Maybe one of these: ${platformList}?)`
          : `Main theek se samajh nahi paaya ki aapne aaj kis platform par kaam kiya. Kya aap dobara bata sakte hain? (${platformList}?)`;
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
