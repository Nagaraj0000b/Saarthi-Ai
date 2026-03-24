`server/routes/chat.js` connects every `/api/chat` endpoint to the chat controller, handles audio uploads, and enforces authentication.

**Core behavior**
- It configures `multer` with disk storage under `uploads/` so each audio reply is saved as `audio-<timestamp>.<ext>` before the controller runs (`chat.js:26-37`).  
- Every route (`/history`, `/start`, `/reply`, `/reply-text`, `/context`, `/burnout`, `/:id`) runs through the shared `auth` middleware so only logged-in workers can use the conversational features (`chat.js:40-87`). The `/reply` route also inserts `upload.single("audio")` so `req.file` is available to `chatController.reply`.  
- Each path simply delegates to the respective controller function (`getChatHistory`, `startChat`, `reply`, etc.), keeping this file focused on HTTP wiring and middleware composition.
