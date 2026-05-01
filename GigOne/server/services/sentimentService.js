/**
 * @fileoverview Core sentiment analysis service using new @google/genai SDK.
 * Priority: Vertex AI via credential.json → Google AI Studio via GEMINI_API_KEY
 */

const { GoogleGenAI } = require("@google/genai");
const path = require("path");
const fs   = require("fs");
const { validateSentiment } = require("./sentimentValidation");
const AppError = require("../utils/appError");

let ai;
let activeModel;

const VERTEX_MODEL   = "gemini-2.5-flash";
const AISTUDIO_MODEL = "gemini-2.5-flash";

const getClient = () => {
  if (!ai) {
    const keyFilename = path.join(__dirname, "..", "credential.json");

    // 1. Prioritize Vertex AI (GCP Credits) via service account
    if (fs.existsSync(keyFilename)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(keyFilename, "utf8"));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilename;
        ai = new GoogleGenAI({
          vertexai : true,
          project  : credentials.project_id,
          location : "us-central1",
        });
        activeModel = VERTEX_MODEL;
        console.log("Using Vertex AI (GCP Credits) for Gemini —", activeModel);
        return ai;
      } catch (error) {
        console.warn("Vertex AI init failed, falling back to AI Studio:", error.message);
      }
    }

    // 2. Fallback to Google AI Studio (free tier)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
      activeModel = AISTUDIO_MODEL;
      console.log("Using Google AI Studio fallback —", activeModel);
      return ai;
    }

    throw new AppError("Google Cloud credential.json or GEMINI_API_KEY not found.", 500, {
      code: "CONFIG_ERROR",
    });
  }
  return ai;
};

const analyzeMoodText = async (text, { language, sourceStep = "mood" } = {}) => {
  if (!text || text.trim().length < 2) {
    return validateSentiment(null, sourceStep);
  }

  const languageInstruction = language && language !== "English"
    ? `Note: The user's input might be in ${language} or Hinglish.`
    : "";

  const prompt = `
You are a sentiment analysis module for gig worker wellbeing check-ins.
Analyze ONLY the emotional state expressed in the text below.
If the text is gibberish, meaningless nonsense, or lacks any clear emotion, you MUST set "moodLabel" to "invalid".
${languageInstruction}

Text to analyze:
"${text}"

Return ONLY valid JSON with exactly these fields:
{
  "moodLabel": "happy|neutral|tired|stressed|frustrated|excited|invalid",
  "moodScore": <number from -1.0 to 1.0, where -1 is highly negative, 0 is neutral, 1 is positive>,
  "summary": "one short summary sentence of their mood (or reason why invalid)",
  "suggestion": "one short supportive self-care suggestion",
  "confidence": <number from 0.0 to 1.0>
}
  `.trim();

  try {
    const client   = getClient();
    const response = await client.models.generateContent({
      model             : activeModel,
      contents          : prompt,
      generationConfig  : { temperature: 0 },
    });

    let raw = response.candidates[0].content.parts[0].text.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    return validateSentiment(JSON.parse(raw), sourceStep);
  } catch (error) {
    console.warn("Sentiment service generation/parsing error:", error.message);
    return validateSentiment(null, sourceStep);
  }
};

module.exports = { analyzeMoodText };
