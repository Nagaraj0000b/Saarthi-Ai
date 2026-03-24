# Groq Service

`server/services/groqService.js` handles the voice transcription step by calling the Groq Whisper endpoint.

- It instantiates a `Groq` client with `process.env.GROQ_API_KEY` and exports `transcribeAudio(filePath)` (`server/services/groqService.js:6‑24`).  
- The helper streams the uploaded audio file into `groq.audio.translations.create`, fixes the model to `whisper-large-v3`, asks for `response_format: "text"`, and keeps `temperature` at `0.2` for deterministic transcripts (`server/services/groqService.js:11‑20`).  
- Successful calls return the transcript string; failures are logged and converted into a generic `Error("Failed to transcribe audio.")` so `chatController.reply` can respond with `500` while still deleting the temporary file (`server/services/groqService.js:21‑24`).

Any controller that handles audio uploads (right now only `chatController.reply`) relies on this service to convert speech to text before feeding it into the LLM pipeline.
