/**
 * @fileoverview Step-aware conversational AI engine using GCP Vertex AI.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

let model;

const normalizeLanguageName = (lang) => {
  if (!lang) return "English";
  const l = lang.toLowerCase().trim();
  const map = {
    hin: "Hindi", hindi: "Hindi",
    kan: "Kannada", kannada: "Kannada",
    tel: "Telugu", telugu: "Telugu",
    tam: "Tamil", tamil: "Tamil",
    mal: "Malayalam", malayalam: "Malayalam",
    ben: "Bengali", bengali: "Bengali",
    mar: "Marathi", marathi: "Marathi",
    pun: "Punjabi", punjabi: "Punjabi",
    guj: "Gujarati", gujarati: "Gujarati",
    eng: "English", english: "English",
  };
  return map[l] || l;
};

const getModel = () => {
  if (!model) {
    const keyFilename = path.join(__dirname, "..", "credential.json");
    if (fs.existsSync(keyFilename)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(keyFilename, "utf8"));
        const vertexAI = new VertexAI({
          project: credentials.project_id,
          location: "us-central1",
          keyFilename: keyFilename,
        });
        model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        return model;
      } catch (error) {
        console.warn("Vertex AI initialization failed:", error.message);
      }
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        return model;
      } catch (error) {
        throw new AppError("Failed to initialize Gemini provider", 500, { code: "AI_INIT_ERROR", cause: error });
      }
    }
    throw new AppError("Google Cloud credential.json or GEMINI_API_KEY not found.", 500, { code: "CONFIG_ERROR" });
  }
  return model;
};

const evaluateChatState = (currentStep, newlyExtractedData, existingData) => {
  // 1. Merge data: keep existing values if new ones are null/undefined
  const data = { ...existingData };
  if (newlyExtractedData) {
    Object.keys(newlyExtractedData).forEach(key => {
      if (newlyExtractedData[key] !== null && newlyExtractedData[key] !== undefined) {
        data[key] = newlyExtractedData[key];
      }
    });
  }

  // 2. State Transitions
  if (currentStep === "greeting" || currentStep === "mood") {
    return "ask_platform";
  }

  if (currentStep === "ask_platform" || currentStep === "job") {
    if (!data.platform && !data.job) return "retry_platform";
    return "ask_earnings";
  }

  if (currentStep === "ask_earnings" || currentStep === "earnings") {
    if (data.earnings === null || data.earnings === undefined) return "retry_earnings";
    return "ask_hours";
  }

  if (currentStep === "ask_hours" || currentStep === "hours") {
    if (data.hours === null || data.hours === undefined) return "retry_hours";
    return "complete";
  }

  // Explicitly handle retry states to ensure "retry thing" works as intended
  if (currentStep === "retry_platform") {
    return (data.platform || data.job) ? "ask_earnings" : "retry_platform";
  }
  if (currentStep === "retry_earnings") {
    return (data.earnings !== null && data.earnings !== undefined) ? "ask_hours" : "retry_earnings";
  }
  if (currentStep === "retry_hours") {
    return (data.hours !== null && data.hours !== undefined) ? "complete" : "retry_hours";
  }

  return "complete";
};

const getEmergencyResponse = (type, language) => {
  const fallbacks = {
    greeting: "Hello! How was your work today?",
    ask_platform: "Which job did you work on today?",
    ask_earnings: "How much did you earn today?",
    ask_hours: "How many hours did you work today?",
    retry_platform: "Which job did you work today?",
    retry_earnings: "How much did you earn?",
    retry_hours: "How many hours did you work?",
    complete: "Work logged. See you next shift!",
    default: "Please tell me more."
  };
  return fallbacks[type] || fallbacks.default;
};

const generateConstrainedReply = async (nextState, context = null, language = null) => {
  const normalizedLang = normalizeLanguageName(language);
  let directive = "";

  if (nextState === "greeting") {
    const user = context?.userName || "there";
    directive = `Say exactly: "Hello ${user}! How are you feeling today? I'd love to hear about your day"`;
  } else if (nextState === "ask_platform") {
    const mood = context?.dailyMood?.moodLabel || "neutral";
    const jobs = context?.platforms?.length > 0 ? context.platforms.join(", ") : "your jobs";
    directive = `Respond briefly to the user's mood (${mood}), then ask exactly: "Which job did you work on today? Please choose from: ${jobs}."`;
  } else if (nextState === "ask_earnings") {
    const platform = context?.extractedData?.platform || context?.extractedData?.job || "that job";
    directive = `Say exactly: "Okay you worked on ${platform}. How much did you earn today?"`;
  } else if (nextState === "ask_hours") {
    const platform = context?.extractedData?.platform || context?.extractedData?.job || "that job";
    const earnings = context?.extractedData?.earnings || "that amount";
    directive = `Say exactly: "Okay you earned ${earnings}, how many hours did you work on ${platform}?"`;
  } else if (nextState === "complete") {
    const earnings = context?.extractedData?.earnings || 0;
    const hours = context?.extractedData?.hours || 1;
    const perHour = hours > 0 ? (earnings / hours) : 0;
    const reaction = perHour >= 100 ? "Good to hear." : "Sorry to hear that.";
    
    let forecast = "";
    if (context?.weather?.nextShift) {
        forecast += ` Expect ${context.weather.nextShift.description} for your next shift.`;
    }
    if (context?.traffic) {
        forecast += ` Traffic is predicted to be ${context.traffic.traffic_level}.`;
    }
    
    directive = `Say exactly: "${reaction}${forecast}"`;
  } else if (nextState === "retry_platform") {
    const jobs = context?.platforms?.length > 0 ? context.platforms.join(", ") : "your jobs";
    directive = `Say exactly: "I didn't catch that. Which job did you work on? ${jobs}."`;
  } else if (nextState === "retry_earnings") {
    directive = `Say exactly: "I didn't catch the amount. How much did you earn today?"`;
  } else if (nextState === "retry_hours") {
    directive = `Say exactly: "I didn't catch the hours. How many hours did you work today?"`;
  } else {
    directive = `Say exactly: "Please tell me more."`;
  }

  const prompt = `
Role: AI Companion for gig workers.
Target Language: ${normalizedLang}

Strict Rule: You must translate the following specific 'Directive' into a natural, conversational response in the Target Language (${normalizedLang}). Do NOT add extra information, do NOT ask additional questions, and do NOT hallucinate.

Directive: "${directive}"

Return ONLY the translated conversational text in the Target Language. No quotes, no markdown, no json.
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Constrained generation failed:", error.message);
    return getEmergencyResponse(nextState, language);
  }
};

module.exports = {
  evaluateChatState,
  generateConstrainedReply,
  generateGreeting: (name, ctx, lang) => {
    const updatedContext = { ...ctx, userName: name };
    return generateConstrainedReply("greeting", updatedContext, lang);
  }
};
