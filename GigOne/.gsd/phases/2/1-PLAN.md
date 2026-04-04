---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Expose Node Backend APIs for Python Access

## Objective
The LangGraph module in Python needs to leverage the existing `sentimentService` and `geminiService` located on the Node backend. To achieve this cleanly without triggering old DB flows, we will expose them via dedicated internal API routes on the Node server.

## Context
- `server/controllers/chatController.js`
- `server/routes/chat.js`

## Tasks

<task type="auto">
  <name>Expose Sentiment & Greeting Endpoints</name>
  <files>server/controllers/chatController.js</files>
  <action>
    - Import `generateGreeting` from `conversationService.js` if not already.
    - Export a new function `getRawGreeting(req, res)`: calls `generateGreeting(user.name, context, language)` and returns `{ greeting }`.
    - Export a new function `analyzeRawSentiment(req, res)`: takes `{ text, language }` from req body, runs `analyzeMoodText`, and returns the exact score/summary object.
  </action>
  <verify>grep "getRawGreeting" server/controllers/chatController.js</verify>
  <done>Exported functions created safely without side-effects.</done>
</task>

<task type="auto">
  <name>Bind Routes to Controllers</name>
  <files>server/routes/chat.js</files>
  <action>
    - Import the new controllers into `chat.js`.
    - Add `router.post('/raw-greeting', auth, getRawGreeting)`
    - Add `router.post('/raw-sentiment', auth, analyzeRawSentiment)`
  </action>
  <verify>grep "raw-greeting" server/routes/chat.js</verify>
  <done>The Node backend exposes the raw text/sentiment services to the Python ML engine.</done>
</task>

## Success Criteria
- [ ] New routes exist on Node backend and can be called externally.
