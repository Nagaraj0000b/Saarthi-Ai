/**
 * @fileoverview Step-aware conversational AI engine using GCP Vertex AI.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

let model;

/**
 * Normalizes short language codes (e.g., 'hin', 'kan') to full names for Gemini.
 */
const normalizeLanguageName = (lang) => {
  if (!lang) return "Hindi";
  const l = lang.toLowerCase().trim();
  const map = {
    hin: "Hindi",
    hindi: "Hindi",
    kan: "Kannada",
    kannada: "Kannada",
    tel: "Telugu",
    telugu: "Telugu",
    tam: "Tamil",
    tamil: "Tamil",
    mal: "Malayalam",
    malayalam: "Malayalam",
    ben: "Bengali",
    bengali: "Bengali",
    mar: "Marathi",
    marathi: "Marathi",
    pun: "Punjabi",
    punjabi: "Punjabi",
    guj: "Gujarati",
    gujarati: "Gujarati",
    eng: "English",
    english: "English",
  };
  return map[l] || l;
};

const getModel = () => {
  if (!model) {
    const keyFilename = path.join(__dirname, "..", "credential.json");
    
    // 1. Prioritize Vertex AI (Uses GCP Credits/Project Billing)
    if (fs.existsSync(keyFilename)) {
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
        console.log("Using Vertex AI (GCP Credits) for Gemini");
        return model;
      } catch (error) {
        console.warn("Vertex AI initialization failed, attempting API Key backup:", error.message);
      }
    }

    // 2. Fallback to Google AI SDK (Free Tier)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        console.log("Using Google AI SDK (Free Tier) for Gemini");
        return model;
      } catch (error) {
        throw new AppError("Failed to initialize any Gemini provider", 500, {
          code: "AI_INIT_ERROR",
          cause: error,
        });
      }
    }

    throw new AppError("Google Cloud credential.json or GEMINI_API_KEY not found.", 500, {
      code: "CONFIG_ERROR",
    });
  }

  return model;
};

const STEP_CONFIG = {
  greeting: {
    goal: "Greet the user nicely. Ask how their day was and if any problems occurred.",
    nextStep: "mood",
    extract: null,
  },
  mood: {
    goal: "Acknowledge the user's mood gently. Ask which job they worked on today.",
    nextStep: "job",
    extract: null,
  },
  job: {
    goal: "Acknowledge the job they worked on nicely. Ask for today's total earnings.",
    nextStep: "earnings",
    extract: "job",
  },
  earnings: {
    goal: "Acknowledge the earnings amount nicely. Ask for the total hours worked today.",
    nextStep: "hours",
    extract: "earnings",
  },
  hours: {
    goal: "Complete the conversation gently. React to hours worked. Provide a short summary of the whole conversation. Warn them about weather/traffic for their next shift. End with motivation.",
    nextStep: "done",
    extract: "hours",
  },
};

/**
 * Simple emergency responses if AI quota is hit.
 */
const getEmergencyResponse = (type, language) => {
  const normalized = normalizeLanguageName(language);
  const isEnglish = normalized === "English";

  const fallbacks = {
    greeting: isEnglish ? "Hello! How was your work today?" : "Namaste! Aaj ka kaam kaisa raha?",
    retry: isEnglish ? "Sorry, a small glitch. Can you repeat that?" : "Maaf kijiye, thoda glitch hai. Kya aap dobara bol sakte hain?",
    end: isEnglish ? "Work logged. See you next shift!" : "Kaam log ho gaya hai. Agli shift par milte hain!",
    default: isEnglish ? "I'm here, but feeling a bit slow. Tell me more." : "Main yahan hoon, par thoda slow hoon. Aur bataiye."
  };

  return fallbacks[type] || fallbacks.default;
};

const generateGreeting = async (userName = "buddy", context = null, language = null) => {
  const normalizedLang = normalizeLanguageName(language);
  
  const prompt = `
Role: You are "AI Companion", a supportive friend for Indian gig workers.
Goal: Greet ${userName} nicely in ${normalizedLang || "Hindi"} using its native script characters. Ask how their work day was and if they faced any problems.

Rules:
- Respond in ${normalizedLang || "Hindi"} using its Native language script.
- Use casual local languages.
- 1-2 short sentences. No emojis.
- DO NOT mention weather or traffic here. Only focus on greeting and asking about their day.
- Return ONLY the native language text.
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("AI Greeting failed (Quota?):", error.message);
    return getEmergencyResponse("greeting", language);
  }
};

const processChatTurn = async (
  currentStep,
  userText,
  recentMessages = [],
  context = null,
  language = null
) => {
  const normalizedLang = normalizeLanguageName(language);
  const stepConfig = STEP_CONFIG[currentStep];
  
  if (!stepConfig) {
    const prompt = `
Role: You are "AI Companion", a supportive friend.
Goal: Remind the user that today's check-in is already completed.
Target Language: ${normalizedLang || "Hindi"}

Rules:
- Respond in ${normalizedLang || "Hindi"} using its Native language script.
- 1-2 short sentences. No emojis.
- Return ONLY the native language text.
    `.trim();

    try {
      const result = await getModel().generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const response = await result.response;
      return {
        reply: response.candidates[0].content.parts[0].text.trim(),
        extractedValue: null,
      };
    } catch (error) {
      console.error("AI Generation failed in completion step:", error.message);
      const fallback = await generateEndMessage(language);
      return {
        reply: fallback,
        extractedValue: null,
      };
    }
  }

  const historyBlock = recentMessages
    .slice(-6)
    .map((message) => `${message.role === "user" ? "Worker" : "Assistant"}: ${message.text}`)
    .join("\n");

  let contextBlock = "";
  
  // ONLY provide weather and traffic data at the FINAL step (hours)
  if (currentStep === "hours") {
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
      contextBlock += `\nNext Shift Traffic: ${traffic.traffic_level} (${traffic.congestion_percent}% congestion predicted).`;
    }
  }

  if (context?.platforms && context.platforms.length > 0) {
    contextBlock += `\nWorker's platforms: ${context.platforms.join(", ")}.`;
  }
  
  if (context?.skills && context.skills.length > 0) {
    contextBlock += `\nWorker's skill sets: ${context.skills.join(", ")}.`;
  }

  const prompt = `
Role: You are "AI Companion", a supportive friend for Indian gig workers.
Goal: ${stepConfig.goal}

Instructions:
- Speak naturally like a real person in ${normalizedLang || "Hindi"}. 
- Use casual, local slangs. Avoid formal translations.
- Keep responses short (1-2 sentences).
- ONLY talk about weather or traffic if the info is provided in the Context below. If not provided, DO NOT mention them.

Context:
${contextBlock}
${historyBlock}

Worker said (in native script): "${userText}"

Rules:
- Respond in ${normalizedLang || "Hindi"} using its Native language script.
- Use casual local languages.
- 1-2 short sentences. No emojis.
- Talk about weather and traffic naturally like a friend ONLY if data is in Context.
- NEVER just spit out raw temperature (degrees) or time. Talk about the "feeling" (heat, rain, congestion).

STRICT OUTPUT RULES (JSON ONLY):
- "reply": MUST be in native script characters only. NO English/Roman script.
- Return ONLY valid JSON.

Return ONLY a JSON object:
{
  "reply": "Native script response here",
  "extractedValue": <extracted ${stepConfig.extract || "null"} or null>
}
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    raw = response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("AI Chat Turn failed (Quota?):", error.message);
    return {
      reply: getEmergencyResponse("default", language),
      extractedValue: null,
    };
  }

  raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(raw);

    if (currentStep === "job" && parsed.extractedValue) {
      const normalized =
        String(parsed.extractedValue).charAt(0).toUpperCase() +
        String(parsed.extractedValue).slice(1).toLowerCase();
      
      const userPlatforms = context?.platforms || [];
      const validPlatforms = userPlatforms.length > 0 ? [...userPlatforms, "Other"] : ["Uber", "Swiggy", "Rapido", "Other"];

      if (!validPlatforms.some(p => p.toLowerCase() === normalized.toLowerCase())) {
        parsed.extractedValue = null;
        const platformList = validPlatforms.join(", ");
        const isEnglish = !normalizedLang || normalizedLang === "English";
        parsed.reply = isEnglish
          ? `I didn't quite catch which job you worked on. Could you say it again? (Maybe one of these: ${platformList}?)`
          : `Main theek se samajh nahi paaya ki aapne aaj kis job par kaam kiya. Kya aap dobara bata sakte hain? (${platformList}?)`;
      } else {
        parsed.extractedValue = normalized;
      }
    }

    return parsed;
  } catch (error) {
    console.warn("AI chat turn returned invalid JSON. Falling back to retry prompt.");
    const fallback = await generateRetryMessage(language);
    return {
      reply: fallback, 
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

const generateRetryMessage = async (language = "Hindi") => {
  const normalizedLang = normalizeLanguageName(language);
  const prompt = `
Role: You are "AI Companion", a supportive friend.
Goal: Gently tell the user that there was a small technical glitch or you didn't hear them properly. Ask them to repeat their last sentence nicely so you can continue the session.
Target Language: ${normalizedLang}

Rules:
- Respond in ${normalizedLang} using its Native language script.
- Use casual local languages.
- 1 short sentence. No emojis.
- Return ONLY the native text.
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("AI Retry Message failed (Quota?):", error.message);
    return getEmergencyResponse("retry", language);
  }
};

const generateEndMessage = async (language = "Hindi") => {
  const normalizedLang = normalizeLanguageName(language);
  const prompt = `
Role: You are "AI Companion", a supportive friend.
Goal: Nicely tell the user that today's work is logged and the session is complete. Wish them luck and tell them to come back for the next shift.
Target Language: ${normalizedLang}

Rules:
- Respond in ${normalizedLang} using its Native language script.
- Use casual local languages.
- 1-2 short sentences. No emojis.
- Return ONLY the native text.
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("AI End Message failed (Quota?):", error.message);
    return getEmergencyResponse("end", language);
  }
};

module.exports = { generateGreeting, processChatTurn, getNextStep, STEP_CONFIG, generateRetryMessage, generateEndMessage };
