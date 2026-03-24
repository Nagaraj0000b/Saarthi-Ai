/**
 * @fileoverview Groq service for high-performance audio-to-text transcription.
 */

const fs = require("fs");
const Groq = require("groq-sdk");
const AppError = require("../utils/appError");
const { requireEnv } = require("../utils/env");

let groqClient;

const getGroqClient = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: requireEnv("GROQ_API_KEY") });
  }

  return groqClient;
};

const transcribeAudio = async (filePath) => {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new AppError("Audio file path is required", 400, { code: "VALIDATION_ERROR" });
  }

  try {
    await fs.promises.access(filePath);

    const transcription = await getGroqClient().audio.translations.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "text",
      temperature: 0.2,
    });

    return typeof transcription === "string" ? transcription.trim() : String(transcription || "").trim();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Audio transcription service is unavailable", 502, {
      code: "TRANSCRIPTION_ERROR",
      expose: false,
      cause: error,
    });
  }
};

module.exports = { transcribeAudio };
