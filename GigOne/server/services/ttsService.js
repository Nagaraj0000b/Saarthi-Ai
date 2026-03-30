/**
 * @fileoverview Google Cloud Text-to-Speech service.
 * Replaces the standalone `openai-edge-tts` python server.
 */

const textToSpeech = require("@google-cloud/text-to-speech");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

let ttsClient;

const getTtsClient = () => {
  if (!ttsClient) {
    const keyFilename = path.join(__dirname, "..", "credential.json");
    if (!fs.existsSync(keyFilename)) {
      throw new AppError("Google Cloud credential.json not found in server root.", 500, {
        code: "CONFIG_ERROR",
      });
    }
    ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename });
  }
  return ttsClient;
};

/**
 * Normalizes short language codes (e.g., 'hin', 'kan') to full names.
 */
const normalizeLanguageName = (lang) => {
  if (!lang) return "English";
  const l = lang.toLowerCase().trim();
  const map = {
    hin: "Hindi",
    hindi: "Hindi",
    kan: "Kannada",
    kannada: "Kannada",
    tel: "Telugu",
    telugu: "Telugu",
    tam: "Tamil",
    tamil: "Tamil",
    mal: "Malayalam",
    malayalam: "Malayalam",
    ben: "Bengali",
    bengali: "Bengali",
    mar: "Marathi",
    marathi: "Marathi",
    pun: "Punjabi",
    punjabi: "Punjabi",
    guj: "Gujarati",
    gujarati: "Gujarati",
    eng: "English",
    english: "English",
  };
  return map[l] || l;
};

/**
 * Maps our internal language names to Google Cloud Premium/Wavenet voice names.
 * These handle transliterated/phonetic text much better than Standard voices.
 */
const getVoiceConfig = (languageName) => {
  const norm = normalizeLanguageName(languageName);
  
  const languageMap = {
    English:   { languageCode: "en-IN", name: "en-IN-Wavenet-B" },
    Hindi:     { languageCode: "hi-IN", name: "hi-IN-Wavenet-B" },
    Tamil:     { languageCode: "ta-IN", name: "ta-IN-Wavenet-B" },
    Telugu:    { languageCode: "te-IN", name: "te-IN-Standard-A" }, // No Wavenet B for Telugu, keeping Standard A
    Kannada:   { languageCode: "kn-IN", name: "kn-IN-Wavenet-A" },
    Malayalam: { languageCode: "ml-IN", name: "ml-IN-Standard-B" },
    Marathi:   { languageCode: "mr-IN", name: "mr-IN-Wavenet-A" },
    Bengali:   { languageCode: "bn-IN", name: "bn-IN-Wavenet-A" },
    Gujarati:  { languageCode: "gu-IN", name: "gu-IN-Wavenet-A" },
  };

  return languageMap[norm] || { languageCode: "en-IN", name: "en-IN-Wavenet-B" };
};

/**
 * Synthesizes text into speech audio.
 * @param {string} text - The text to synthesize.
 * @param {string} [language="English"] - The language name (e.g., "Hindi", "Tamil").
 * @returns {Promise<Buffer>} The synthesized MP3 audio as a Buffer.
 */
const synthesizeSpeech = async (text, language = "English") => {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new AppError("Text is required for synthesis", 400, { code: "VALIDATION_ERROR" });
  }

  const voiceConfig = getVoiceConfig(language);

  // Using SSML (Speech Synthesis Markup Language) tells Google TTS that the 
  // transliterated English text should be pronounced in the target language.
  const ssml = `<speak><lang xml:lang="${voiceConfig.languageCode}">${text}</lang></speak>`;

  const request = {
    input: { ssml },
    voice: voiceConfig,
    audioConfig: { 
      audioEncoding: "MP3",
      speakingRate: 1.15, // Keep slightly faster for conversational feel
      pitch: 0,
    },
  };

  try {
    const client = getTtsClient();
    const [response] = await client.synthesizeSpeech(request);
    
    return response.audioContent;
  } catch (error) {
    console.error("[GCP TTS Error]:", error);
    
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Text-to-speech service is unavailable", 502, {
      code: "TTS_ERROR",
      expose: false,
      cause: error,
    });
  }
};

module.exports = { synthesizeSpeech };
