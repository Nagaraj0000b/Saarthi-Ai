# Voice Module Deep Dive

When you walk your professor through the voice module in code, follow the signal path from the Express route into the controller, services, and finally persistence. This document lists the exact files/sections to open and what to say at each step.

## 1. Audio capture and routing
- **File:** `server/routes/chat.js:26-59`  
  Explain how `multer.diskStorage` saves any upload named `audio` under `uploads/` with `audio-<timestamp>.<ext>`, and how the `/api/chat/reply` route inserts `upload.single("audio")`. This is the only part of the backend that touches the raw waveform before any AI logic runs.
  Mention that every `/api/chat/*` route uses `auth` so the worker must be authenticated via JWT.

## 2. Transcription + cleanup
- **File:** `server/controllers/chatController.js:134-233`  
  Step through `reply(req, res)`:
  1. Validates `conversationId` and `req.file`.
  2. Calls `groqService.transcribeAudio(filePath)` (open `server/services/groqService.js:6-24` to show the Groq client instantiation, `whisper-large-v3`, and deterministic settings).  
  3. Runs weather lookup in parallel if `lat/lon` is present (`getWeatherContext` + `getTraffic`).
  4. After the AI turn, `fs.unlink(filePath)` in the `finally` block deletes the temp file so uploads/ never grows.

## 3. LLM + state machine
- **File:** `server/services/conversationService.js:32-220`
  Describe:
  1. `STEP_CONFIG`: each step (`greeting`, `mood`, `platform`, `earnings`, `hours`, `done`), the goal sentence, what it must extract, and the next state. This prevents the AI from drifting and ensures structured data is captured.
  2. `generateGreeting`: adds optional weather/burnout context, asks Gemini (via `model.generateContent`) for a short, warm Hinglish greeting, and returns the assistant message stored as the first entry in `Conversation`.
  3. `processChatTurn`: builds the Gemini prompt that includes the last six messages, live weather/traffic, the worker transcript, and a JSON schema with sentiment/reply/extractedValue. Show how it normalizes the platform enum (`Uber`, `Swiggy`, `Rapido`, `Other`) and rewrites the assistant reply if the LLM hallucinated unsupported data. Highlight the robust JSON parsing (stripping ```json``` fences) and fallback response when parsing fails.
  4. `getNextStep`: explains when the workflow advances or stays (stay if extraction value is missing). This is why the UI sees repeated prompts for missing earnings/platform/hours.

## 4. Sentiment & burnout hooks
- **Files:** `server/services/geminiService.js`, `server/services/burnoutService.js`, `server/controllers/chatController.js:26-118`
  Summarize:
  1. `geminiService.analyzeSentiment` (standalone) – show prompt and JSON parsing flow so they understand how `sentiment` objects are structured (mood, score, summary, suggestion).
  2. Burnout detection: `calculateAndSaveBurnout` (within `chatController` near the top) gathers the last five sentiment scores from `Conversation`, calls `checkBurnout` (`server/services/burnoutService.js`), and populates `conversation.burnoutStatus` before saving.
  3. `getContext`/`startChat`: show how the controller adds weather/traffic/burnout context before calling `conversationService.generateGreeting` for step initialization.

## 5. Persistence and auto-saving
- **Files:** `server/models/Conversation.js`, `server/models/EarningsEntry.js`, `server/controllers/chatController.js:172-214`
  Show the `Conversation` schema (state machine fields, `extractedData`, `burnoutStatus`, embedded `messages` with optional sentiment) so they see what is stored after every speech turn.
  Explain that when the workflow reaches `done`, the controller:
  1. Calls `calculateAndSaveBurnout`.
  2. If the conversation found platform + earnings, it auto-saves an `EarningsEntry` referencing `req.user.userId`.
  3. Persists everything via `conversation.save()`.

## 6. Secondary endpoints & cleanup
- **File:** `server/controllers/chatController.js:311-357` and `server/routes/chat.js:72-86`
  Point out:
  1. `/api/chat/burnout` recovers the last `done` conversation’s `burnoutStatus`.
  2. `/api/chat/history` returns all completed transcripts.
  3. `/api/chat/:id` allows deleting a conversation if it belongs to the user.
  4. These endpoints reuse the same models so the UI and admin dashboards can display historical data.

## 7. How to walk through it
1. Open `server/routes/chat.js` to show the route/multer wiring.
2. Jump into `chatController.reply` while the upload is still flowing.
3. Step through `conversationService` to explain the Gemini prompts/state logic.
4. Highlight the `Conversation` model to show how each field gets populated.
5. Mention the cleanup endpoints and burnout logic near the end so they see the full lifecycle.

This structure lets you narrate “voice → transcription → Gemini → structured data → persistence” with specific line references so your professor can follow along easily in the code.
