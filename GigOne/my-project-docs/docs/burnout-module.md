# Project Burnout Module

The Burnout Module is a critical health-tracking feature designed to ensure gig economy workers do not overexert themselves. It invisibly calculates mental fatigue based on daily AI check-in conversations, requiring absolutely no extra effort or surveys from the worker.

## 1. Core Logic (The Math)

The detection system is isolated into a pure, testable math module (`burnoutService.js`) and calculates two primary risks based on occupational psychology models:

- **Burnout Alert (Effort-Recovery Model):** If a worker logs a negative mood (`< 0`) for **3 consecutive days**, the system triggers a severe burnout alert indicating that standard overnight rest is failing.
- **Stress Warning (Ecological Momentary Assessment):** The system calculates a **5-day rolling average** of the worker's mood scores. If the 5-day baseline average drops to `-0.3` or below, a long-term stress warning is triggered.

**Related Code:** 
- `server/services/burnoutService.js`
- `server/test-burnout.js`

## 2. Backend Integration

The Chat Controller serves as the bridge between the conversation state machine and the burnout math.

- When a worker finishes their check-in (`step === "done"`), the controller fetches the overall mood score of the current conversation and the last 4 completed conversations from MongoDB.
- It passes this 5-day array into `checkBurnout(historyArray)`.
- The resulting `burnoutStatus` (which includes the exact average score and recommended action string) is saved permanently into the active `Conversation` document.

**Related Code:** 
- `server/controllers/chatController.js`
- `server/models/Conversation.js`

## 3. UI Dashboard Meter (Frontend)

The React dashboard reads the `burnoutStatus` object returned by the Chat API and immediately renders a visual health indicator on the main `/user/dashboard` page.

- **Green Text:** Normal (Healthy trend)
- **Yellow Text:** Monitor Stress (Stress Warning triggered)
- **Red Text:** Rest Required (Burnout Alert triggered)

**Related Code:** 
- `client/src/pages/user/DashBoard.jsx`

## 4. Voice Chatbot AI Nudges

The module doesn't just display visual warnings; it gives the AI Chatbot protective, proactive awareness.

When the worker starts a new check-in shift, the backend fetches their most recent `burnoutStatus`. If they are suffering from a `Burnout Alert` or `Stress Warning`, the backend injects an `URGENT HEALTH ALERT` or `HEALTH NOTE` directly into Gemini's prompt instructions for the `generateGreeting` function. 

Instead of a generic greeting, the Chatbot will proactively break the standard flow and verbally advise the worker to take a rest day *before* asking how their shift was.

**Related Code:** 
- `server/services/conversationService.js`
