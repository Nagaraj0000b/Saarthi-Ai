const router = require("express").Router();
const auth = require("../middleware/auth");
const uploadAudio = require("../middleware/uploadAudio");
const {
  getRawGreeting,
  analyzeRawSentiment,
  getRawReply,
  extractRawData,
  startChatV2,
  replyChatV2,
  getBurnoutStatus,
  getChatHistory,
  deleteConversation
} = require("../controllers/chatV2Controller");

router.post("/raw-greeting", auth, getRawGreeting);
router.post("/raw-sentiment", auth, analyzeRawSentiment);
router.post("/raw-reply", auth, getRawReply);
router.post("/raw-extract", auth, extractRawData);

router.post("/start", auth, startChatV2);
router.post("/reply", auth, uploadAudio, replyChatV2);

router.get("/burnout", auth, getBurnoutStatus);
router.get("/history", auth, getChatHistory);
router.delete("/:id", auth, deleteConversation);

module.exports = router;
