/**
 * @fileoverview Core sentiment analysis service using GCP Vertex AI.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs");
const { validateSentiment } = require("./sentimentValidation");
const AppError = require("../utils/appError");

let model;

const getModel = () => {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
        model: "gemini-2.5-flash",
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

    const response = await result.response;
    let raw = response.candidates[0].content.parts[0].text.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    return validateSentiment(JSON.parse(raw), sourceStep);
  } catch (error) {
    console.warn("Sentiment service generation/parsing error:", error.message);
    return validateSentiment(null, sourceStep);
  }
};

module.exports = { analyzeMoodText };
