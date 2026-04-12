/**
 * @fileoverview Gemini AI service for standalone natural language processing tasks using GCP Vertex AI.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

let model;

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
          model: "gemini-2.5-flash",
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
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    cleaned = response.candidates[0].content.parts[0].text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } catch (error) {
    throw new AppError("Sentiment analysis is temporarily unavailable", 502, {
      code: "AI_SERVICE_ERROR",
      expose: false,
      cause: error,
    });
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new AppError("Sentiment analysis returned invalid data", 502, {
      code: "AI_INVALID_RESPONSE",
      expose: false,
      cause: error,
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
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    cleaned = response.candidates[0].content.parts[0].text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } catch (error) {
    console.error("Gig Data Extraction failed:", error.message);
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }

  try {
    const parsed = JSON.parse(cleaned);
    
    // Robust number parsing for earnings and hours
    const parseNum = (val) => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    return {
      platform: parsed.platform || null,
      earnings: parseNum(parsed.earnings),
      hours: parseNum(parsed.hours),
      sentiment: parsed.sentiment || null,
    };
  } catch (error) {
    console.error("Failed to parse Gig Data JSON:", error.message);
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }
};

module.exports = { analyzeSentiment, extractGigData };
