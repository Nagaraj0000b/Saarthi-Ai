/**
 * @fileoverview Gemini AI service using new @google/genai SDK.
 * Priority: Vertex AI via credential.json → Google AI Studio via GEMINI_API_KEY
 */

const { GoogleGenAI } = require("@google/genai");
const path = require("path");
const fs   = require("fs");
const AppError = require("../utils/appError");

let ai;
let activeModel;

const VERTEX_MODEL   = "gemini-2.5-flash";
const AISTUDIO_MODEL = "google/gemma-4-31b-it";

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

const generateText = async (prompt) => {
  const client = getClient();
  const response = await client.models.generateContent({
    model   : activeModel,
    contents: prompt,
  });
  return response.candidates[0].content.parts[0].text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");
};

const analyzeSentiment = async (text) => {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new AppError("text is required", 400, { code: "VALIDATION_ERROR" });
  }

  const prompt = `
You are an emotional intelligence engine for a gig worker companion app.
Analyze the following text and return a JSON object with:
1. "mood" (happy|neutral|stressed|frustrated|tired|excited)
2. "score" (-1.0 to 1.0)
3. "summary" (1 sentence)
4. "suggestion" (1 actionable tip)

Text: "${text}"
  `.trim();

  let cleaned;
  try {
    cleaned = await generateText(prompt);
  } catch (error) {
    throw new AppError("Sentiment analysis is temporarily unavailable", 502, {
      code   : "AI_SERVICE_ERROR",
      expose : false,
      cause  : error,
    });
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new AppError("Sentiment analysis returned invalid data", 502, {
      code   : "AI_INVALID_RESPONSE",
      expose : false,
      cause  : error,
    });
  }
};

const extractGigData = async (transcript, validPlatforms = []) => {
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }

  const platformsContext = validPlatforms.length > 0
    ? `The user's known platforms are: ${validPlatforms.join(", ")}. If the user mentions something that sounds like one of these (e.g. "बोला" sounds like "Ola"), map it exactly to the registered name.`
    : `Look for common gig platforms like Uber, Ola, Swiggy, Zomato, Rapido, Amazon Flex, etc.`;

  const prompt = `
Extract gig work details from this transcript: "${transcript}"

Rules:
1. Identify the platform (job/app). ${platformsContext}
2. Identify earnings (money earned).
3. Identify hours worked.
4. Identify sentiment.

Return ONLY JSON:
{
  "platform": "string or null",
  "earnings": "number or null",
  "hours": "number or null",
  "sentiment": "positive|neutral|negative or null"
}

Note: Be extremely flexible with phonetic variations in Hinglish. 
- "बोला पे" or "बोला" -> "Ola"
- "ऊबर" or "उबर" -> "Uber"
- "स्विग्गी" -> "Swiggy"
- If they say "I did some swiggy today", platform is "Swiggy". 
- If they say "made 500 on uber", platform is "Uber", earnings is 500.
  `.trim();

  let cleaned;
  try {
    cleaned = await generateText(prompt);
  } catch (error) {
    console.error("Gig Data Extraction failed:", error.message);
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }

  try {
    const parsed = JSON.parse(cleaned);
    const parseNum = (val) => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };
    return {
      platform  : parsed.platform || null,
      earnings  : parseNum(parsed.earnings),
      hours     : parseNum(parsed.hours),
      sentiment : parsed.sentiment || null,
    };
  } catch (error) {
    console.error("Failed to parse Gig Data JSON:", error.message);
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }
};

module.exports = { analyzeSentiment, extractGigData };
