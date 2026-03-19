/**
 * @fileoverview Groq Service for high-performance audio-to-text transcription.
 * Utilizes the Whisper-large-v3 model via Groq's LPUs for near-instant latency.
 * 
 * @module server/services/groqService
 * @requires groq-sdk
 * @requires fs
 */

const Groq = require("groq-sdk");
const fs   = require("fs");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribes an audio file into text using OpenAI's Whisper model.
 * 
 * @async
 * @function transcribeAudio
 * @param {string} filePath - Local path to the recorded audio file.
 * @returns {Promise<string>} Transcribed text content.
 */
const transcribeAudio = async (filePath) => {
  try {
    const transcription = await groq.audio.translations.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "text",
      temperature: 0.2, // Low temperature for higher transcription accuracy
    });

    return transcription; 
  } catch (err) {
    console.error("Groq transcription error:", err);
    throw new Error("Failed to transcribe audio.");
  }
};

module.exports = { transcribeAudio };
