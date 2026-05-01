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

// ---------------------------------------------------------------------------
// Eager‑init: Load Vertex AI client once when the module is required.
// Fail fast if the service‑account credentials are missing – we do NOT fall back to
// AI Studio because you explicitly want to use Vertex AI only.
// ---------------------------------------------------------------------------
const VERTEX_MODEL = "gemini-2.5-flash";

(() => {
  const keyFilename = path.join(__dirname, "..", "credential.json");
  if (!fs.existsSync(keyFilename)) {
    throw new AppError(
      "Vertex AI credential.json not found – cannot initialise Gemini client.",
      500,
      { code: "CONFIG_ERROR" }
    );
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
    console.log("Using Vertex AI (GCP Credits) for Gemini —", activeModel);
  } catch (err) {
    throw new AppError(
      `Failed to initialise Vertex AI client: ${err.message}`,
      500,
      { code: "INIT_ERROR" }
    );
  }
})();

// Helper to keep prompts short – prevents the model from hallucinating on huge context.
const MAX_PROMPT_LENGTH = 1500; // characters
const trimPrompt = (p) =>
  typeof p === "string" && p.length > MAX_PROMPT_LENGTH
    ? p.slice(0, MAX_PROMPT_LENGTH) + " ... (truncated)"
    : p;

const generateText = async (prompt) => {
  const client = ai; // client is guaranteed to exist after module load
  const safePrompt = trimPrompt(prompt);
    const response = await client.models.generateContent({
      model: activeModel,
      contents: safePrompt,
      generationConfig: { maxOutputTokens: 500 },
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
    - If any field cannot be confidently determined, set it to null.
    - Return ONLY JSON without any surrounding text, markdown fences, or explanations.

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

const extractGigData = async (transcript, translatedTranscript, validPlatforms = []) => {
  const sourceTranscript = typeof transcript === "string" ? transcript.trim() : "";
  const englishTranscript = typeof translatedTranscript === "string" ? translatedTranscript.trim() : "";

  if (!sourceTranscript && !englishTranscript) {
    return { platform: null, earnings: null, hours: null, sentiment: null };
  }

  // Context for the AI about known platforms – kept to guide the model.
  const platformsContext = validPlatforms.length > 0
    ? `Allowed platforms: [${validPlatforms.join(", ")}]. This list is exhaustive. For the platform field, you must return exactly one platform copied from this list or null.`
    : `Look for common gig platforms like Uber, Ola, Swiggy, Zomato, Rapido, Amazon Flex, etc.`;

  const prompt = `
Extract gig work details from the user's message.

Original transcript: "${sourceTranscript || englishTranscript}"
English translation: "${englishTranscript || sourceTranscript}"

Rules:
1. Identify the platform (job/app). ${platformsContext}
2. Identify earnings (money earned).
3. Identify hours worked.
4. Identify sentiment.
5. Prefer the English translation when the original transcript looks phonetically noisy, but use both texts together.
6. If the spoken or translated text sounds like one allowed platform, normalize it to that exact allowed platform name.
7. Never invent a new platform, never return a misspelled platform, and never return a platform that is not in the allowed list.
8. The platform value must exactly match one of the allowed platforms, including spelling and spacing.

- If any field cannot be determined, set its value to null.
- Return ONLY JSON without any extra text or markdown.

Return ONLY JSON:
{
  "platform": "string or null",
  "earnings": "number or null",
  "hours": "number or null",
  "sentiment": "positive|neutral|negative or null"
}
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
