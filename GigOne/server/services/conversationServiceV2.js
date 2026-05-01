/**
 * @fileoverview Enhanced conversational AI engine.
 * Priority: Vertex AI via credential.json → Google AI Studio via GEMINI_API_KEY
 */

const { GoogleGenAI } = require("@google/genai");
const path = require("path");
const fs   = require("fs");
const AppError = require("../utils/appError");

let ai;
let activeModel;

const VERTEX_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 1500;

(() => {
  const keyFilename = path.join(__dirname, "..", "credential.json");
  if (!fs.existsSync(keyFilename)) {
    throw new AppError("Vertex AI credential.json not found", 500, {
      code: "CONFIG_ERROR",
    });
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(keyFilename, "utf8"));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilename;
    ai = new GoogleGenAI({
      vertexai: true,
      project: credentials.project_id,
      location: "us-central1",
    });
    activeModel = VERTEX_MODEL;
    console.log("Using Vertex AI (GCP) for chat replies -", activeModel);
  } catch (error) {
    throw new AppError(`Failed to initialise Vertex AI client: ${error.message}`, 500, {
      code: "INIT_ERROR",
    });
  }
})();

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
    urd: "Urdu", urdu: "Urdu",
    odi: "Odia", odia: "Odia",
    ass: "Assamese", assamese: "Assamese",
    bho: "Bhojpuri", bhojpuri: "Bhojpuri",
    eng: "English", english: "English",
  };
  return map[l] || l.charAt(0).toUpperCase() + l.slice(1);
};

const trimPrompt = (prompt) =>
  typeof prompt === "string" && prompt.length > MAX_PROMPT_LENGTH
    ? prompt.slice(0, MAX_PROMPT_LENGTH) + " ... (truncated)"
    : prompt;

const generateText = async (prompt) => {
  const client = ai;
  const response = await client.models.generateContent({
    model: activeModel,
    contents: trimPrompt(prompt),
    generationConfig: { maxOutputTokens: 180 },
  });
  return response.candidates[0].content.parts[0].text.trim();
};

const getEmergencyResponse = (type, language) => {
  const fallbacks = {
    hindi: {
      greeting: "नमस्ते! आज आपका दिन कैसा रहा?",
      retry   : "क्षमा करें, मैंने सुना नहीं। आप क्या कह रहे थे?",
      default : "कृपया मुझे और बताएं।"
    },
    english: {
      greeting: "Hello! How was your work today?",
      retry   : "Sorry, I didn't catch that. Could you please repeat?",
      default : "Please tell me more."
    }
  };
  const lang = (language || "english").toLowerCase();
  const set  = fallbacks[lang] || fallbacks.english;
  return set[type] || set.default;
};

const generateConstrainedReply = async (nextState, context = null, language = null) => {
  const normalizedLang = normalizeLanguageName(language);
  let goal = "";

  const userName = context?.userName
    ? (normalizedLang === "Hindi" ? `${context.userName} जी` : context.userName)
    : "";

  if (nextState === "greeting") {
    goal = `Greet the user ${userName} politely in ${normalizedLang}. Ask how their day was and how they are feeling after their shift.`;
  } else if (nextState === "default" || nextState === "retry") {
    goal = `The user's response was unclear. Politely ask them in ${normalizedLang} to repeat what they said.`;
  } else if (nextState === "ask_platform" || nextState === "retry_platform") {
    const mood    = context?.dailyMood?.moodLabel || "neutral";
    const jobs    = context?.platforms?.length > 0 ? context.platforms.join(", ") : "platforms";
    const isRetry = nextState.includes("retry");
    goal = isRetry
      ? `The platform was not clear. Ask them in ${normalizedLang} to choose from: ${jobs}.`
      : `Acknowledge their mood (${mood}) respectfully in ${normalizedLang}. Ask which platform they worked on: ${jobs}.`;
  } else if (nextState === "ask_earnings" || nextState === "retry_earnings") {
    const platform = context?.extractedData?.platform || context?.extractedData?.job || "platform";
    const isRetry  = nextState.includes("retry");
    goal = isRetry
      ? `The earnings amount was unclear. Ask again in ${normalizedLang} for the total amount earned on ${platform}.`
      : `Ask in ${normalizedLang} for the total earnings for today's ${platform} shift.`;
  } else if (nextState === "ask_hours" || nextState === "retry_hours") {
    const platform = context?.extractedData?.platform || context?.extractedData?.job || "platform";
    const earnings = context?.extractedData?.earnings || "amount";
    const isRetry  = nextState.includes("retry");
    goal = isRetry
      ? `The hours were unclear. Ask again in ${normalizedLang} for the total hours worked on ${platform}.`
      : `Confirm the earnings (${earnings}) in ${normalizedLang}. Ask for the total hours worked on ${platform} today.`;
  } else if (nextState === "complete") {
    let extra = "";
    if (context?.weather?.nextShift) extra += ` Mention that the weather forecast for the next shift is ${context.weather.nextShift.description}.`;
    if (context?.traffic)            extra += ` Mention that traffic is ${context.traffic.traffic_level}.`;
    goal = `The check-in is done. Give a polite closing remark in ${normalizedLang}.${extra} Wish them a good rest.`;
  } else {
    goal = `Acknowledge them and ask for more details in ${normalizedLang} about their work day.`;
  }

  const userNameLine = userName && nextState === "greeting" ? `\nUser Name: ${userName}` : "";

  const prompt = `
Role: You are a professional but natural AI assistant for gig workers.
Target Language: ${normalizedLang}${userNameLine}
Goal: ${goal}

Instructions:
1. Output MUST be strictly in ${normalizedLang}. This is mandatory.
2. Tone: Respectful and Professional, but SIMPLE and NATURAL. Talk like a helpful, polite colleague.
3. Vocabulary: Use common, everyday words appropriate for ${normalizedLang}. 
4. If the language is Hindi or Hinglish: Avoid overly formal textbook words like "महोदय", "महोदया", "अर्जित", "दस्तावेज़ीकरण". Use natural Hinglish words like "shift", "earnings", "hours" if they sound better.
5. Respect: Use appropriate respectful address (e.g., "Aap" in Hindi) instead of casual ones.
6. Do NOT use titles like "Sir/Madam" unless it's culturally required in the target language.
7. Be concise. One or two short sentences only.
8. NEVER start your response with a greeting (like Hello, Namaste, etc.) or a name unless the Goal explicitly asks you to.

Response in ${normalizedLang}:
  `.trim();

  try {
    console.log("Generating AI reply for state:", nextState, "language:", normalizedLang);
    const text = await generateText(prompt);
    console.log("AI Reply Success:", text);
    return text;
  } catch (error) {
    console.error("Constrained generation failed:", error.message);
    return getEmergencyResponse(nextState.includes("greeting") ? "greeting" : "retry", language);
  }
};

module.exports = {
  generateConstrainedReply,
  generateGreeting: (name, ctx, lang) => {
    const updatedContext = { ...ctx, userName: name };
    return generateConstrainedReply("greeting", updatedContext, lang);
  }
};
