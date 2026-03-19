/**
 * @fileoverview Gemini AI Service for standalone natural language processing tasks.
 * Primarily handles granular sentiment analysis and emotional intelligence logic.
 * 
 * @module server/services/geminiService
 * @requires @google/generative-ai
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

/**
 * Analyzes the sentiment and emotional state of a worker's input.
 * 
 * @async
 * @function analyzeSentiment
 * @param {string} text - The natural language input from the worker.
 * @returns {Promise<Object>} Structured sentiment data (mood, score, summary, suggestion).
 */
const analyzeSentiment = async (text) => {
  const prompt = `
You are an emotional intelligence engine for a gig worker companion app.
Analyze the following text and return a JSON object with:
1. "mood" (happy|neutral|stressed|frustrated|tired|excited)
2. "score" (-1.0 to 1.0)
3. "summary" (1 sentence)
4. "suggestion" (1 actionable tip)

Text: "${text}"
  `;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
};

module.exports = { analyzeSentiment };
