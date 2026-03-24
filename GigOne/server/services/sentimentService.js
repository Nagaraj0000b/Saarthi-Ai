/**
 * @fileoverview Core sentiment analysis service.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateSentiment } = require("./sentimentValidation");
const AppError = require("../utils/appError");

let model;

const getModel = () => {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError("Sentiment model is not configured", 500, {
        code: "CONFIG_MISSING",
        expose: false,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  return model;
};

const analyzeMoodText = async (text, { language, sourceStep = "mood" } = {}) => {
  if (!text || text.trim().length < 2) {
    return validateSentiment(null, sourceStep);
  }

  const languageInstruction =
    language && language !== "English"
      ? `Note: The user's input might be in ${language} or Hinglish.`
      : "";

  const prompt = `
You are a sentiment analysis module for gig worker wellbeing check-ins.
Analyze ONLY the emotional state expressed in the text below.
${languageInstruction}

Text to analyze:
"${text}"

Return ONLY valid JSON with exactly these fields:
{
  "moodLabel": "happy|neutral|tired|stressed|frustrated|excited",
  "moodScore": <number from -1.0 to 1.0, where -1 is highly negative, 0 is neutral, 1 is positive>,
  "summary": "one short summary sentence of their mood",
  "suggestion": "one short supportive self-care suggestion",
  "confidence": <number from 0.0 to 1.0>
}
  `.trim();

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
      },
    });

    let raw = result.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    return validateSentiment(JSON.parse(raw), sourceStep);
  } catch (error) {
    console.warn("Sentiment service generation/parsing error:", error.message);
    return validateSentiment(null, sourceStep);
  }
};

module.exports = { analyzeMoodText };
