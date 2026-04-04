/**
 * @fileoverview Conversational AI routes for the Gigi companion.
 */

const router = require("express").Router();
const auth = require("../middleware/auth");
const uploadAudio = require("../middleware/uploadAudio");
const {
  getContext,
  startChat,
  reply,
  replyText,
  getBurnoutStatus,
  deleteConversation,
  getChatHistory,
  getRawGreeting,
  analyzeRawSentiment,
} = require("../controllers/chatController");

router.get("/history", auth, getChatHistory);
router.post("/start", auth, startChat);
router.post("/raw-greeting", auth, getRawGreeting);
router.post("/raw-sentiment", auth, analyzeRawSentiment);
router.post("/reply", auth, uploadAudio, reply);
router.post("/reply-text", auth, replyText);
router.get("/context", auth, getContext);
router.get("/burnout", auth, getBurnoutStatus);
router.delete("/:id", auth, deleteConversation);

module.exports = router;
