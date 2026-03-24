# Project Documentation Log

This file contains detailed documentation for files we work on. As changes are made or new features are developed, entries will be added here to explain:

- What the file does
- Important code concepts/patterns used
- Any related testing code

---


## 1. `server/services/chatbotConversationService.js` — Chatbot Conversational Reply Engine

**Created:** 2026-03-13

### What it does

This service generates the chatbot's conversational replies. It takes the user's spoken text (already transcribed), their sentiment analysis, recent chat history, and optionally weather/traffic context — then asks Gemini to produce a short, empathetic Hinglish reply.

### Main Code Concepts

| Concept                        | Why                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `@google/generative-ai` SDK    | Connects to Google Gemini (`gemini-2.0-flash` model) for text generation                                    |
| **Prompt Engineering**         | A detailed system prompt defines the chatbot's personality (warm, Hinglish, 2-3 sentences, empathetic)             |
| **Context window management**  | Only the last 6 conversation turns are included via `.slice(-6)` to stay within token limits                |
| **Optional context injection** | Weather & traffic data are conditionally appended to the prompt so the chatbot can reference real-world conditions |

### Key Function

```js
generateReply(userText, sentiment, recentMessages, context);
// → Returns a string: Chatbot's reply
```

**Flow:**

1. Build a history block from `recentMessages` (last 6 turns)
2. Build a context block from `weather` and `traffic` (if available)
3. Construct a prompt with personality rules + mood + context + history + current user message
4. Call `model.generateContent(prompt)`
5. Return the cleaned text

### Testing Code

- None yet. Will be tested end-to-end via `POST /api/chatbot/chat`.

---

## 2. `server/models/Conversation.js` — Conversation History Model

**Created:** 2026-03-13

### What it does

MongoDB schema that stores all voice conversation messages per user. Uses a sub-document pattern — each message has a `role` (user or assistant), `text`, and optional `sentiment` data.

### Main Code Concepts

| Concept                                             | Why                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Sub-document schema** (`messageSchema`)           | Each message is its own mini-schema with `role`, `text`, `sentiment`, and auto `timestamps` |
| **Parent schema** (`conversationSchema`)            | One document per user with a `messages[]` array — all turns are appended here               |
| `mongoose.Schema.Types.ObjectId` with `ref: "User"` | Links each conversation to a user via MongoDB reference                                     |
| `index: true` on `userId`                           | Speeds up queries when fetching a user's conversation                                       |
| `timestamps: true`                                  | Auto-adds `createdAt` and `updatedAt` on both message and conversation level                |

### Key Structure

```
Conversation {
  userId     → ObjectId (ref User)
  messages[] → [
    { role, text, sentiment: { mood, score, summary, suggestion }, createdAt }
  ]
  createdAt, updatedAt
}
```

### Testing Code

- None yet. Will be tested when the chat controller saves conversations.

---
