const express = require("express");
const protect = require("../middleware/auth");
const { synthesizeSpeech } = require("../services/ttsService");
const AppError = require("../utils/appError");

const router = express.Router();

/**
 * @route   POST /api/tts
 * @desc    Convert text to speech audio (MP3)
 * @access  Private
 */
router.post("/", protect, async (req, res, next) => {
  try {
    const { text, language } = req.body;

    if (!text) {
      return next(new AppError("Text is required", 400));
    }

    const audioBuffer = await synthesizeSpeech(text, language);
    
    // Google Cloud TTS returns a Uint8Array. Convert it to a proper Node Buffer.
    const buffer = Buffer.from(audioBuffer);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "no-store", // Don't let browsers cache personalized TTS
    });

    res.status(200).end(buffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
