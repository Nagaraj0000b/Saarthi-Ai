/**
 * @fileoverview Gemini AI service for standalone natural language processing tasks.
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
    const result = await getModel().generateContent(prompt);
    cleaned = result.response.text().trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
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
