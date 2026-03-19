/**
 * @fileoverview Conversational AI Routes for the Gigi companion.
 * Manages session initialization and multimodal (audio/text) interaction turns.
 * 
 * @module server/routes/chat
 * @requires express
 * @requires multer
 * @requires ../middleware/auth
 * @requires ../controllers/chatController
 */

const router  = require("express").Router();
const multer  = require("multer");
const auth    = require("../middleware/auth");
const { transcribe, getContext, startChat, reply, replyText, getBurnoutStatus } = require("../controllers/chatController");

/**
 * Multer Storage Configuration
 * Temporarily persists uploaded audio buffers for Whisper transcription.
 */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `audio-${Date.now()}.${ext}`);
  },
});
const upload = multer({ storage });

/**
 * @route POST /api/chat/start
 * @desc Initialize a new AI check-in session
 * @access Private
 */
router.post("/start", auth, startChat);

/**
 * @route POST /api/chat/reply
 * @desc Submit an audio reply for transcription and AI processing
 * @access Private
 */
router.post("/reply", auth, upload.single("audio"), reply);

/**
 * @route POST /api/chat/reply-text
 * @desc Submit a text reply for AI processing (debug/fallback)
 * @access Private
 */
router.post("/reply-text", auth, replyText);

/**
 * @route GET /api/chat/context
 * @desc Fetch environmental context (weather/traffic) for a location
 * @access Private
 */
router.get("/context", auth, getContext);

/**
 * @route GET /api/chat/burnout
 * @desc Fetch the exact burnout history state of user
 * @access Private
 */
router.get("/burnout", auth, getBurnoutStatus);

module.exports = router;
