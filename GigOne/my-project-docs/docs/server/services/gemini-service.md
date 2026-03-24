# Gemini Service

`server/services/geminiService.js` provides a lightweight wrapper around Google’s Gemini API specifically for sentiment scoring.

- It instantiates a `GoogleGenerativeAI` client with `process.env.GEMINI_API_KEY` and grabs the `gemini-3.1-flash-lite-preview` model (`server/services/geminiService.js:6‑9`).  
- The exported `analyzeSentiment(text)` helper builds a prompt that tells Gemini to return a JSON object containing `mood`, `score` (-1.0 to 1.0), `summary`, and `suggestion` based on the worker’s latest message (`server/services/geminiService.js:18‑26`).  
- After calling `model.generateContent(...)`, it strips any Markdown fences from the response, parses the JSON payload, and hands that structured sentiment back to callers (`server/services/geminiService.js:27‑33`). Errors bubble up so controllers can send a 500 if the AI call fails.

While the main chat flow now wraps sentiment/successful replies into a single Gemini prompt via `conversationService`, this helper remains handy for any other controller or service that just needs that emotional intelligence payload without the whole conversation context.
