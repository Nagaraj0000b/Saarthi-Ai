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
};

// All supported language codes (used as alternatives when a primary is set)
const ALL_LANGUAGE_CODES = ["en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", "ml-IN", "bn-IN", "gu-IN", "mr-IN", "pa-IN"];

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
    // Ensure credential.json exists in the server root
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
    // Check if file exists
    await fs.promises.access(filePath);

    // Read the audio file into memory
    const audioBytes = fs.readFileSync(filePath).toString("base64");

    const audio = {
      content: audioBytes,
    };

    // Resolve the primary language. When a user selects Kannada, kn-IN becomes
    // the primary code — GCP STT strongly biases toward the primary language.
    const primaryCode = resolveBcp47(language);
    const alternatives = ALL_LANGUAGE_CODES.filter((c) => c !== primaryCode);

    // Configuration for Google STT
    const config = {
      // The frontend sends standard webm/ogg/mp4/m4a blobs depending on the browser.
      // WEBM_OPUS or MP3 are common, but leaving encoding blank allows GCP to auto-detect
      // for most standard container formats (like FLAC, WAV, MP3, etc).
      // If the audio is raw PCM, encoding needs to be specified.
      languageCode: primaryCode,
      alternativeLanguageCodes: alternatives,
      enableAutomaticPunctuation: true,
    };

    const request = {
      audio: audio,
      config: config,
    };

    const client = getSpeechClient();
    
    // Perform the transcription request
    const [response] = await client.recognize(request);

    // Extract the transcript from the response
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join("\n");

    if (!transcription) {
      console.warn("[GCP STT] No speech detected in audio file.");
      return "";
    }

    const transcribedText = transcription.trim();

    try {
      // 1. Translate the transcribed text to English meaning for AI context
      const tClient = getTranslateClient();
      const [translation] = await tClient.translate(transcribedText, 'en');
      return {
        originalText: transcribedText, // UI shows Native characters (Hindi/etc)
        translatedText: translation    // AI still gets English meaning for better extraction
      };
    } catch (translateError) {
      console.error("[GCP Translate Error]:", translateError);
      return {
        originalText: transcribedText,
        translatedText: transcribedText
      };
    }

  } catch (error) {
    console.error("[GCP STT Error]:", error);
    
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
