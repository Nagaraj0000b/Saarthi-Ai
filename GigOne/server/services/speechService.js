/**
 * @fileoverview Google Cloud Speech service for audio-to-text transcription.
 * Replaces the previous Groq Whisper implementation.
 */

const fs = require("fs");
const path = require("path");
const speech = require("@google-cloud/speech");
const { Translate } = require("@google-cloud/translate").v2;
const AppError = require("../utils/appError");

// Maps frontend language names → BCP-47 codes for GCP STT
// Synchronized with the Android UI (14 languages)
const LANGUAGE_TO_BCP47 = {
  kannada: "kn-IN",
  hindi: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  malayalam: "ml-IN",
  bengali: "bn-IN",
  gujarati: "gu-IN",
  marathi: "mr-IN",
  punjabi: "pa-IN",
  english: "en-IN",
  urdu: "ur-IN",
  odia: "or-IN",
  assamese: "as-IN",
  bhojpuri: "hi-IN", // Fallback to Hindi for STT
};

// All supported language codes
const ALL_LANGUAGE_CODES = [
  "en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", 
  "ml-IN", "bn-IN", "gu-IN", "mr-IN", "pa-IN",
  "ur-IN", "or-IN", "as-IN"
];

/**
 * Resolves the BCP-47 language code from a frontend language name string.
 * Falls back to "en-IN" if unknown.
 */
const resolveBcp47 = (language) => {
  if (!language) return "en-IN";
  const key = language.trim().toLowerCase();
  return LANGUAGE_TO_BCP47[key] || "en-IN";
};

let speechClient;
let translateClient;

const getSpeechClient = () => {
  if (!speechClient) {
    const keyFilename = path.join(__dirname, "..", "credential.json");
    if (!fs.existsSync(keyFilename)) {
      throw new AppError("Google Cloud credential.json not found in server root.", 500, {
        code: "CONFIG_ERROR",
      });
    }
    speechClient = new speech.SpeechClient({ keyFilename });
  }
  return speechClient;
};

const getTranslateClient = () => {
  if (!translateClient) {
    const keyFilename = path.join(__dirname, "..", "credential.json");
    if (!fs.existsSync(keyFilename)) {
      throw new AppError("Google Cloud credential.json not found in server root.", 500, {
        code: "CONFIG_ERROR",
      });
    }
    translateClient = new Translate({ keyFilename });
  }
  return translateClient;
};

/**
 * Transcribes a local audio file using Google Cloud Speech-to-Text and translates to English.
 * @param {string} filePath - The absolute path to the audio file.
 * @returns {Promise<Object>} The transcribed and translated text.
 */
const transcribeAudio = async (filePath, language = null) => {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new AppError("Audio file path is required", 400, { code: "VALIDATION_ERROR" });
  }

  try {
    await fs.promises.access(filePath);
    const audioBytes = fs.readFileSync(filePath).toString("base64");

    const audio = { content: audioBytes };

    const primaryCode = resolveBcp47(language);
    // Limit alternatives to prevent confusion, prioritize Hindi for Indian accents
    const alternatives = ["hi-IN", "en-IN"].filter(c => c !== primaryCode);

    const defaultHints = [
      "Earnings", "Earnings today", "Shift", "Rupees", "Hours",
      "Worked for", "I made", "My earnings", "today's earnings",
      "done for the day", "feeling good", "feeling tired"
    ];

    const config = {
      languageCode: primaryCode,
      alternativeLanguageCodes: alternatives,
      enableAutomaticPunctuation: true,
      model: "latest_short", // Optimized for short conversational bursts
      useEnhanced: true,
      speechContexts: [{
        phrases: defaultHints,
        boost: 20.0 // Give high priority to gig-work vocabulary
      }]
    };

    const request = { audio, config };
    const client = getSpeechClient();
    const [response] = await client.recognize(request);

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join("\n");

    if (!transcription) {
      console.warn("[GCP STT] No speech detected.");
      return { originalText: "", translatedText: "" };
    }

    const transcribedText = transcription.trim();

    try {
      // If the result is already English, don't waste units translating
      if (primaryCode === "en-IN") {
          return { originalText: transcribedText, translatedText: transcribedText };
      }

      const tClient = getTranslateClient();
      const [translation] = await tClient.translate(transcribedText, 'en');
      return {
        originalText: transcribedText,
        translatedText: translation
      };
    } catch (translateError) {
      return { originalText: transcribedText, translatedText: transcribedText };
    }

  } catch (error) {
    console.error("[GCP STT Error]:", error);
    throw new AppError("Transcription failed", 502, { code: "TRANSCRIPTION_ERROR", cause: error });
  }
};

module.exports = { transcribeAudio };
