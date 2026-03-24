`server/controllers/chatController.js` ties every `/api/chat` endpoint to transcription, AI prompts, burnout tracking, and conversation state.

**Core Functions**  
`getContext(req, res)` requires `lat/lon`, fetches weather and traffic in parallel, and returns both so the UI can show real-time conditions before a check-in (`chatController.js:55-79`).  
`startChat(req, res)` loads the user, grabs their last completed conversation to inherit burnout info, gets a greeting from `conversationService.generateGreeting`, saves a new `Conversation` with step `mood`, and returns the conversation ID plus the assistant reply (`chatController.js:82-118`).  
`reply(req, res)` handles audio uploads: it transcribes the file via `groqService`, ensures the `Conversation` exists, calls `conversationService.processChatTurn` to get sentiment/reply/extracted data, stores both messages, updates extracted fields, advances the workflow, auto-saves earnings when the conversation hits `done`, computes burnout using the last five days, and finally returns the updated state while deleting the temp file (`chatController.js:120-233`).  
`replyText(req, res)` does the same as `reply` but with a text string (no transcription); it still runs the unified Gemini prompt/processing logic and saves earnings/burnout when done (`chatController.js:235-309`).  
`getBurnoutStatus(req, res)` fetches the last `done` conversation and returns its stored burnout flags for dashboard nudges (`chatController.js:311-327`).  
`getChatHistory(req, res)` returns every completed conversation so the UI can show prior check-ins (`chatController.js:333-338`).  
`deleteConversation(req, res)` lets the user remove a conversation by ID if it belongs to them (`chatController.js:343-356`).

Each API path (`/api/chat/start`, `/reply`, `/reply-text`, `/context`, `/burnout`, `/history`, `/api/chat/:id`) simply calls the corresponding controller function, so this controller is where transcription, AI services, burnout logic, and Mongo writes are orchestrated together.
