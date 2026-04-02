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

module.exports = { analyzeSentiment };
